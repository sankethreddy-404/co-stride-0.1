/*
  # Phase 2: Collaboration & Feedback Features

  1. Enhanced Tables
    - Add ratings table for post ratings
    - Add comments table for post discussions
    - Update invitations table with token-based system
  
  2. Security
    - Enable RLS on new tables
    - Add policies for ratings and comments
    - Secure invitation flow
  
  3. Indexes
    - Performance indexes for new features
*/

-- Create ratings table
CREATE TABLE IF NOT EXISTS ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating_value integer NOT NULL CHECK (rating_value >= 1 AND rating_value <= 5),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- Create comments table
CREATE TABLE IF NOT EXISTS comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  comment_text text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add invitation token to invitations table
ALTER TABLE invitations ADD COLUMN IF NOT EXISTS invitation_token uuid DEFAULT gen_random_uuid();
ALTER TABLE invitations ADD COLUMN IF NOT EXISTS expires_at timestamptz DEFAULT (now() + interval '7 days');

-- Enable RLS on new tables
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Ratings policies
CREATE POLICY "Workspace members can view ratings"
  ON ratings
  FOR SELECT
  TO authenticated
  USING (
    authenticative.is_user_authenticated() AND
    post_id IN (
      SELECT id FROM posts WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
        UNION
        SELECT id FROM workspaces WHERE owner_id = auth.uid()
      )
    )
  );

CREATE POLICY "Workspace members can rate posts"
  ON ratings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    authenticative.is_user_authenticated() AND
    user_id = auth.uid() AND
    post_id IN (
      SELECT id FROM posts WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
        UNION
        SELECT id FROM workspaces WHERE owner_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update their own ratings"
  ON ratings
  FOR UPDATE
  TO authenticated
  USING (authenticative.is_user_authenticated() AND user_id = auth.uid());

CREATE POLICY "Users can delete their own ratings"
  ON ratings
  FOR DELETE
  TO authenticated
  USING (authenticative.is_user_authenticated() AND user_id = auth.uid());

-- Comments policies
CREATE POLICY "Workspace members can view comments"
  ON comments
  FOR SELECT
  TO authenticated
  USING (
    authenticative.is_user_authenticated() AND
    post_id IN (
      SELECT id FROM posts WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
        UNION
        SELECT id FROM workspaces WHERE owner_id = auth.uid()
      )
    )
  );

CREATE POLICY "Workspace members can create comments"
  ON comments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    authenticative.is_user_authenticated() AND
    user_id = auth.uid() AND
    post_id IN (
      SELECT id FROM posts WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
        UNION
        SELECT id FROM workspaces WHERE owner_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update their own comments"
  ON comments
  FOR UPDATE
  TO authenticated
  USING (authenticative.is_user_authenticated() AND user_id = auth.uid());

CREATE POLICY "Users can delete their own comments"
  ON comments
  FOR DELETE
  TO authenticated
  USING (authenticative.is_user_authenticated() AND user_id = auth.uid());

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ratings_post_id ON ratings(post_id);
CREATE INDEX IF NOT EXISTS idx_ratings_user_id ON ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(invitation_token);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_ratings_updated_at BEFORE UPDATE ON ratings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();