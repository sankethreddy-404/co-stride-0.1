-- Fix posts table RLS policies by removing non-existent authenticative.is_user_authenticated() function
-- and using proper Supabase auth functions

-- Drop all problematic posts policies
DROP POLICY IF EXISTS "Workspace members can view posts" ON posts;
DROP POLICY IF EXISTS "Workspace members can create posts" ON posts;
DROP POLICY IF EXISTS "Users can update their own posts" ON posts;
DROP POLICY IF EXISTS "Users can delete their own posts" ON posts;

-- Create fixed posts policies with proper authentication
CREATE POLICY "Workspace members can view posts"
  ON posts
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IS NOT NULL AND
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
      UNION
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Workspace members can create posts"
  ON posts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    user_id = auth.uid() AND
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
      UNION
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own posts"
  ON posts
  FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "Users can delete their own posts"
  ON posts
  FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL AND user_id = auth.uid()); 