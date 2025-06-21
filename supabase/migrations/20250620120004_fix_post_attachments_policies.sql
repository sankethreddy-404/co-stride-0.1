-- Fix post_attachments table RLS policies by removing non-existent authenticative.is_user_authenticated() function

-- Drop all problematic post_attachments policies
DROP POLICY IF EXISTS "Workspace members can view post attachments" ON post_attachments;
DROP POLICY IF EXISTS "Users can create attachments for their posts" ON post_attachments;
DROP POLICY IF EXISTS "Users can update attachments for their posts" ON post_attachments;
DROP POLICY IF EXISTS "Users can delete attachments for their posts" ON post_attachments;

-- Create fixed post_attachments policies
CREATE POLICY "Workspace members can view post attachments"
  ON post_attachments
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IS NOT NULL AND
    post_id IN (
      SELECT id FROM posts WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
        UNION
        SELECT id FROM workspaces WHERE owner_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create attachments for their posts"
  ON post_attachments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    post_id IN (SELECT id FROM posts WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update attachments for their posts"
  ON post_attachments
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IS NOT NULL AND
    post_id IN (SELECT id FROM posts WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can delete attachments for their posts"
  ON post_attachments
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() IS NOT NULL AND
    post_id IN (SELECT id FROM posts WHERE user_id = auth.uid())
  ); 