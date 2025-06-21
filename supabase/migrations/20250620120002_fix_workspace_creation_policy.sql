-- Fix workspace creation policy by removing complex MFA authentication requirement

-- Drop and recreate workspace policies with simpler authentication check
DROP POLICY IF EXISTS "Users can create workspaces" ON workspaces;
DROP POLICY IF EXISTS "Workspace owners can update their workspaces" ON workspaces;
DROP POLICY IF EXISTS "Workspace owners can delete their workspaces" ON workspaces;

-- Create simpler workspace policies that just check auth.uid()
CREATE POLICY "Users can create workspaces"
  ON workspaces
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL AND owner_id = auth.uid());

CREATE POLICY "Workspace owners can update their workspaces"
  ON workspaces
  FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL AND owner_id = auth.uid());

CREATE POLICY "Workspace owners can delete their workspaces"
  ON workspaces
  FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL AND owner_id = auth.uid()); 