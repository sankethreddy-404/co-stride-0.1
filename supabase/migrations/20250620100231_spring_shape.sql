/*
  # Storage Buckets for Workspace Files

  1. New Buckets
    - `workspace-images` - For image attachments
    - `workspace-documents` - For document attachments

  2. Security
    - Users can only access files from workspaces they belong to
    - Files are organized by workspace_id/user_id/filename structure
*/

-- Create storage buckets for workspace files
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('workspace-images', 'workspace-images', false),
  ('workspace-documents', 'workspace-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Policies for workspace-images bucket
CREATE POLICY "Workspace members can view images"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'workspace-images' AND
  authenticative.is_user_authenticated() AND
  -- Extract workspace_id from the file path (format: workspace_id/user_id/filename)
  split_part(name, '/', 1)::uuid IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    UNION
    SELECT id FROM workspaces WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "Workspace members can upload images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'workspace-images' AND
  authenticative.is_user_authenticated() AND
  -- Ensure user can only upload to their own folder within workspaces they belong to
  split_part(name, '/', 2)::uuid = auth.uid() AND
  split_part(name, '/', 1)::uuid IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    UNION
    SELECT id FROM workspaces WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'workspace-images' AND
  authenticative.is_user_authenticated() AND
  split_part(name, '/', 2)::uuid = auth.uid()
);

CREATE POLICY "Users can delete their own images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'workspace-images' AND
  authenticative.is_user_authenticated() AND
  split_part(name, '/', 2)::uuid = auth.uid()
);

-- Policies for workspace-documents bucket
CREATE POLICY "Workspace members can view documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'workspace-documents' AND
  authenticative.is_user_authenticated() AND
  split_part(name, '/', 1)::uuid IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    UNION
    SELECT id FROM workspaces WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "Workspace members can upload documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'workspace-documents' AND
  authenticative.is_user_authenticated() AND
  split_part(name, '/', 2)::uuid = auth.uid() AND
  split_part(name, '/', 1)::uuid IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    UNION
    SELECT id FROM workspaces WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'workspace-documents' AND
  authenticative.is_user_authenticated() AND
  split_part(name, '/', 2)::uuid = auth.uid()
);

CREATE POLICY "Users can delete their own documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'workspace-documents' AND
  authenticative.is_user_authenticated() AND
  split_part(name, '/', 2)::uuid = auth.uid()
);