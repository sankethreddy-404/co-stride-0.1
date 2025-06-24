"use client";

import React, { useState, useEffect } from "react";
import { useGlobal } from "@/lib/context/GlobalContext";
import { createSPASassClient } from "@/lib/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Image as ImageIcon,
  FileText,
  Link as LinkIcon,
  Star,
  Send,
  Loader2,
  User,
  MessageSquare,
} from "lucide-react";
import { Post } from "@/lib/types";

interface PostCardProps {
  post: Post;
  onUpdate?: (postId: string, updatedPost: Partial<Post>) => void;
}

export default function PostCard({ post, onUpdate }: PostCardProps) {
  const { user } = useGlobal();
  const [userRating, setUserRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [newComment, setNewComment] = useState("");
  const [showComments, setShowComments] = useState(false);
  const [submittingRating, setSubmittingRating] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);

  // Calculate average rating
  const ratings = post.ratings || [];
  const averageRating =
    ratings.length > 0
      ? ratings.reduce((sum, r) => sum + r.rating_value, 0) / ratings.length
      : 0;

  // Find user's existing rating
  const existingRating = ratings.find((r) => r.user_id === user?.id);

  useEffect(() => {
    setUserRating(existingRating?.rating_value || 0);
  }, [existingRating]);

  const handleRating = async (rating: number) => {
    if (!user?.id || submittingRating) return;

    try {
      setSubmittingRating(true);
      const supabase = await createSPASassClient();
      const { error } = await supabase.ratePost(post.id, rating);

      if (error) throw error;

      setUserRating(rating);

      // Update the ratings optimistically
      const existingRatingIndex =
        post.ratings?.findIndex((r) => r.user_id === user.id) ?? -1;
      const updatedRatings = [...(post.ratings || [])];

      if (existingRatingIndex >= 0) {
        updatedRatings[existingRatingIndex] = {
          ...updatedRatings[existingRatingIndex],
          rating_value: rating,
        };
      } else {
        updatedRatings.push({
          id: `temp-${Date.now()}`, // Temporary ID for optimistic update
          post_id: post.id,
          rating_value: rating,
          user_id: user.id,
          created_at: new Date().toISOString(),
        });
      }

      onUpdate?.(post.id, { ratings: updatedRatings });
    } catch (err) {
      console.error("Error rating post:", err);
    } finally {
      setSubmittingRating(false);
    }
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user?.id || submittingComment) return;

    const tempComment = {
      id: `temp-${Date.now()}`,
      post_id: post.id,
      user_id: user.id,
      comment_text: newComment.trim(),
      created_at: new Date().toISOString(),
    };

    try {
      setSubmittingComment(true);

      // Optimistic update - add comment immediately
      const updatedComments = [...(post.workspace_comments || []), tempComment];
      onUpdate?.(post.id, { workspace_comments: updatedComments });
      setNewComment("");

      const supabase = await createSPASassClient();
      const { error } = await supabase.createComment(
        post.id,
        tempComment.comment_text
      );

      if (error) throw error;

      // The optimistic update will be replaced by real data on next load if needed
    } catch (err) {
      console.error("Error creating comment:", err);
      // Revert optimistic update on error
      onUpdate?.(post.id, { workspace_comments: post.workspace_comments });
      setNewComment(tempComment.comment_text); // Restore the comment text
    } finally {
      setSubmittingComment(false);
    }
  };

  const renderStars = (rating: number, interactive: boolean = false) => {
    return Array.from({ length: 5 }, (_, i) => {
      const starValue = i + 1;
      const isFilled = interactive
        ? (hoveredRating || userRating) >= starValue
        : rating >= starValue;

      return (
        <Star
          key={i}
          className={`h-4 w-4 ${
            isFilled ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
          } ${interactive ? "cursor-pointer hover:text-yellow-400" : ""}`}
          onClick={interactive ? () => handleRating(starValue) : undefined}
          onMouseEnter={
            interactive ? () => setHoveredRating(starValue) : undefined
          }
          onMouseLeave={interactive ? () => setHoveredRating(0) : undefined}
        />
      );
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="h-5 w-5" />
            Progress Update
          </CardTitle>
          <span className="text-sm text-gray-500">
            {new Date(post.created_at).toLocaleDateString()}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-gray-700 whitespace-pre-wrap">{post.text_content}</p>

        {/* Render attachments */}
        {(post.post_attachments || []).length > 0 && (
          <div className="space-y-4">
            {/* Images */}
            {(post.post_attachments || []).filter(
              (a) => a.attachment_type === "IMAGE"
            ).length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" />
                  Images
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {(post.post_attachments || [])
                    .filter((a) => a.attachment_type === "IMAGE")
                    .map((attachment) => (
                      <div
                        key={attachment.id}
                        className="aspect-square bg-gray-100 rounded-lg overflow-hidden"
                      >
                        <img
                          src={attachment.url || attachment.file_url || ""}
                          alt=""
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            // If image fails to load (likely expired URL), show error state
                            const target = e.target as HTMLImageElement;
                            target.style.display = "none";
                            target.parentElement!.innerHTML = `
                              <div class="w-full h-full flex items-center justify-center bg-gray-200 text-gray-500 text-sm">
                                Image unavailable<br/>(URL expired)
                              </div>
                            `;
                          }}
                        />
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Documents */}
            {(post.post_attachments || []).filter(
              (a) => a.attachment_type === "DOCUMENT"
            ).length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Documents
                </h4>
                <div className="space-y-2">
                  {(post.post_attachments || [])
                    .filter((a) => a.attachment_type === "DOCUMENT")
                    .map((attachment) => (
                      <a
                        key={attachment.id}
                        href={attachment.url || attachment.file_url || ""}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 p-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors"
                      >
                        <FileText className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">{attachment.filename}</span>
                      </a>
                    ))}
                </div>
              </div>
            )}

            {/* Links */}
            {(post.post_attachments || []).filter(
              (a) => a.attachment_type === "LINK"
            ).length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <LinkIcon className="h-4 w-4" />
                  Links
                </h4>
                <div className="space-y-2">
                  {(post.post_attachments || [])
                    .filter((a) => a.attachment_type === "LINK")
                    .map((attachment) => (
                      <a
                        key={attachment.id}
                        href={attachment.url || attachment.file_url || ""}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 p-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors text-primary-600 hover:text-primary-700"
                      >
                        <LinkIcon className="h-4 w-4" />
                        <span className="text-sm truncate">
                          {attachment.url || attachment.file_url || ""}
                        </span>
                      </a>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Rating Section */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Rating:</span>
              <div className="flex items-center gap-1">
                {renderStars(averageRating)}
                <span className="text-sm text-gray-500 ml-1">
                  ({ratings.length}{" "}
                  {ratings.length === 1 ? "rating" : "ratings"})
                </span>
              </div>
            </div>
            {averageRating > 0 && (
              <span className="text-sm font-medium text-primary-600">
                {averageRating.toFixed(1)}/5
              </span>
            )}
          </div>

          {/* User Rating */}
          {user?.id !== post.user_id && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Your rating:</span>
              <div className="flex items-center gap-1">
                {submittingRating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  renderStars(userRating, true)
                )}
              </div>
            </div>
          )}
        </div>

        {/* Comments Section */}
        <div className="border-t pt-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowComments(!showComments)}
            className="flex items-center gap-2 mb-3"
          >
            <MessageSquare className="h-4 w-4" />
            {(post.workspace_comments || []).length}{" "}
            {(post.workspace_comments || []).length === 1
              ? "Comment"
              : "Comments"}
          </Button>

          {showComments && (
            <div className="space-y-3">
              {/* Existing Comments */}
              {(post.workspace_comments || []).map((comment) => (
                <div key={comment.id} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">
                      {comment.user_id === user?.id
                        ? "You"
                        : comment.user_id.slice(0, 8)}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(comment.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">
                    {comment.comment_text}
                  </p>
                </div>
              ))}

              {/* Add Comment Form */}
              <form onSubmit={handleComment} className="flex gap-2">
                <Textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  rows={2}
                  className="flex-1"
                />
                <Button
                  type="submit"
                  disabled={!newComment.trim() || submittingComment}
                  size="sm"
                  className="self-end"
                >
                  {submittingComment ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </form>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
