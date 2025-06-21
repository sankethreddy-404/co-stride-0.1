import { NextRequest, NextResponse } from "next/server";
import { createSSRSassClient } from "@/lib/supabase/server";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";

// Type for the database query result
interface PostWithRatings {
  id: string;
  text_content: string;
  created_at: string;
  user_id: string;
  post_attachments: Array<{ attachment_type: string; filename: string }>;
  ratings: Array<{ rating_value: number }>;
  comments: Array<{ comment_text: string }>;
}

export async function POST(request: NextRequest) {
  try {
    const { workspaceId, summaryType = "weekly" } = await request.json();

    if (!workspaceId) {
      return NextResponse.json(
        { error: "Workspace ID is required" },
        { status: 400 }
      );
    }

    // Verify user is authenticated and has access to workspace
    const supabase = await createSSRSassClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.getSupabaseClient().auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has access to workspace
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

    // Check if user is owner or member
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

    // Calculate date range based on summary type
    const now = new Date();
    let periodStart: Date;
    const periodEnd = now;

    switch (summaryType) {
      case "daily":
        periodStart = new Date(now.getTime() - 24 * 60 * 60 * 1000); // Last 24 hours
        break;
      case "weekly":
        periodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // Last 7 days
        break;
      case "monthly":
        periodStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // Last 30 days
        break;
      default:
        periodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    // Fetch posts from the specified period
    const { data: posts, error: postsError } = await supabase
      .getSupabaseClient()
      .from("posts")
      .select(
        `
        id,
        text_content,
        created_at,
        user_id,
        post_attachments(attachment_type, filename),
        ratings(rating_value),
        comments(comment_text)
      `
      )
      .eq("workspace_id", workspaceId)
      .gte("created_at", periodStart.toISOString())
      .lte("created_at", periodEnd.toISOString())
      .order("created_at", { ascending: false });

    if (postsError) {
      throw postsError;
    }

    if (!posts || posts.length === 0) {
      return NextResponse.json(
        {
          error: "No posts found in the specified period",
          summary: `No activity found in the ${summaryType} period.`,
        },
        { status: 200 }
      );
    }

    // Prepare data for AI analysis
    const postsData = (posts as PostWithRatings[]).map((post) => ({
      content: post.text_content,
      date: new Date(post.created_at).toLocaleDateString(),
      attachments: post.post_attachments?.length || 0,
      averageRating:
        post.ratings && post.ratings.length > 0
          ? (
              post.ratings.reduce((sum: number, r) => sum + r.rating_value, 0) /
              post.ratings.length
            ).toFixed(1)
          : "No ratings",
      commentsCount: post.comments?.length || 0,
    }));

    // Generate AI summary using Vercel AI SDK
    const prompt = `
You are an AI assistant helping to summarize team progress updates. Please analyze the following ${summaryType} progress updates and create a comprehensive, professional summary.

Period: ${periodStart.toLocaleDateString()} to ${periodEnd.toLocaleDateString()}
Total Posts: ${posts.length}

Posts Data:
${postsData
  .map(
    (post, index) => `
Post ${index + 1} (${post.date}):
- Content: ${post.content}
- Attachments: ${post.attachments}
- Average Rating: ${post.averageRating}
- Comments: ${post.commentsCount}
`
  )
  .join("\n")}

Please provide a summary that includes:
1. **Overview**: A brief summary of the team's overall progress and activity level
2. **Key Highlights**: Main achievements, milestones, or important updates
3. **Engagement Metrics**: Analysis of team interaction (ratings, comments, participation)
4. **Trends**: Any patterns or trends you notice in the work or collaboration
5. **Recommendations**: Suggestions for improvement or areas to focus on

Keep the summary professional, encouraging, and actionable. Focus on progress made and team collaboration.
`;

    const { text } = await generateText({
      model: openai("gpt-4o-mini"),
      prompt,
      maxTokens: 1000,
      temperature: 0.7,
    });

    // Save summary to database
    const { data: summary, error: summaryError } = await supabase
      .getSupabaseClient()
      .from("summaries")
      .insert({
        workspace_id: workspaceId,
        summary_text: text,
        summary_type: summaryType,
        period_start: periodStart.toISOString(),
        period_end: periodEnd.toISOString(),
        created_by: user.id,
      })
      .select()
      .single();

    if (summaryError) {
      throw summaryError;
    }

    return NextResponse.json({
      summary: text,
      summaryId: summary.id,
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      postsAnalyzed: posts.length,
    });
  } catch (error) {
    console.error("Error generating AI summary:", error);
    return NextResponse.json(
      { error: "Failed to generate summary" },
      { status: 500 }
    );
  }
}
