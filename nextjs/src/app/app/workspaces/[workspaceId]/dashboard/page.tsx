"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useGlobal } from "@/lib/context/GlobalContext";
import { createSPASassClient } from "@/lib/supabase/client";
import { LeaderboardUser } from "@/lib/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  TrendingUp,
  MessageSquare,
  Star,
  Brain,
  Loader2,
  AlertCircle,
  Trophy,
  Activity,
} from "lucide-react";
import ReactMarkdown from "react-markdown";

interface AnalyticsData {
  posts: Array<{ created_at: string; id: string }>;
  ratings: Array<{ rating_value: number; created_at: string; post_id: string }>;
  comments: Array<{ created_at: string; post_id: string }>;
}

interface Summary {
  id: string;
  summary_text: string;
  summary_type: string;
  period_start: string;
  period_end: string;
  created_at: string;
}

export default function WorkspaceDashboard() {
  const params = useParams();
  const workspaceId = params.workspaceId as string;
  const { user } = useGlobal();

  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [summaryType, setSummaryType] = useState<
    "daily" | "weekly" | "monthly"
  >("weekly");

  useEffect(() => {
    if (workspaceId && user?.id) {
      loadDashboardData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId, user?.id]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const supabase = await createSPASassClient();

      // Load analytics data
      const analyticsData = await supabase.getWorkspaceAnalytics(
        workspaceId,
        30
      );
      setAnalytics(analyticsData as AnalyticsData);

      // Load summaries
      const { data: summariesData, error: summariesError } =
        await supabase.getWorkspaceSummaries(workspaceId, 5);
      if (summariesError) throw summariesError;
      setSummaries(summariesData || []);

      // Load leaderboard
      const { data: leaderboardData, error: leaderboardError } =
        await supabase.getWorkspaceLeaderboard(workspaceId, 30);
      if (leaderboardError) throw leaderboardError;

      // Process leaderboard data
      const userStats = leaderboardData?.reduce(
        (
          acc: Record<string, LeaderboardUser>,
          post: { user_id: string; ratings?: Array<{ rating_value: number }> }
        ) => {
          const userId = post.user_id;
          if (!acc[userId]) {
            acc[userId] = {
              userId,
              posts: 0,
              totalRating: 0,
              ratingCount: 0,
              averageRating: 0,
            };
          }
          acc[userId].posts++;

          if (post.ratings && post.ratings.length > 0) {
            post.ratings.forEach((rating: { rating_value: number }) => {
              acc[userId].totalRating += rating.rating_value;
              acc[userId].ratingCount++;
            });
          }

          return acc;
        },
        {}
      );

      const leaderboardArray = (
        Object.values(userStats || {}) as LeaderboardUser[]
      )
        .map((user: LeaderboardUser) => ({
          ...user,
          averageRating:
            user.ratingCount > 0
              ? (user.totalRating / user.ratingCount).toFixed(1)
              : 0,
        }))
        .sort((a: LeaderboardUser, b: LeaderboardUser) => b.posts - a.posts);

      setLeaderboard(leaderboardArray);
    } catch (err) {
      setError("Failed to load dashboard data");
      console.error("Error loading dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  const generateAISummary = async () => {
    try {
      setGeneratingSummary(true);
      setError("");

      const response = await fetch("/api/ai/generate-summary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          workspaceId,
          summaryType,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate summary");
      }

      // Reload summaries to show the new one
      await loadDashboardData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to generate AI summary"
      );
    } finally {
      setGeneratingSummary(false);
    }
  };

  // Process analytics data for charts
  const processPostsData = () => {
    if (!analytics?.posts) return [];

    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toISOString().split("T")[0];
    }).reverse();

    return last7Days.map((date) => {
      const postsCount = analytics.posts.filter(
        (post) => post.created_at.split("T")[0] === date
      ).length;

      return {
        date: new Date(date).toLocaleDateString("en-US", { weekday: "short" }),
        posts: postsCount,
      };
    });
  };

  const processRatingsData = () => {
    if (!analytics?.ratings) return [];

    const ratingCounts = [1, 2, 3, 4, 5].map((rating) => ({
      rating: `${rating} Star${rating > 1 ? "s" : ""}`,
      count: analytics.ratings.filter((r) => r.rating_value === rating).length,
    }));

    return ratingCounts;
  };

  const getOverviewStats = () => {
    if (!analytics)
      return { posts: 0, avgRating: 0, comments: 0, engagement: 0 };

    const totalPosts = analytics.posts.length;
    const totalRatings = analytics.ratings.length;
    const avgRating =
      totalRatings > 0
        ? analytics.ratings.reduce((sum, r) => sum + r.rating_value, 0) /
          totalRatings
        : 0;
    const totalComments = analytics.comments.length;
    const engagement =
      totalPosts > 0 ? (totalRatings + totalComments) / totalPosts : 0;

    return {
      posts: totalPosts,
      avgRating: avgRating.toFixed(1),
      comments: totalComments,
      engagement: engagement.toFixed(1),
    };
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  const stats = getOverviewStats();
  const postsChartData = processPostsData();
  const ratingsChartData = processRatingsData();

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Workspace Dashboard
          </h1>
          <p className="text-muted-foreground">
            Analytics and insights for your team&apos;s progress
          </p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Posts</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.posts}</div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Average Rating
            </CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgRating}/5</div>
            <p className="text-xs text-muted-foreground">Team feedback</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Comments</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.comments}</div>
            <p className="text-xs text-muted-foreground">Team discussions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Engagement</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.engagement}</div>
            <p className="text-xs text-muted-foreground">Avg per post</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Posts Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={postsChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="posts" fill="#0284c7" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Rating Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={ratingsChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {ratingsChartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* AI Summary Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              AI-Powered Summary
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Get intelligent insights about your team&apos;s progress
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={summaryType}
              onChange={(e) =>
                setSummaryType(e.target.value as "daily" | "weekly" | "monthly")
              }
              className="px-3 py-1 border rounded text-sm"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
            <Button
              onClick={generateAISummary}
              disabled={generatingSummary}
              className="bg-primary-600 text-white hover:bg-primary-700"
            >
              {generatingSummary && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Generate Summary
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {summaries.length === 0 ? (
            <div className="text-center py-8">
              <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No AI summaries generated yet</p>
              <p className="text-sm text-gray-400">
                Click &quot;Generate Summary&quot; to create your first
                AI-powered insight
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {summaries.map((summary) => (
                <div key={summary.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium capitalize">
                      {summary.summary_type} Summary
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(summary.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="prose prose-sm max-w-none">
                    <ReactMarkdown>{summary.summary_text}</ReactMarkdown>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Team Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          {leaderboard.length === 0 ? (
            <p className="text-center text-gray-500 py-4">
              No activity data available
            </p>
          ) : (
            <div className="space-y-3">
              {leaderboard.slice(0, 5).map((member, index) => (
                <div
                  key={member.userId}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                        index === 0
                          ? "bg-yellow-500"
                          : index === 1
                          ? "bg-gray-400"
                          : index === 2
                          ? "bg-orange-600"
                          : "bg-primary-600"
                      }`}
                    >
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">
                        {member.userId.slice(0, 8)}...
                      </p>
                      <p className="text-sm text-gray-500">
                        {member.posts} posts • {member.averageRating}★ avg
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
