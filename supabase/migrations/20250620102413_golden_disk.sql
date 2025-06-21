/*
  # AI Summaries and Analytics Schema

  1. New Tables
    - `summaries`
      - `id` (uuid, primary key)
      - `workspace_id` (uuid, foreign key)
      - `summary_text` (text)
      - `summary_type` (enum: 'daily', 'weekly', 'monthly')
      - `period_start` (timestamptz)
      - `period_end` (timestamptz)
      - `created_at` (timestamptz)
      - `created_by` (uuid, foreign key)

  2. Security
    - Enable RLS on `summaries` table
    - Add policies for workspace members to view summaries
    - Add policies for workspace owners to create summaries

  3. Indexes
    - Add indexes for better query performance
*/

-- Create summaries table
CREATE TABLE IF NOT EXISTS summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  summary_text text NOT NULL,
  summary_type text NOT NULL CHECK (summary_type IN ('daily', 'weekly', 'monthly')),
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE summaries ENABLE ROW LEVEL SECURITY;

-- Summaries policies
CREATE POLICY "Workspace members can view summaries"
  ON summaries
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

CREATE POLICY "Workspace owners can create summaries"
  ON summaries
  FOR INSERT
  TO authenticated
  WITH CHECK (
    authenticative.is_user_authenticated() AND
    created_by = auth.uid() AND
    workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
  );

CREATE POLICY "Workspace owners can update summaries"
  ON summaries
  FOR UPDATE
  TO authenticated
  USING (
    authenticative.is_user_authenticated() AND
    workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
  );

CREATE POLICY "Workspace owners can delete summaries"
  ON summaries
  FOR DELETE
  TO authenticated
  USING (
    authenticative.is_user_authenticated() AND
    workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_summaries_workspace_id ON summaries(workspace_id);
CREATE INDEX IF NOT EXISTS idx_summaries_created_at ON summaries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_summaries_period ON summaries(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_summaries_type ON summaries(summary_type);