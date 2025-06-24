export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSSRSassClient } from "@/lib/supabase/server";
import { generateText, tool } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

// Tool for summarizing user posts
const summarizePostsTool = tool({
  description: "Summarize user's posts and attachments for a specific time period",
  parameters: z.object({
    period: z.enum(["daily", "weekly"]).describe("Time period to summarize - daily (last 24 hours) or weekly (last 7 days)"),
    includeAttachments: z.boolean().default(true).describe("Whether to include analysis of attachments"),
  }),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, message, createNewSession } = body;

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Verify user is authenticated
    const cookieStore = await cookies();
    const supabase = await createSSRSassClient(cookieStore);
    const {
      data: { user },
      error: authError,
    } = await supabase.getSupabaseClient().auth.getUser();

    if (authError || !user) {
      console.error("Auth error:", authError);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let currentSessionId = sessionId;

    // Create new session if requested or if no session provided
    if (createNewSession || !currentSessionId) {
      console.log("Creating new session for user:", user.id);
      
      const { data: newSession, error: sessionError } = await supabase.createChatSession(user.id);
      if (sessionError) {
        console.error("Session creation error:", sessionError);
        throw sessionError;
      }
      console.log("New session created:", newSession.id);
      currentSessionId = newSession.id;
    }

    // Save user message
    console.log("Saving user message to session:", currentSessionId);
    const { error: messageError } = await supabase.createChatMessage(
      currentSessionId,
      user.id,
      "user",
      message
    );
    
    if (messageError) {
      console.error("Message creation error:", messageError);
      throw messageError;
    }

    // Get chat history for context
    const { data: messages, error: messagesError } = await supabase.getChatMessages(currentSessionId);
    if (messagesError) {
      console.error("Messages retrieval error:", messagesError);
      throw messagesError;
    }

    // Prepare conversation history for AI
    const conversationHistory = messages.map(msg => ({
      role: msg.sender_type === 'user' ? 'user' : 'assistant',
      content: msg.message_content,
    }));

    // Generate AI response with tools
    const { text, toolCalls } = await generateText({
      model: openai("gpt-4o"),
      messages: conversationHistory,
      tools: {
        summarizePosts: summarizePostsTool,
      },
      maxTokens: 1000,
      temperature: 0.7,
      system: `You are a helpful AI assistant that can help users understand and analyze their progress updates and work activities. 

You have access to a tool that can summarize a user's posts and attachments from their workspaces. Use this tool when users ask about:
- What they've been working on
- Their recent activities or progress
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
    let toolOutputs: string[] = [];

    // Execute tool calls if any
    if (toolCalls && toolCalls.length > 0) {
      for (const toolCall of toolCalls) {
        if (toolCall.toolName === 'summarizePosts') {
          // Save tool call message
          await supabase.createChatMessage(
            currentSessionId,
            user.id,
            "tool_call",
            `Calling summarizePosts with parameters: ${JSON.stringify(toolCall.args)}`,
            toolCall.toolName,
            toolCall.args
          );

          // Execute the tool
          const toolOutput = await executeSummarizePostsTool(
            toolCall.args as { period: "daily" | "weekly"; includeAttachments: boolean },
            user.id,
            supabase
          );

          toolOutputs.push(toolOutput);

          // Save tool output message
          await supabase.createChatMessage(
            currentSessionId,
            user.id,
            "tool_output",
            toolOutput,
            toolCall.toolName,
            undefined,
            toolOutput
          );
        }
      }

      // If we have tool outputs, generate a final response based on them
      if (toolOutputs.length > 0) {
        const finalResponse = await generateText({
          model: openai("gpt-4o"),
          messages: [
            ...conversationHistory,
            { role: 'user', content: message },
            { role: 'assistant', content: `I'll analyze your posts and activities.` },
            { role: 'user', content: `Tool outputs: ${toolOutputs.join('\n\n')}` }
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
      }
    }

    // Save AI response
    await supabase.createChatMessage(
      currentSessionId,
      user.id,
      "ai",
      aiResponse
    );

    // Generate title for new sessions after a few messages
    const messageCount = messages.length + 2; // +2 for the new user message and AI response
    if (messageCount >= 4 && messageCount <= 6) {
      try {
        const titleResponse = await generateText({
          model: openai("gpt-4o"),
          messages: [
            { role: 'user', content: message },
            { role: 'assistant', content: aiResponse }
          ],
          maxTokens: 50,
          temperature: 0.3,
          system: "Generate a short, descriptive title (3-8 words) for this conversation. Focus on the main topic or request. Return only the title, no quotes or extra text.",
        });

        await supabase.updateChatSessionTitle(currentSessionId, titleResponse.text.trim());
      } catch (titleError) {
        console.error("Error generating title:", titleError);
      }
    }

    return NextResponse.json({
      message: aiResponse,
      sessionId: currentSessionId,
      toolCalls: toolCalls?.map(tc => ({
        toolName: tc.toolName,
        args: tc.args
      })) || [],
    });
  } catch (error) {
    console.error("Error in chat API:", error);
    console.error("Error stack:", error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { 
        error: "Failed to process chat message", 
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

async function executeSummarizePostsTool(
  args: { period: "daily" | "weekly"; includeAttachments: boolean },
  userId: string,
  supabase: any
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
    const { data: workspaces } = await supabase.getMyWorkspaces();
    const workspaceIds = workspaces?.map((w: any) => w.id) || [];

    if (workspaceIds.length === 0) {
      return "No workspaces found. You haven't joined any workspaces yet.";
    }

    // Fetch posts from the time period
    const { data: posts, error: postsError } = await supabase
      .getSupabaseClient()
      .from("posts")
      .select(`
        id,
        text_content,
        created_at,
        workspace_id,
        post_attachments(attachment_type, filename, url),
        ratings(rating_value),
        workspace_comments(comment_text)
      `)
      .eq("user_id", userId)
      .in("workspace_id", workspaceIds)
      .gte("created_at", startDate.toISOString())
      .lte("created_at", now.toISOString())
      .order("created_at", { ascending: false });

    if (postsError) {
      throw postsError;
    }

    if (!posts || posts.length === 0) {
      return `No posts found in the last ${period === "daily" ? "24 hours" : "7 days"}. You haven't shared any progress updates during this period.`;
    }

    // Prepare summary data
    const summaryData = {
      period,
      totalPosts: posts.length,
      posts: posts.map((post: any) => ({
        content: post.text_content,
        date: new Date(post.created_at).toLocaleDateString(),
        attachments: post.post_attachments?.map((att: any) => ({
          type: att.attachment_type,
          filename: att.filename,
        })) || [],
        averageRating: post.ratings?.length > 0 
          ? (post.ratings.reduce((sum: number, r: any) => sum + r.rating_value, 0) / post.ratings.length).toFixed(1)
          : "No ratings",
        commentsCount: post.workspace_comments?.length || 0,
      })),
      attachmentsSummary: includeAttachments ? {
        images: posts.reduce((count: number, post: any) => 
          count + (post.post_attachments?.filter((att: any) => att.attachment_type === "IMAGE").length || 0), 0),
        documents: posts.reduce((count: number, post: any) => 
          count + (post.post_attachments?.filter((att: any) => att.attachment_type === "DOCUMENT").length || 0), 0),
        links: posts.reduce((count: number, post: any) => 
          count + (post.post_attachments?.filter((att: any) => att.attachment_type === "LINK").length || 0), 0),
      } : null,
    };

    // Generate structured output for the AI to process
    let output = `POSTS SUMMARY (${period.toUpperCase()}):\n`;
    output += `Period: ${startDate.toLocaleDateString()} to ${now.toLocaleDateString()}\n`;
    output += `Total Posts: ${summaryData.totalPosts}\n\n`;

    summaryData.posts.forEach((post, index) => {
      output += `POST ${index + 1} (${post.date}):\n`;
      output += `Content: ${post.content}\n`;
      if (post.attachments.length > 0) {
        output += `Attachments: ${post.attachments.map(att => `${att.type}: ${att.filename || 'unnamed'}`).join(', ')}\n`;
      }
      output += `Rating: ${post.averageRating}, Comments: ${post.commentsCount}\n\n`;
    });

    if (includeAttachments && summaryData.attachmentsSummary) {
      output += `ATTACHMENTS SUMMARY:\n`;
      output += `Images: ${summaryData.attachmentsSummary.images}\n`;
      output += `Documents: ${summaryData.attachmentsSummary.documents}\n`;
      output += `Links: ${summaryData.attachmentsSummary.links}\n`;
    }

    return output;
  } catch (error) {
    console.error("Error in summarizePostsTool:", error);
    return "Error: Failed to retrieve and analyze your posts. Please try again.";
  }
}