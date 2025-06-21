"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useGlobal } from "@/lib/context/GlobalContext";
import { createSPASassClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Filter, Loader2, AlertCircle, X } from "lucide-react";
import { Post, Workspace } from "@/lib/types";
import PostCard from "@/components/PostCard";

function SearchPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useGlobal();

  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [posts, setPosts] = useState<Post[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [hasSearched, setHasSearched] = useState(false);

  // Filters
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>("");
  const [dateRange, setDateRange] = useState<string>("all");
  const [minRating, setMinRating] = useState<number>(0);
  const [sortBy, setSortBy] = useState<string>("created_at");
  const [showFilters, setShowFilters] = useState(false);

  const performSearch = useCallback(
    async (query: string) => {
      if (!query.trim()) return;

      try {
        setLoading(true);
        setError("");
        setHasSearched(true);

        const supabase = await createSPASassClient();

        // Build the query
        let dbQuery = supabase
          .getSupabaseClient()
          .from("posts")
          .select(
            `
          *,
          post_attachments(*),
          ratings(rating_value, user_id),
          comments(
            id,
            comment_text,
            created_at,
            user_id
          ),
          workspaces!inner(name)
        `
          )
          .ilike("text_content", `%${query}%`);

        // Apply workspace filter
        if (selectedWorkspace) {
          dbQuery = dbQuery.eq("workspace_id", selectedWorkspace);
        } else {
          // Only search in workspaces user has access to
          const { data: userWorkspaces } = await supabase.getMyWorkspaces();
          const workspaceIds = userWorkspaces?.map((w) => w.id) || [];
          if (workspaceIds.length > 0) {
            dbQuery = dbQuery.in("workspace_id", workspaceIds);
          }
        }

        // Apply date filter
        if (dateRange !== "all") {
          const now = new Date();
          const startDate = new Date();

          switch (dateRange) {
            case "today":
              startDate.setHours(0, 0, 0, 0);
              break;
            case "week":
              startDate.setDate(now.getDate() - 7);
              break;
            case "month":
              startDate.setMonth(now.getMonth() - 1);
              break;
            case "year":
              startDate.setFullYear(now.getFullYear() - 1);
              break;
          }

          dbQuery = dbQuery.gte("created_at", startDate.toISOString());
        }

        // Apply sorting
        const ascending = sortBy === "created_at" ? false : true;
        dbQuery = dbQuery.order(sortBy, { ascending });

        const { data, error } = await dbQuery.limit(50);

        if (error) throw error;

        // Filter by minimum rating if specified
        let filteredPosts = data || [];
        if (minRating > 0) {
          filteredPosts = filteredPosts.filter((post) => {
            const avgRating =
              post.ratings.length > 0
                ? post.ratings.reduce(
                    (sum: number, r: { rating_value: number }) =>
                      sum + r.rating_value,
                    0
                  ) / post.ratings.length
                : 0;
            return avgRating >= minRating;
          });
        }

        setPosts(filteredPosts);
      } catch (err) {
        setError("Failed to search posts");
        console.error("Error searching:", err);
      } finally {
        setLoading(false);
      }
    },
    [selectedWorkspace, dateRange, minRating, sortBy]
  );

  // Load workspaces on mount
  useEffect(() => {
    if (user?.id) {
      loadWorkspaces();
    }
  }, [user?.id]);

  // Handle URL search params
  useEffect(() => {
    const query = searchParams.get("q");
    if (query && query !== searchQuery) {
      setSearchQuery(query);
      performSearch(query);
    }
  }, [searchParams, performSearch]);

  // Trigger search when filters change (only if we've already searched)
  useEffect(() => {
    if (hasSearched && searchQuery.trim()) {
      performSearch(searchQuery);
    }
  }, [
    selectedWorkspace,
    dateRange,
    minRating,
    sortBy,
    hasSearched,
    searchQuery,
    performSearch,
  ]);

  const loadWorkspaces = async () => {
    try {
      const supabase = await createSPASassClient();
      const { data, error } = await supabase.getMyWorkspaces();
      if (error) throw error;
      setWorkspaces(data || []);
    } catch (err) {
      console.error("Error loading workspaces:", err);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    // Update URL
    const params = new URLSearchParams();
    params.set("q", searchQuery);
    router.push(`/app/search?${params.toString()}`);

    performSearch(searchQuery);
  };

  const clearFilters = () => {
    setSelectedWorkspace("");
    setDateRange("all");
    setMinRating(0);
    setSortBy("created_at");
    if (hasSearched && searchQuery.trim()) {
      performSearch(searchQuery);
    }
  };

  const updatePosts = (postId: string, updatedPost: Partial<Post>) => {
    setPosts((prevPosts) =>
      prevPosts.map((post) =>
        post.id === postId ? { ...post, ...updatedPost } : post
      )
    );
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Search</h1>
          <p className="text-muted-foreground">
            Find posts, discussions, and content across your workspaces
          </p>
        </div>
      </div>

      {/* Search Form */}
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search posts, comments, and content..."
                  className="pl-10"
                />
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="bg-primary-600 text-white hover:bg-primary-700"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Search
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
            </div>

            {/* Advanced Filters */}
            {showFilters && (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <label className="text-sm font-medium">Workspace</label>
                  <select
                    value={selectedWorkspace}
                    onChange={(e) => setSelectedWorkspace(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="">All Workspaces</option>
                    {workspaces.map((workspace) => (
                      <option key={workspace.id} value={workspace.id}>
                        {workspace.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium">Date Range</label>
                  <select
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="all">All Time</option>
                    <option value="today">Today</option>
                    <option value="week">Last Week</option>
                    <option value="month">Last Month</option>
                    <option value="year">Last Year</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium">Minimum Rating</label>
                  <select
                    value={minRating}
                    onChange={(e) => setMinRating(Number(e.target.value))}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value={0}>Any Rating</option>
                    <option value={1}>1+ Stars</option>
                    <option value={2}>2+ Stars</option>
                    <option value={3}>3+ Stars</option>
                    <option value={4}>4+ Stars</option>
                    <option value={5}>5 Stars</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium">Sort By</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="created_at">Newest First</option>
                    <option value="text_content">Alphabetical</option>
                  </select>
                </div>

                <div className="md:col-span-2 lg:col-span-4 flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={clearFilters}
                    className="flex items-center gap-2"
                  >
                    <X className="h-4 w-4" />
                    Clear Filters
                  </Button>
                </div>
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Search Results */}
      <div className="space-y-6">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
          </div>
        ) : hasSearched && posts.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Search className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No results found
              </h3>
              <p className="text-gray-500 text-center">
                Try adjusting your search terms or filters
              </p>
            </CardContent>
          </Card>
        ) : hasSearched ? (
          <>
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Found {posts.length} result{posts.length !== 1 ? "s" : ""} for
                &quot;{searchQuery}&quot;
              </p>
            </div>
            {posts.map((post) => (
              <PostCard key={post.id} post={post} onUpdate={updatePosts} />
            ))}
          </>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Search className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Search your content
              </h3>
              <p className="text-gray-500 text-center">
                Enter a search term to find posts, comments, and discussions
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6 p-6">
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
          </div>
        </div>
      }
    >
      <SearchPageContent />
    </Suspense>
  );
}
