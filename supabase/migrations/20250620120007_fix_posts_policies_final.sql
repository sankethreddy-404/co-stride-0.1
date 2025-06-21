-- Final fix for posts table RLS policies
-- This migration properly handles all existing policies and recreates them correctly

-- Drop ALL existing posts policies (including any that might exist from previous migrations)
DROP POLICY IF EXISTS "Workspace members can view posts" ON posts;
DROP POLICY IF EXISTS "Workspace members can create posts" ON posts;
DROP POLICY IF EXISTS "Users can update their own posts" ON posts;
DROP POLICY IF EXISTS "Users can delete their own posts" ON posts;
DROP POLICY IF EXISTS "All authenticated users can create posts (DEBUG)" ON posts;
DROP POLICY IF EXISTS "All authenticated users can view posts (DEBUG)" ON posts;

-- Create the correct workspace-based policies with proper auth checks
CREATE POLICY "Workspace members can view posts"
  ON posts
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IS NOT NULL AND
    workspace_id IN (
      -- User is a member of the workspace
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
      UNION
      -- User is the owner of the workspace  
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
      -- User is a member of the workspace
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
      UNION
      -- User is the owner of the workspace
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own posts"
  ON posts
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IS NOT NULL AND 
    user_id = auth.uid()
  );

CREATE POLICY "Users can delete their own posts"
  ON posts
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() IS NOT NULL AND 
    user_id = auth.uid()
  ); 