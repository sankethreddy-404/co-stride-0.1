-- Fix workspace comments issue
-- This script creates a proper workspace_comments table and updates RLS policies

-- 1. Create workspace_comments table (separate from social media comments)
CREATE TABLE IF NOT EXISTS public.workspace_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL,
  user_id uuid NOT NULL,
  comment_text text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT workspace_comments_pkey PRIMARY KEY (id),
  CONSTRAINT workspace_comments_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE,
  CONSTRAINT workspace_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 2. Enable RLS on workspace_comments
ALTER TABLE public.workspace_comments ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing incorrect policies on posts table and create workspace-aware policies
DROP POLICY IF EXISTS "select_own_posts" ON public.posts;
DROP POLICY IF EXISTS "insert_own_posts" ON public.posts;
DROP POLICY IF EXISTS "update_own_posts" ON public.posts;
DROP POLICY IF EXISTS "delete_own_posts" ON public.posts;

-- 4. Create workspace-aware policies for posts table
CREATE POLICY "Users can view workspace posts"
  ON public.posts
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IS NOT NULL AND 
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
      UNION
      SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can create posts in their workspaces"
  ON public.posts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL AND 
    user_id = auth.uid() AND
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
      UNION
      SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own posts"
  ON public.posts
  FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "Users can delete their own posts"
  ON public.posts
  FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- 5. Create RLS policies for workspace_comments
CREATE POLICY "Users can view workspace comments"
  ON public.workspace_comments
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IS NOT NULL AND
    post_id IN (
      SELECT id FROM public.posts WHERE workspace_id IN (
        SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
        UNION
        SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create comments on workspace posts"
  ON public.workspace_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    user_id = auth.uid() AND
    post_id IN (
      SELECT id FROM public.posts WHERE workspace_id IN (
        SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
        UNION
        SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update their own comments"
  ON public.workspace_comments
  FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "Users can delete their own comments"
  ON public.workspace_comments
  FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- 6. Create RLS policies for post_attachments
CREATE POLICY "Users can view attachments for workspace posts"
  ON public.post_attachments
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IS NOT NULL AND
    post_id IN (
      SELECT id FROM public.posts WHERE workspace_id IN (
        SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
        UNION
        SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can add attachments to their posts"
  ON public.post_attachments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    post_id IN (SELECT id FROM public.posts WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update attachments on their posts"
  ON public.post_attachments
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IS NOT NULL AND
    post_id IN (SELECT id FROM public.posts WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can delete attachments from their posts"
  ON public.post_attachments
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() IS NOT NULL AND
    post_id IN (SELECT id FROM public.posts WHERE user_id = auth.uid())
  );

-- 7. Create RLS policies for ratings
CREATE POLICY "Users can view ratings for workspace posts"
  ON public.ratings
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IS NOT NULL AND
    post_id IN (
      SELECT id FROM public.posts WHERE workspace_id IN (
        SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
        UNION
        SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can rate posts in their workspaces"
  ON public.ratings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    user_id = auth.uid() AND
    post_id IN (
      SELECT id FROM public.posts WHERE workspace_id IN (
        SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
        UNION
        SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update their own ratings"
  ON public.ratings
  FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "Users can delete their own ratings"
  ON public.ratings
  FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- 8. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_workspace_comments_post_id ON public.workspace_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_workspace_comments_user_id ON public.workspace_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_workspace_id ON public.posts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_post_attachments_post_id ON public.post_attachments(post_id);
CREATE INDEX IF NOT EXISTS idx_ratings_post_id ON public.ratings(post_id);
CREATE INDEX IF NOT EXISTS idx_ratings_user_id ON public.ratings(user_id); 