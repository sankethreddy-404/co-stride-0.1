-- Temporary debugging migration to allow all authenticated users to create posts
-- This will help us identify if the issue is with workspace membership logic

-- Drop the restrictive policy temporarily
DROP POLICY IF EXISTS "Workspace members can create posts" ON posts;

-- Create a simple policy that allows all authenticated users to create posts
CREATE POLICY "All authenticated users can create posts (DEBUG)"
  ON posts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    user_id = auth.uid()
  );

-- Also ensure posts can be read by authenticated users
DROP POLICY IF EXISTS "Workspace members can view posts" ON posts;

CREATE POLICY "All authenticated users can view posts (DEBUG)"
  ON posts
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL); 