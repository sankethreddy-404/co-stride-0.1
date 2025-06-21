/*
  # Fix Storage Policies - Remove authenticative.is_user_authenticated()
  
  The authenticative.is_user_authenticated() function was removed in previous migrations
  but storage policies are still referencing it, causing JWT errors.
  
  This migration fixes all storage policies to use auth.uid() IS NOT NULL instead.
*/

-- Fix workspace-images bucket policies
DROP POLICY IF EXISTS "Workspace members can view images" ON storage.objects;
DROP POLICY IF EXISTS "Workspace members can upload images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own images" ON storage.objects;

-- Create fixed workspace-images policies
CREATE POLICY "Workspace members can view images"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'workspace-images' AND
  auth.uid() IS NOT NULL AND
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
  auth.uid() IS NOT NULL AND
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
  auth.uid() IS NOT NULL AND
  split_part(name, '/', 2)::uuid = auth.uid()
);

CREATE POLICY "Users can delete their own images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'workspace-images' AND
  auth.uid() IS NOT NULL AND
  split_part(name, '/', 2)::uuid = auth.uid()
);

-- Fix workspace-documents bucket policies
DROP POLICY IF EXISTS "Workspace members can view documents" ON storage.objects;
DROP POLICY IF EXISTS "Workspace members can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own documents" ON storage.objects;

-- Create fixed workspace-documents policies
CREATE POLICY "Workspace members can view documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'workspace-documents' AND
  auth.uid() IS NOT NULL AND
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
  auth.uid() IS NOT NULL AND
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
  auth.uid() IS NOT NULL AND
  split_part(name, '/', 2)::uuid = auth.uid()
);

CREATE POLICY "Users can delete their own documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'workspace-documents' AND
  auth.uid() IS NOT NULL AND
  split_part(name, '/', 2)::uuid = auth.uid()
);

-- Also fix the old 'files' bucket policies if they exist
DROP POLICY IF EXISTS "Give users access to own folder 1m0cqf_0" ON storage.objects;
DROP POLICY IF EXISTS "Give users access to own folder 1m0cqf_1" ON storage.objects;
DROP POLICY IF EXISTS "Give users access to own folder 1m0cqf_2" ON storage.objects;
DROP POLICY IF EXISTS "Give users access to own folder 1m0cqf_3" ON storage.objects;

CREATE POLICY "Give users access to own folder 1m0cqf_0"
ON storage.objects
AS permissive
FOR DELETE
TO public
USING (
  bucket_id = 'files'::text AND 
  auth.uid() IS NOT NULL AND 
  name ~ (('^'::text || (auth.uid())::text) || '/'::text)
);

CREATE POLICY "Give users access to own folder 1m0cqf_1"
ON storage.objects
AS permissive
FOR UPDATE
TO public
USING (
  bucket_id = 'files'::text AND 
  auth.uid() IS NOT NULL AND 
  name ~ (('^'::text || (auth.uid())::text) || '/'::text)
);

CREATE POLICY "Give users access to own folder 1m0cqf_2"
ON storage.objects
AS permissive
FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'files'::text AND 
  auth.uid() IS NOT NULL AND 
  name ~ (('^'::text || (auth.uid())::text) || '/'::text)
);

CREATE POLICY "Give users access to own folder 1m0cqf_3"
ON storage.objects
AS permissive
FOR SELECT
TO public
USING (
  bucket_id = 'files'::text AND 
  auth.uid() IS NOT NULL AND 
  name ~ (('^'::text || (auth.uid())::text) || '/'::text)
); 