import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSSRSassClient } from "@/lib/supabase/server";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";

// Type for the database query result
interface PostWithComments {
  text_content: string;
  created_at: string;
  comments: Array<{ comment_text: string; created_at: string }>;
}

export async function POST(request: NextRequest) {
  try {
    const { workspaceId, period = "weekly" } = await request.json();

    if (!workspaceId) {
      return NextResponse.json(
        { error: "Workspace ID is required" },
        { status: 400 }
      );
    }

    // Verify user is authenticated and has access to workspace
    const cookieStore = await cookies();
    const supabase = await createSSRSassClient(cookieStore);
    const {
      data: { user },
      error: authError,
    } = await supabase.getSupabaseClient().auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check workspace access
    const { data: workspace, error: workspaceError } = await supabase
      .getSupabaseClient()
      .from("workspaces")
      .select("owner_id")
      .eq("id", workspaceId)
      .single();

    if (workspaceError || !workspace) {
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 }
      );
    }

    const { data: member } = await supabase
      .getSupabaseClient()
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .single();

    if (!member && workspace.owner_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Calculate date range
    const now = new Date();
    let periodStart: Date;

    switch (period) {
      case "daily":
        periodStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case "weekly":
        periodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "monthly":
        periodStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        periodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    // Fetch posts and comments for sentiment analysis
    const { data: posts, error: postsError } = await supabase
      .getSupabaseClient()
      .from("posts")
      .select(
        `
        text_content,
        created_at,
        comments(comment_text, created_at)
      `
      )
      .eq("workspace_id", workspaceId)
      .gte("created_at", periodStart.toISOString())
      .order("created_at", { ascending: false });

    if (postsError) throw postsError;

    if (!posts || posts.length === 0) {
      return NextResponse.json({
        sentiment: "neutral",
        confidence: 0,
        insights: "No content available for analysis in the specified period.",
        recommendations: [],
      });
    }

    // Prepare content for analysis
    const allContent = (posts as PostWithComments[])
      .flatMap((post) => [
        post.text_content,
        ...(post.comments?.map((c) => c.comment_text) || []),
      ])
      .join("\n\n");

    // Generate sentiment analysis using AI
    const prompt = `
Analyze the sentiment and team dynamics of the following workplace communication content. 
Provide insights about team morale, collaboration patterns, and overall sentiment.

Content to analyze:
${allContent}

Please provide a JSON response with the following structure:
{
  "sentiment": "positive|neutral|negative",
  "confidence": 0.0-1.0,
  "insights": "Detailed analysis of team sentiment and dynamics",
  "recommendations": ["actionable recommendation 1", "actionable recommendation 2"],
  "themes": ["key theme 1", "key theme 2"],
  "mood_indicators": {
    "positive_signals": ["signal 1", "signal 2"],
    "concerns": ["concern 1", "concern 2"]
  }
}

Focus on:
1. Overall team sentiment and morale
2. Collaboration patterns and communication style
3. Stress indicators or positive momentum
4. Actionable recommendations for team improvement
5. Key themes in the communication

Be professional, constructive, and focus on team dynamics rather than individual performance.
`;

    const { text } = await generateText({
      model: openai("gpt-4o-mini"),
      prompt,
      maxTokens: 1000,
      temperature: 0.3,
    });

    // Parse the AI response
    let analysis;
    try {
      analysis = JSON.parse(text);
    } catch {
      // Fallback if JSON parsing fails
      analysis = {
        sentiment: "neutral",
        confidence: 0.5,
        insights: text,
        recommendations: ["Continue monitoring team communication patterns"],
        themes: ["Communication analysis"],
        mood_indicators: {
          positive_signals: [],
          concerns: [],
        },
      };
    }

    return NextResponse.json({
      ...analysis,
      period,
      periodStart: periodStart.toISOString(),
      periodEnd: now.toISOString(),
      contentAnalyzed: posts.length,
    });
  } catch (error) {
    console.error("Error performing sentiment analysis:", error);
    return NextResponse.json(
      { error: "Failed to perform sentiment analysis" },
      { status: 500 }
    );
  }
}
