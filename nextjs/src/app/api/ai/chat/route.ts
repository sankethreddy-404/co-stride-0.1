// @ts-nocheck
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSSRSassClient } from "@/lib/supabase/server";
import { SassClient } from "@/lib/supabase/unified";
import { CoreMessage, generateText, tool } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { Post, PostAttachment, Rating, Workspace } from "@/lib/types";

// Tool for summarizing user posts
const summarizeTool = tool({
  name: "summarizePosts",
  description:
    "Summarizes user posts over a given period (daily or weekly). Allows filtering by attachments.",
  parameters: z.object({
    period: z
      .enum(["daily", "weekly"])
      .describe("The time period to summarize posts from."),
    includeAttachments: z
      .boolean()
      .describe("Whether to include a summary of attachments."),
  }),
});

export async function POST(request: NextRequest) {
  try {
    const { message, sessionId } = await request.json();

    const cookieStore = await cookies();
    const supabase = await createSSRSassClient(cookieStore);

    const {
      data: { user },
      error: authError,
    } = await supabase.getSupabaseClient().auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Ensure a session exists
    let currentSessionId = sessionId;
    if (!currentSessionId) {
      const { data: newSession, error } = await supabase.createChatSession(
        user.id
      );
      if (error) throw error;
      currentSessionId = newSession.id;

      // Generate title from the first message
      try {
        const titleResponse = await generateText({
          model: openai("gpt-4o"),
          messages: [{ role: "user", content: message }],
          maxTokens: 50,
          temperature: 0.3,
          system:
            "Generate a short, descriptive title (3-8 words) for this conversation. Focus on the main topic or request. Return only the title, no quotes or extra text.",
        });

        await supabase.updateChatSessionTitle(
          currentSessionId,
          titleResponse.text.trim()
        );
      } catch (titleError) {
        console.error("Error generating title:", titleError);
        // Don't block the chat flow if title generation fails
      }
    }

    // Fetch conversation history
    const { data: rawMessages, error: messagesError } =
      await supabase.getChatMessages(currentSessionId);
    if (messagesError) throw messagesError;

    const conversationHistory: CoreMessage[] = [];
    for (let i = 0; i < rawMessages.length; i++) {
      const msg = rawMessages[i];

      if (msg.sender_type === 'user') {
        conversationHistory.push({ role: 'user', content: msg.message_content });
        continue;
      }

      if (msg.sender_type === 'ai') {
        conversationHistory.push({ role: 'assistant', content: msg.message_content });
        continue;
      }

      if (msg.sender_type === 'tool_call') {
        const nextMsg = rawMessages[i + 1];
        if (nextMsg && nextMsg.sender_type === 'tool_output' && nextMsg.tool_name === msg.tool_name) {
          conversationHistory.push({
            role: 'assistant',
            content: msg.message_content || '',
            toolCalls: [{
              id: msg.id,
              type: 'tool-call',
              toolName: msg.tool_name,
              args: msg.tool_args,
            }]
          });
          conversationHistory.push({
            role: 'tool',
            content: [{
              type: 'tool-result',
              toolCallId: msg.id,
              result: nextMsg.message_content
            }],
          });
          i++; // Skip next message as it's already processed
        }
        // If no matching tool_output, skip the tool_call to prevent errors
        continue;
      }
    }

    // Save user message
    await supabase.createChatMessage(
      currentSessionId,
      user.id,
      "user",
      message
    );

    const { text, toolCalls } = await generateText({
      model: openai("gpt-4o"),
      tools: {
        summarize: summarizeTool,
      },
      messages: [
        ...conversationHistory,
        {
          role: "user",
          content: message,
        },
      ],
      system: `You are a helpful AI assistant integrated into a SaaS platform. Your purpose is to help users analyze their productivity and progress based on the posts they create in their workspaces.

You have access to a tool to summarize user posts. Use this tool to answer questions like:
- "How did I do yesterday?"
- "What have I been working on this week?"
- "Summarize my recent activity"

When you get a user query, determine if you need to call the "summarizePosts" tool. If so, call the tool with the appropriate parameters.

Your persona should be:
- Conversational and helpful
- Focused on providing actionable insights
- Encouraging and supportive

The user data you can access includes:
- Summaries of their posts
- Analysis of their work patterns
- Questions about their uploaded files or images

When using the summarize tool, consider:
- Use "daily" for recent activity (last 24 hours)
- Use "weekly" for broader summaries (last 7 days)
- Include attachments analysis when relevant to understand context from images and documents

Be conversational, helpful, and provide actionable insights based on the data.`,
    });

    let aiResponse = text;
    const toolOutputs: string[] = [];

    // Execute tool calls if any
    console.log("Checking for tool calls. toolCalls:", toolCalls);
    if (toolCalls && toolCalls.length > 0) {
      console.log("Tool calls found. Entering tool execution block.");
      for (const toolCall of toolCalls) {
        if (toolCall.toolName === "summarize") {
          // Save tool call message
          await supabase.createChatMessage(
            currentSessionId,
            user.id,
            "tool_call",
            `Calling summarizePosts with parameters: ${JSON.stringify(
              toolCall.args
            )}`,
            toolCall.toolName,
            toolCall.args
          );

          // Execute the tool
          console.log(`Executing tool: ${toolCall.toolName} with args: ${JSON.stringify(toolCall.args)}`);
          const toolOutput = await executeSummarizePostsTool(
            toolCall.args as {
              period: "daily" | "weekly";
              includeAttachments: boolean;
            },
            user.id,
            supabase
          );

          toolOutputs.push(toolOutput);
          console.log("Tool outputs after execution:", toolOutputs);

          // Save tool output message
          await supabase.createChatMessage(
            currentSessionId,
            user.id,
            "tool_output",
            toolOutput,
            toolCall.toolName,
            undefined
          );
        }
      }

      // If we have tool outputs, generate a final response based on them
      if (toolOutputs.length > 0) {
        const finalResponse = await generateText({
          model: openai("gpt-4o"),
          messages: [
            ...conversationHistory,
            { role: "user", content: message },
            {
              role: "assistant",
              content: `I'll analyze your posts and activities.`,
            },
            {
              role: "user",
              content: `Tool outputs: ${toolOutputs.join("\n\n")}`,
            },
          ],
          maxTokens: 1000,
          temperature: 0.7,
          system: `Based on the tool output data about the user's posts and activities, provide a helpful, conversational summary and insights. 

The tool output contains information about:
- Posts created in the specified time period
- Attachments and their analysis
- Progress and work patterns

Provide:
1. A clear summary of what the user accomplished
2. Insights about their work patterns
3. Actionable feedback or suggestions
4. Encouragement for their progress

Be conversational and supportive in your response.`,
        });

        aiResponse = finalResponse.text;
        console.log("Final AI response after processing tool outputs:", aiResponse);
      }
    }

    // Save AI response
    await supabase.createChatMessage(
      currentSessionId,
      user.id,
      "ai",
      aiResponse
    );

    

    return NextResponse.json({
      message: aiResponse,
      sessionId: currentSessionId,
      toolCalls:
        toolCalls?.map((tc) => ({
          toolName: tc.toolName,
          args: tc.args,
        })) || [],
    });
  } catch (error) {
    console.error("Error in chat API:", error);
    console.error(
      "Error stack:",
      error instanceof Error ? error.stack : "No stack trace"
    );
    return NextResponse.json(
      {
        error: "Failed to process chat message",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

async function executeSummarizePostsTool(
  args: { period: "daily" | "weekly"; includeAttachments: boolean },
  userId: string,
  supabase: SassClient
): Promise<string> {
  try {
    const { period, includeAttachments } = args;

    // Calculate date range
    const now = new Date();
    const startDate = new Date();

    if (period === "daily") {
      startDate.setDate(now.getDate() - 1);
    } else {
      startDate.setDate(now.getDate() - 7);
    }

    // Get user's workspaces
    const { data: workspaces, error: workspacesError } = await supabase.getMyWorkspaces();
    if (workspacesError) {
      console.error("Error fetching workspaces:", workspacesError);
      return "Error fetching workspaces. Please check the logs for details.";
    }
    const workspaceIds = workspaces?.map((w: Workspace) => w.id) || [];

    if (workspaceIds.length === 0) {
      return "No workspaces found. You haven't joined any workspaces yet.";
    }

    // Fetch posts from the time period
    const { data: posts, error: postsError } = (await supabase
      .getSupabaseClient()
      .from("posts")
      .select(
        `
        id,
        text_content,
        created_at,
        user_id,
        workspace_id,
        post_attachments!left(*),
        ratings!left(*),
        workspace_comments!left(*)
      `
      )
      .eq("user_id", userId)
      .in("workspace_id", workspaceIds)
      .gte("created_at", startDate.toISOString())
      .lte("created_at", now.toISOString())
      .order("created_at", { ascending: false })) as {
      data: Post[];
      error: unknown;
    };

    if (postsError) {
      throw postsError;
    }

    if (!posts || posts.length === 0) {
      console.log(`No posts found for user ${userId} in the last ${period === "daily" ? "24 hours" : "7 days"}.`);
      return `No posts found in the last ${
        period === "daily" ? "24 hours" : "7 days"
      }. You haven't shared any progress updates during this period.`;
    }

    console.log(`Found ${posts.length} posts for user ${userId} in the last ${period === "daily" ? "24 hours" : "7 days"}.`);
    // Prepare summary data
    const summaryData = {
      period,
      totalPosts: posts.length,
      posts: posts.map((post: Post) => ({
        content: post.text_content,
        date: new Date(post.created_at).toLocaleDateString(),
        attachments:
          post.post_attachments?.map((att: PostAttachment) => ({
            type: att.attachment_type,
            filename: att.filename,
          })) || [],
        averageRating:
          post.ratings && post.ratings.length > 0
            ? (
                post.ratings.reduce(
                  (sum: number, r: Rating) => sum + r.rating_value,
                  0
                ) / post.ratings.length
              ).toFixed(1)
            : "No ratings",
        commentsCount: post.workspace_comments?.length || 0,
      })),
      attachmentsSummary: includeAttachments
        ? {
            images: posts.reduce(
              (count: number, post: Post) =>
                count +
                (post.post_attachments?.filter(
                  (att: PostAttachment) => att.attachment_type === "IMAGE"
                ).length || 0),
              0
            ),
            documents: posts.reduce(
              (count: number, post: Post) =>
                count +
                (post.post_attachments?.filter(
                  (att: PostAttachment) => att.attachment_type === "DOCUMENT"
                ).length || 0),
              0
            ),
            links: posts.reduce(
              (count: number, post: Post) =>
                count +
                (post.post_attachments?.filter(
                  (att: PostAttachment) => att.attachment_type === "LINK"
                ).length || 0),
              0
            ),
          }
        : undefined,
    };

    // Use a smaller model for the final summary to be efficient
    const summaryResponse = await generateText({
      model: openai("gpt-4o-mini"),
      system:
        "Generate a concise summary based on the structured data provided. Focus on key achievements and patterns.",
      prompt: `Here is the data for the user's activity: ${JSON.stringify(
        summaryData,
        null,
        2
      )}`,
      maxTokens: 500,
    });

    console.log("Summary response from AI model:", summaryResponse.text);

    return summaryResponse.text;
  } catch (error) {
    console.error("Error executing summarizePostsTool:", error);
    return "Error summarizing posts. Please check the logs for details.";
  }
}
