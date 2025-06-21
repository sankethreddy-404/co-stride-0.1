"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useGlobal } from "@/lib/context/GlobalContext";
import { createSPASassClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Plus,
  Link as LinkIcon,
  Image,
  FileText,
  Loader2,
  AlertCircle,
  X,
  Settings,
} from "lucide-react";
import { Post, Workspace } from "@/lib/types";
import PostCard from "@/components/PostCard";
import Link from "next/link";

type PostWithAttachments = Post & {
  post_attachments: Array<{ type: string; url: string; filename?: string }>;
  ratings: Array<{ rating_value: number; user_id: string }>;
  workspace_comments: Array<{
    id: string;
    comment_text: string;
    created_at: string;
    user_id: string;
  }>;
};

export default function WorkspacePage() {
  const params = useParams();
  const workspaceId = params.workspaceId as string;
  const { user } = useGlobal();

  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [posts, setPosts] = useState<PostWithAttachments[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [createPostOpen, setCreatePostOpen] = useState(false);
  const [newPostText, setNewPostText] = useState("");
  const [newPostLinks, setNewPostLinks] = useState<string[]>([""]);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [selectedDocuments, setSelectedDocuments] = useState<File[]>([]);
  const [creating, setCreating] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    if (workspaceId && user?.id) {
      loadWorkspace();
      loadPosts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId, user?.id]);

  const loadWorkspace = async () => {
    try {
      const supabase = await createSPASassClient();
      const { data, error } = await supabase.getWorkspace(workspaceId);

      if (error) throw error;
      setWorkspace(data);
      setIsOwner(data.owner_id === user?.id);
    } catch (err) {
      setError("Failed to load workspace");
      console.error("Error loading workspace:", err);
    }
  };

  const loadPosts = async () => {
    try {
      setLoading(true);
      const supabase = await createSPASassClient();
      const { data, error } = await supabase.getWorkspacePosts(workspaceId);

      if (error) throw error;
      setPosts(data || []);
    } catch (err) {
      setError("Failed to load posts");
      console.error("Error loading posts:", err);
    } finally {
      setLoading(false);
    }
  };

  const handlePostUpdate = (postId: string, updatedFields: Partial<Post>) => {
    setPosts((prevPosts) =>
      prevPosts.map((post) =>
        post.id === postId
          ? ({ ...post, ...updatedFields } as PostWithAttachments)
          : post
      )
    );
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostText.trim()) return;

    try {
      console.log("called ============================>>>>>>>>>>>>>>>>");
      setCreating(true);
      const supabase = await createSPASassClient();

      // Prepare attachments array
      const attachments: Array<{
        type: "IMAGE" | "DOCUMENT" | "LINK";
        url: string;
        filename?: string;
      }> = [];

      // Upload images
      for (const image of selectedImages) {
        const { error: uploadError, uniqueFilename } =
          await supabase.uploadWorkspaceFile(
            workspaceId,
            user!.id,
            image.name,
            image,
            "image"
          );

        if (uploadError) throw uploadError;

        const { data: urlData, error: urlError } =
          await supabase.getWorkspaceFileUrl(
            workspaceId,
            user!.id,
            uniqueFilename || image.name,
            "image"
          );

        if (urlError) throw urlError;

        attachments.push({
          type: "IMAGE",
          url: urlData.signedUrl,
          filename: image.name, // Keep original filename for display
        });
      }

      // Upload documents
      for (const document of selectedDocuments) {
        const { error: uploadError, uniqueFilename } =
          await supabase.uploadWorkspaceFile(
            workspaceId,
            user!.id,
            document.name,
            document,
            "document"
          );

        if (uploadError) throw uploadError;

        const { data: urlData, error: urlError } =
          await supabase.getWorkspaceFileUrl(
            workspaceId,
            user!.id,
            uniqueFilename || document.name,
            "document"
          );

        if (urlError) throw urlError;

        attachments.push({
          type: "DOCUMENT",
          url: urlData.signedUrl,
          filename: document.name, // Keep original filename for display
        });
      }

      // Add links
      for (const link of newPostLinks) {
        if (link.trim()) {
          attachments.push({
            type: "LINK",
            url: link.trim(),
          });
        }
      }

      const { error } = await supabase.createPost(
        workspaceId,
        newPostText.trim(),
        attachments
      );

      if (error) throw error;

      // Reset form
      setNewPostText("");
      setNewPostLinks([""]);
      setSelectedImages([]);
      setSelectedDocuments([]);
      setCreatePostOpen(false);

      await loadPosts();
    } catch (err) {
      setError("Failed to create post");
      console.error("Error creating post:", err);
    } finally {
      setCreating(false);
    }
  };

  const addLinkField = () => {
    setNewPostLinks([...newPostLinks, ""]);
  };

  const updateLink = (index: number, value: string) => {
    const updated = [...newPostLinks];
    updated[index] = value;
    setNewPostLinks(updated);
  };

  const removeLink = (index: number) => {
    const updated = newPostLinks.filter((_, i) => i !== index);
    setNewPostLinks(updated.length === 0 ? [""] : updated);
  };

  const removeImage = (index: number) => {
    setSelectedImages(selectedImages.filter((_, i) => i !== index));
  };

  const removeDocument = (index: number) => {
    setSelectedDocuments(selectedDocuments.filter((_, i) => i !== index));
  };

  if (loading && !workspace) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {workspace?.name}
          </h1>
          <p className="text-muted-foreground">
            Share your progress and collaborate with your team
          </p>
        </div>

        <div className="flex gap-2">
          {isOwner && (
            <Link href={`/app/workspaces/${workspaceId}/settings`}>
              <Button variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </Link>
          )}

          <Dialog open={createPostOpen} onOpenChange={setCreatePostOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary-600 text-white hover:bg-primary-700">
                <Plus className="h-4 w-4 mr-2" />
                New Post
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Post</DialogTitle>
              </DialogHeader>
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <form onSubmit={handleCreatePost} className="space-y-6">
                <div className="space-y-2">
                  <label htmlFor="post-text" className="text-sm font-medium">
                    Progress Update
                  </label>
                  <Textarea
                    id="post-text"
                    value={newPostText}
                    onChange={(e) => setNewPostText(e.target.value)}
                    placeholder="Share what you've been working on..."
                    rows={4}
                    required
                  />
                </div>

                {/* Image uploads */}
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Image className="h-4 w-4" />
                    Images
                  </label>
                  <div className="text-xs text-gray-500 mb-1">
                    Hold Ctrl (Cmd on Mac) to select multiple files at once
                  </div>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => {
                      const newFiles = Array.from(e.target.files || []);
                      console.log("newImages", newFiles);
                      if (newFiles.length > 0) {
                        setSelectedImages((prev) => {
                          const existingFileNames = new Set(
                            prev.map((f) => f.name)
                          );
                          const uniqueNewFiles = newFiles.filter(
                            (f) => !existingFileNames.has(f.name)
                          );
                          return [...prev, ...uniqueNewFiles];
                        });
                      }
                      e.target.value = "";
                    }}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                  />
                  {selectedImages.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-gray-500">
                          {selectedImages.length} image
                          {selectedImages.length !== 1 ? "s" : ""} selected
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedImages([])}
                          className="text-xs text-red-600 hover:text-red-700"
                        >
                          Clear All
                        </Button>
                      </div>
                      {selectedImages.map((image, index) => (
                        <div
                          key={`${image.name}-${index}`}
                          className="flex items-center justify-between p-2 bg-gray-50 rounded"
                        >
                          <span className="text-sm">{image.name}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeImage(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Document uploads */}
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Documents
                  </label>
                  <div className="text-xs text-gray-500 mb-1">
                    Hold Ctrl (Cmd on Mac) to select multiple files at once
                  </div>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.txt,.md"
                    onChange={(e) => {
                      const newFiles = Array.from(e.target.files || []);
                      console.log("newFiles", newFiles);
                      if (newFiles.length > 0) {
                        setSelectedDocuments((prev) => {
                          const existingFileNames = new Set(
                            prev.map((f) => f.name)
                          );
                          const uniqueNewFiles = newFiles.filter(
                            (f) => !existingFileNames.has(f.name)
                          );
                          return [...prev, ...uniqueNewFiles];
                        });
                      }
                      e.target.value = "";
                    }}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                  />
                  {selectedDocuments.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-gray-500">
                          {selectedDocuments.length} document
                          {selectedDocuments.length !== 1 ? "s" : ""} selected
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedDocuments([])}
                          className="text-xs text-red-600 hover:text-red-700"
                        >
                          Clear All
                        </Button>
                      </div>
                      {selectedDocuments.map((document, index) => (
                        <div
                          key={`${document.name}-${index}`}
                          className="flex items-center justify-between p-2 bg-gray-50 rounded"
                        >
                          <span className="text-sm">{document.name}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeDocument(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Links */}
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <LinkIcon className="h-4 w-4" />
                    Links
                  </label>
                  {newPostLinks.map((link, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        type="url"
                        value={link}
                        onChange={(e) => updateLink(index, e.target.value)}
                        placeholder="https://example.com"
                      />
                      {newPostLinks.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeLink(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addLinkField}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Link
                  </Button>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCreatePostOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={creating}
                    className="bg-primary-600 text-white hover:bg-primary-700"
                  >
                    {creating && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Create Post
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Posts Feed */}
      <div className="space-y-6">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
          </div>
        ) : posts.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Plus className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No posts yet
              </h3>
              <p className="text-gray-500 text-center mb-6">
                Be the first to share a progress update with your team
              </p>
              <Button
                onClick={() => setCreatePostOpen(true)}
                className="bg-primary-600 text-white hover:bg-primary-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create First Post
              </Button>
            </CardContent>
          </Card>
        ) : (
          posts.map((post) => (
            <PostCard key={post.id} post={post} onUpdate={handlePostUpdate} />
          ))
        )}
      </div>
    </div>
  );
}
