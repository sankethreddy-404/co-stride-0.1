import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/lib/types";

export enum ClientType {
  SERVER = "server",
  SPA = "spa",
}

export class SassClient {
  private client: SupabaseClient<Database>;
  private clientType: ClientType;

  constructor(client: SupabaseClient, clientType: ClientType) {
    this.client = client;
    this.clientType = clientType;
  }

  // Authentication methods
  async loginEmail(email: string, password: string) {
    return this.client.auth.signInWithPassword({
      email: email,
      password: password,
    });
  }

  async registerEmail(email: string, password: string) {
    // Note: This method is kept for backward compatibility but should not be used
    // with Google OAuth flow. Google OAuth handles registration automatically.
    return this.client.auth.signUp({
      email: email,
      password: password,
    });
  }

  async signInWithGoogle(redirectTo?: string) {
    const redirectUrl =
      redirectTo ||
      `${
        typeof window !== "undefined"
          ? window.location.origin
          : "http://localhost:3000"
      }/api/auth/callback`;

    return this.client.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: redirectUrl,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });
  }

  async exchangeCodeForSession(code: string) {
    return this.client.auth.exchangeCodeForSession(code);
  }

  async resendVerificationEmail(email: string) {
    return this.client.auth.resend({
      email: email,
      type: "signup",
    });
  }

  async logout() {
    const { error } = await this.client.auth.signOut({
      scope: "local",
    });
    if (error) throw error;
    if (this.clientType === ClientType.SPA) {
      window.location.href = "/auth/login";
    }
  }

  // File storage methods
  async uploadFile(myId: string, filename: string, file: File) {
    filename = filename.replace(/[^0-9a-zA-Z!\-_.*'()]/g, "_");
    filename = myId + "/" + filename;
    return this.client.storage.from("files").upload(filename, file);
  }

  async getFiles(myId: string) {
    return this.client.storage.from("files").list(myId);
  }

  async deleteFile(myId: string, filename: string) {
    filename = myId + "/" + filename;
    return this.client.storage.from("files").remove([filename]);
  }

  async shareFile(
    myId: string,
    filename: string,
    timeInSec: number,
    forDownload: boolean = false
  ) {
    filename = myId + "/" + filename;
    return this.client.storage
      .from("files")
      .createSignedUrl(filename, timeInSec, {
        download: forDownload,
      });
  }

  // Workspace file storage methods
  async uploadWorkspaceFile(
    workspaceId: string,
    userId: string,
    filename: string,
    file: File,
    type: "image" | "document"
  ) {
    const sanitizedFilename = filename.replace(/[^0-9a-zA-Z!\-_.*'()]/g, "_");

    // Generate unique filename using timestamp + random number in base 36
    const timestamp = Date.now().toString(36);
    const randomSuffix = Math.random().toString(36).slice(2, 6);
    const uniqueId = `${timestamp}${randomSuffix}`;

    // Extract file extension
    const fileExtension = sanitizedFilename.split(".").pop();
    const nameWithoutExtension = sanitizedFilename.replace(/\.[^/.]+$/, "");

    // Create unique filename: originalname_uniqueid.ext
    const uniqueFilename = `${nameWithoutExtension}_${uniqueId}.${fileExtension}`;
    const filePath = `${workspaceId}/${userId}/${uniqueFilename}`;

    const bucket =
      type === "image" ? "workspace-images" : "workspace-documents";

    const result = await this.client.storage
      .from(bucket)
      .upload(filePath, file);

    // Return both the result and the unique filename for use in getting URLs
    return {
      ...result,
      uniqueFilename,
    };
  }

  async getWorkspaceFileUrl(
    workspaceId: string,
    userId: string,
    filename: string,
    type: "image" | "document"
  ) {
    const sanitizedFilename = filename.replace(/[^0-9a-zA-Z!\-_.*'()]/g, "_");
    const filePath = `${workspaceId}/${userId}/${sanitizedFilename}`;
    const bucket =
      type === "image" ? "workspace-images" : "workspace-documents";

    // Using 10 years expiry (315,360,000 seconds) to prevent URL expiration issues
    // As discussed in: https://github.com/orgs/supabase/discussions/7626
    return this.client.storage
      .from(bucket)
      .createSignedUrl(filePath, 315360000); // 10 years expiry
  }

  async deleteWorkspaceFile(
    workspaceId: string,
    userId: string,
    filename: string,
    type: "image" | "document"
  ) {
    const sanitizedFilename = filename.replace(/[^0-9a-zA-Z!\-_.*'()]/g, "_");
    const filePath = `${workspaceId}/${userId}/${sanitizedFilename}`;
    const bucket =
      type === "image" ? "workspace-images" : "workspace-documents";

    return this.client.storage.from(bucket).remove([filePath]);
  }

  // Todo list methods (existing)
  async getMyTodoList(
    page: number = 1,
    pageSize: number = 100,
    order: string = "created_at",
    done: boolean | null = false
  ) {
    let query = this.client
      .from("todo_list")
      .select("*")
      .range(page * pageSize - pageSize, page * pageSize - 1)
      .order(order);
    if (done !== null) {
      query = query.eq("done", done);
    }
    return query;
  }

  async createTask(row: Database["public"]["Tables"]["todo_list"]["Insert"]) {
    return this.client.from("todo_list").insert(row);
  }

  async removeTask(id: string) {
    return this.client.from("todo_list").delete().eq("id", id);
  }

  async updateAsDone(id: string) {
    return this.client.from("todo_list").update({ done: true }).eq("id", id);
  }

  // Workspace methods
  async createWorkspace(name: string) {
    // Get current user ID
    const {
      data: { user },
    } = await this.client.auth.getUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    const { data: workspace, error: workspaceError } = await this.client
      .from("workspaces")
      .insert({
        name,
        owner_id: user.id,
      })
      .select()
      .single();

    if (workspaceError) throw workspaceError;

    // Add the creator as the owner in workspace_members
    const { error: memberError } = await this.client
      .from("workspace_members")
      .insert({
        workspace_id: workspace.id,
        user_id: workspace.owner_id,
        role: "owner",
      });

    if (memberError) throw memberError;

    return { data: workspace, error: null };
  }

  async getMyWorkspaces() {
    // Get current user
    const {
      data: { user },
    } = await this.client.auth.getUser();
    if (!user) {
      return { data: [], error: new Error("User not authenticated") };
    }

    // Get workspaces where user is owner - now uses simple RLS policy
    const { data: ownedWorkspaces, error: ownedError } = await this.client
      .from("workspaces")
      .select("*")
      .eq("owner_id", user.id);

    if (ownedError) return { data: [], error: ownedError };

    // Get user's membership records - uses simple RLS policy
    const { data: membershipData, error: membershipError } = await this.client
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", user.id);

    if (membershipError) return { data: [], error: membershipError };

    // Get workspace data for member workspaces (excluding owned ones to avoid duplicates)
    const memberWorkspaceIds =
      membershipData
        ?.map((m) => m.workspace_id)
        .filter((id) => !ownedWorkspaces?.some((w) => w.id === id)) || [];

    let memberWorkspaces = [];
    if (memberWorkspaceIds.length > 0) {
      const { data: workspaceData, error: workspaceError } = await this.client
        .from("workspaces")
        .select("*")
        .in("id", memberWorkspaceIds);

      if (workspaceError) return { data: [], error: workspaceError };
      memberWorkspaces = workspaceData || [];
    }

    // Combine workspaces and add null workspace_members (handled by getUserRole in frontend)
    const allWorkspaces = [
      ...(ownedWorkspaces || []).map((w) => ({
        ...w,
        workspace_members: null,
      })),
      ...memberWorkspaces.map((w) => ({ ...w, workspace_members: null })),
    ];

    // Sort by creation date
    allWorkspaces.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return { data: allWorkspaces, error: null };
  }

  async getWorkspace(workspaceId: string) {
    return this.client
      .from("workspaces")
      .select(
        `
                *,
                workspace_members(
                    id,
                    role,
                    joined_at,
                    user_id
                )
            `
      )
      .eq("id", workspaceId)
      .single();
  }

  async getWorkspaceMembers(workspaceId: string) {
    return this.client
      .from("workspace_members")
      .select(
        `
                *,
                user_id
            `
      )
      .eq("workspace_id", workspaceId);
  }

  async inviteToWorkspace(workspaceId: string, email: string) {
    return this.client.from("invitations").insert({
      workspace_id: workspaceId,
      invited_email: email,
    });
  }

  async getWorkspaceInvitations(workspaceId: string) {
    return this.client
      .from("invitations")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });
  }

  async updateInvitationStatus(
    invitationId: string,
    status: "accepted" | "declined"
  ) {
    return this.client
      .from("invitations")
      .update({ status })
      .eq("id", invitationId);
  }

  async joinWorkspace(workspaceId: string, userId: string) {
    return this.client.from("workspace_members").insert({
      workspace_id: workspaceId,
      user_id: userId,
      role: "member",
    });
  }

  // Posts methods
  async createPost(
    workspaceId: string,
    textContent: string,
    attachments: Array<{
      type: "IMAGE" | "DOCUMENT" | "LINK";
      url: string;
      filename?: string;
    }>
  ) {
    // Get current user ID
    const {
      data: { user },
    } = await this.client.auth.getUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    // First create the post
    const { data: post, error: postError } = await this.client
      .from("posts")
      .insert({
        workspace_id: workspaceId,
        text_content: textContent,
        user_id: user.id, // Add the missing user_id field
      })
      .select()
      .single();

    if (postError) throw postError;

    // Then create attachments if any
    if (attachments.length > 0) {
      const attachmentData = attachments.map((attachment) => ({
        post_id: post.id,
        attachment_type: attachment.type,
        url: attachment.url,
        filename: attachment.filename,
      }));

      const { error: attachmentError } = await this.client
        .from("post_attachments")
        .insert(attachmentData);

      if (attachmentError) throw attachmentError;
    }

    return { data: post, error: null };
  }

  async getWorkspacePosts(
    workspaceId: string,
    page: number = 1,
    pageSize: number = 20
  ) {
    const offset = (page - 1) * pageSize;

    return this.client
      .from("posts")
      .select(
        `
                *,
                post_attachments(*),
                ratings(rating_value, user_id),
                workspace_comments(
                    id,
                    comment_text,
                    created_at,
                    user_id
                )
            `
      )
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .range(offset, offset + pageSize - 1);
  }

  async deletePost(postId: string) {
    return this.client.from("posts").delete().eq("id", postId);
  }

  // Rating methods
  async ratePost(postId: string, rating: number) {
    const {
      data: { user },
    } = await this.client.auth.getUser();
    if (!user) {
      throw new Error("User not authenticated");
    }
    return this.client.from("ratings").upsert(
      {
        post_id: postId,
        rating_value: rating,
        user_id: user.id,
      },
      {
        onConflict: "post_id,user_id",
      }
    );
  }

  async getPostRatings(postId: string) {
    return this.client
      .from("ratings")
      .select("rating_value, user_id")
      .eq("post_id", postId);
  }

  async getUserRating(postId: string, userId: string) {
    return this.client
      .from("ratings")
      .select("rating_value")
      .eq("post_id", postId)
      .eq("user_id", userId)
      .single();
  }

  // Comment methods
  async createComment(postId: string, commentText: string) {
    const {
      data: { user },
    } = await this.client.auth.getUser();
    if (!user) {
      throw new Error("User not authenticated");
    }
    return this.client
      .from("workspace_comments")
      .insert({
        post_id: postId,
        comment_text: commentText,
        user_id: user.id,
      })
      .select(
        `
                *,
                user_id
            `
      )
      .single();
  }

  async getPostComments(postId: string) {
    return this.client
      .from("workspace_comments")
      .select(
        `
                *,
                user_id
            `
      )
      .eq("post_id", postId)
      .order("created_at", { ascending: true });
  }

  async updateComment(commentId: string, commentText: string) {
    return this.client
      .from("workspace_comments")
      .update({ comment_text: commentText })
      .eq("id", commentId);
  }

  async deleteComment(commentId: string) {
    return this.client.from("workspace_comments").delete().eq("id", commentId);
  }

  // AI Summary methods
  async getWorkspaceSummaries(workspaceId: string, limit: number = 10) {
    return this.client
      .from("summaries")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(limit);
  }

  async createSummary(
    workspaceId: string,
    summaryText: string,
    summaryType: "daily" | "weekly" | "monthly",
    periodStart: string,
    periodEnd: string
  ) {
    return this.client
      .from("summaries")
      .insert({
        workspace_id: workspaceId,
        summary_text: summaryText,
        summary_type: summaryType,
        period_start: periodStart,
        period_end: periodEnd,
      })
      .select()
      .single();
  }

  // Analytics methods
  async getWorkspaceAnalytics(workspaceId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get posts count by day
    const { data: postsData } = await this.client
      .from("posts")
      .select("id, created_at")
      .eq("workspace_id", workspaceId)
      .gte("created_at", startDate.toISOString());

    // Type assertion to ensure proper typing
    const typedPostsData = postsData as Array<{
      id: string;
      created_at: string;
    }> | null;

    // Get ratings data
    const { data: ratingsData } = await this.client
      .from("ratings")
      .select(
        `
                rating_value,
                created_at,
                post_id
            `
      )
      .in("post_id", typedPostsData?.map((p) => p.id) || []);

    // Get comments data
    const { data: commentsData } = await this.client
      .from("workspace_comments")
      .select(
        `
                created_at,
                post_id
            `
      )
      .in("post_id", typedPostsData?.map((p) => p.id) || []);

    return {
      posts: postsData || [],
      ratings: ratingsData || [],
      comments: commentsData || [],
    };
  }

  async getWorkspaceLeaderboard(workspaceId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return this.client
      .from("posts")
      .select(
        `
                user_id,
                created_at,
                ratings(rating_value)
            `
      )
      .eq("workspace_id", workspaceId)
      .gte("created_at", startDate.toISOString());
  }

  getSupabaseClient() {
    return this.client;
  }

  // Chat methods
  async createChatSession(userId: string) {
    return this.client
      .from("chat_sessions")
      .insert({
        user_id: userId,
      })
      .select()
      .single();
  }

  async getChatSessions(userId: string) {
    return this.client
      .from("chat_sessions")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });
  }

  async updateChatSessionTitle(sessionId: string, title: string) {
    return this.client
      .from("chat_sessions")
      .update({ title, updated_at: new Date().toISOString() })
      .eq("id", sessionId);
  }

  async createChatMessage(
    sessionId: string,
    userId: string,
    senderType: "user" | "ai" | "tool_call" | "tool_output",
    messageContent: string,
    toolName?: string,
    toolArgs?: object,
    toolOutput?: string
  ) {
    return this.client
      .from("chat_messages")
      .insert({
        session_id: sessionId,
        user_id: userId,
        sender_type: senderType,
        message_content: messageContent,
        tool_name: toolName,
        tool_args: toolArgs,
        tool_output: toolOutput,
      })
      .select()
      .single();
  }

  async getChatMessages(sessionId: string) {
    return this.client
      .from("chat_messages")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });
  }

  async deleteChatSession(sessionId: string) {
    return this.client
      .from("chat_sessions")
      .delete()
      .eq("id", sessionId);
  }
}
