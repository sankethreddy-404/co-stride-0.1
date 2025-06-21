/*
  # Workspace System Schema

  1. New Tables
    - `workspaces`
      - `id` (uuid, primary key)
      - `name` (text, workspace name)
      - `owner_id` (uuid, foreign key to auth.users)
      - `created_at` (timestamp)
    
    - `workspace_members`
      - `id` (uuid, primary key)
      - `workspace_id` (uuid, foreign key to workspaces)
      - `user_id` (uuid, foreign key to auth.users)
      - `role` (text, default 'member')
      - `joined_at` (timestamp)
    
    - `invitations`
      - `id` (uuid, primary key)
      - `workspace_id` (uuid, foreign key to workspaces)
      - `invited_email` (text)
      - `status` (text, default 'pending')
      - `invited_by` (uuid, foreign key to auth.users)
      - `created_at` (timestamp)
    
    - `posts`
      - `id` (uuid, primary key)
      - `workspace_id` (uuid, foreign key to workspaces)
      - `user_id` (uuid, foreign key to auth.users)
      - `text_content` (text)
      - `created_at` (timestamp)
    
    - `post_attachments`
      - `id` (uuid, primary key)
      - `post_id` (uuid, foreign key to posts)
      - `attachment_type` (text, enum: 'IMAGE', 'DOCUMENT', 'LINK')
      - `url` (text)
      - `filename` (text, nullable)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for workspace-based access control
*/

-- Create workspaces table
CREATE TABLE IF NOT EXISTS workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Create workspace_members table
CREATE TABLE IF NOT EXISTS workspace_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  joined_at timestamptz DEFAULT now(),
  UNIQUE(workspace_id, user_id)
);

-- Create invitations table
CREATE TABLE IF NOT EXISTS invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  invited_email text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  invited_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Create posts table
CREATE TABLE IF NOT EXISTS posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text_content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create post_attachments table
CREATE TABLE IF NOT EXISTS post_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  attachment_type text NOT NULL CHECK (attachment_type IN ('IMAGE', 'DOCUMENT', 'LINK')),
  url text NOT NULL,
  filename text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_attachments ENABLE ROW LEVEL SECURITY;

-- Workspaces policies
CREATE POLICY "Users can view workspaces they are members of"
  ON workspaces
  FOR SELECT
  TO authenticated
  USING (
    authenticative.is_user_authenticated() AND (
      owner_id = auth.uid() OR
      id IN (
        SELECT workspace_id FROM workspace_members 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create workspaces"
  ON workspaces
  FOR INSERT
  TO authenticated
  WITH CHECK (authenticative.is_user_authenticated() AND owner_id = auth.uid());

CREATE POLICY "Workspace owners can update their workspaces"
  ON workspaces
  FOR UPDATE
  TO authenticated
  USING (authenticative.is_user_authenticated() AND owner_id = auth.uid());

CREATE POLICY "Workspace owners can delete their workspaces"
  ON workspaces
  FOR DELETE
  TO authenticated
  USING (authenticative.is_user_authenticated() AND owner_id = auth.uid());

-- Workspace members policies
CREATE POLICY "Users can view workspace members for their workspaces"
  ON workspace_members
  FOR SELECT
  TO authenticated
  USING (
    authenticative.is_user_authenticated() AND
    workspace_id IN (
      SELECT id FROM workspaces 
      WHERE owner_id = auth.uid() OR
      id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Workspace owners can manage members"
  ON workspace_members
  FOR ALL
  TO authenticated
  USING (
    authenticative.is_user_authenticated() AND
    workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
  );

-- Invitations policies
CREATE POLICY "Workspace owners can manage invitations"
  ON invitations
  FOR ALL
  TO authenticated
  USING (
    authenticative.is_user_authenticated() AND
    workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
  );

-- Posts policies
CREATE POLICY "Workspace members can view posts"
  ON posts
  FOR SELECT
  TO authenticated
  USING (
    authenticative.is_user_authenticated() AND
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
    authenticative.is_user_authenticated() AND
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
  USING (authenticative.is_user_authenticated() AND user_id = auth.uid());

CREATE POLICY "Users can delete their own posts"
  ON posts
  FOR DELETE
  TO authenticated
  USING (authenticative.is_user_authenticated() AND user_id = auth.uid());

-- Post attachments policies
CREATE POLICY "Workspace members can view post attachments"
  ON post_attachments
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

CREATE POLICY "Users can create attachments for their posts"
  ON post_attachments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    authenticative.is_user_authenticated() AND
    post_id IN (SELECT id FROM posts WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update attachments for their posts"
  ON post_attachments
  FOR UPDATE
  TO authenticated
  USING (
    authenticative.is_user_authenticated() AND
    post_id IN (SELECT id FROM posts WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can delete attachments for their posts"
  ON post_attachments
  FOR DELETE
  TO authenticated
  USING (
    authenticative.is_user_authenticated() AND
    post_id IN (SELECT id FROM posts WHERE user_id = auth.uid())
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace_id ON workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user_id ON workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_workspace_id ON posts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_attachments_post_id ON post_attachments(post_id);
CREATE INDEX IF NOT EXISTS idx_invitations_workspace_id ON invitations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(invited_email);