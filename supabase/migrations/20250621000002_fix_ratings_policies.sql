-- Fix infinite recursion in ratings table RLS policies
-- The issue is circular dependency between ratings policies and workspace_members policies

-- Drop all existing ratings policies that cause infinite recursion
DROP POLICY IF EXISTS "rating_view" ON public.ratings;
DROP POLICY IF EXISTS "rating_create" ON public.ratings;
DROP POLICY IF EXISTS "rating_owner_delete" ON public.ratings;
DROP POLICY IF EXISTS "rating_owner_modify" ON public.ratings;

-- Drop conflicting policies from earlier migrations
DROP POLICY IF EXISTS "Workspace members can view ratings" ON public.ratings;
DROP POLICY IF EXISTS "Workspace members can rate posts" ON public.ratings;
DROP POLICY IF EXISTS "Users can update their own ratings" ON public.ratings;
DROP POLICY IF EXISTS "Users can delete their own ratings" ON public.ratings;
DROP POLICY IF EXISTS "Users can view ratings for workspace posts" ON public.ratings;
DROP POLICY IF EXISTS "Users can rate posts in their workspaces" ON public.ratings;
DROP POLICY IF EXISTS "Workspace members can create or update their own rating" ON public.ratings;

-- Create optimized policies following Supabase RLS best practices

-- Users can view ratings for posts in workspaces they are members of
-- Using subquery to avoid circular dependency with workspace_members RLS
CREATE POLICY "Members can view workspace ratings"
  ON public.ratings
  FOR SELECT
  TO authenticated
  USING (
    (SELECT auth.uid()) IS NOT NULL AND
    post_id IN (
      SELECT p.id FROM public.posts p
      JOIN public.workspace_members wm ON wm.workspace_id = p.workspace_id
      WHERE wm.user_id = (SELECT auth.uid())
    )
  );

-- Users can rate posts in workspaces they are members of (but not their own posts)
-- This prevents self-rating and ensures workspace membership
CREATE POLICY "Members can rate others posts in workspace"
  ON public.ratings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) IS NOT NULL AND 
    user_id = (SELECT auth.uid()) AND
    post_id IN (
      SELECT p.id FROM public.posts p
      JOIN public.workspace_members wm ON wm.workspace_id = p.workspace_id
      WHERE wm.user_id = (SELECT auth.uid()) 
      AND p.user_id != (SELECT auth.uid()) -- Cannot rate own posts
    )
  );

-- Users can only update their own ratings
CREATE POLICY "Users can update own ratings"
  ON public.ratings
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT auth.uid()) IS NOT NULL AND 
    user_id = (SELECT auth.uid())
  )
  WITH CHECK (
    (SELECT auth.uid()) IS NOT NULL AND 
    user_id = (SELECT auth.uid())
  );

-- Users can only delete their own ratings
CREATE POLICY "Users can delete own ratings"
  ON public.ratings
  FOR DELETE
  TO authenticated
  USING (
    (SELECT auth.uid()) IS NOT NULL AND 
    user_id = (SELECT auth.uid())
  );

-- Add index for better performance on the user_id column
-- (Only create if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = 'idx_ratings_user_id' AND n.nspname = 'public'
    ) THEN
        CREATE INDEX idx_ratings_user_id ON public.ratings USING btree (user_id);
    END IF;
END $$;

-- Add index for better performance on the post_id column
-- (Only create if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = 'idx_ratings_post_id' AND n.nspname = 'public'
    ) THEN
        CREATE INDEX idx_ratings_post_id ON public.ratings USING btree (post_id);
    END IF;
END $$; 