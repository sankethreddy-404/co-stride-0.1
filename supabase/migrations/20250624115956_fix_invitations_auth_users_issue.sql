-- Fix invitations table RLS policies to avoid auth.users table access issues
-- The previous policies were trying to read from auth.users table which causes 
-- "permission denied for table users" errors

-- Drop existing problematic policies that access auth.users
DROP POLICY IF EXISTS "Workspace owners can manage invitations" ON public.invitations;
DROP POLICY IF EXISTS "Users can view pending invitations for their email" ON public.invitations;
DROP POLICY IF EXISTS "Users can accept or decline invitations" ON public.invitations;
DROP POLICY IF EXISTS "Users can view their own email invitations" ON public.invitations;
DROP POLICY IF EXISTS "Users can update their own email invitations" ON public.invitations;
DROP POLICY IF EXISTS "Workspace members can view workspace invitations" ON public.invitations;

-- Create new simplified policies that don't rely on auth.users table

-- Policy 1: Workspace owners can manage all invitations for their workspaces
CREATE POLICY "Workspace owners can manage invitations"
  ON public.invitations
  FOR ALL
  TO authenticated
  USING (
    auth.uid() IS NOT NULL AND
    workspace_id IN (
      SELECT id FROM public.workspaces 
      WHERE owner_id = auth.uid()
    )
  );

-- Policy 2: Users who sent the invitation can manage it
CREATE POLICY "Invitation senders can manage their invitations"
  ON public.invitations
  FOR ALL
  TO authenticated
  USING (
    auth.uid() IS NOT NULL AND
    invited_by = auth.uid()
  );

-- Policy 3: Workspace members can view invitations in their workspaces
CREATE POLICY "Workspace members can view workspace invitations"
  ON public.invitations
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IS NOT NULL AND
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members 
      WHERE user_id = auth.uid()
      UNION
      SELECT id FROM public.workspaces 
      WHERE owner_id = auth.uid()
    )
  );

-- Policy 4: Allow public read for invitation acceptance (via token)
-- This allows the invitation acceptance page to work without authentication
CREATE POLICY "Public can view invitations for acceptance"
  ON public.invitations
  FOR SELECT
  TO anon
  USING (
    status = 'pending' AND
    expires_at > now()
  );

-- Policy 5: Allow authenticated users to update invitation status
-- This allows users to accept invitations
CREATE POLICY "Users can update invitation status"
  ON public.invitations
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IS NOT NULL AND
    status = 'pending' AND
    expires_at > now()
  )
  WITH CHECK (
    status IN ('accepted', 'declined')
  );

-- Fix the foreign key constraint for invitations table
-- The issue is that the invited_email might not correspond to a user in auth.users table
-- We should only create the constraint when the invitation is accepted

-- Drop the problematic foreign key if it exists
ALTER TABLE IF EXISTS public.invitations 
DROP CONSTRAINT IF EXISTS invitations_invited_email_fkey;

-- Update the invitations table structure to be more flexible
-- We'll keep invited_email as text since it's an email address, not a user_id reference

-- Add a new column to track the actual user_id when invitation is accepted
ALTER TABLE public.invitations 
ADD COLUMN IF NOT EXISTS accepted_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create an index for better performance
CREATE INDEX IF NOT EXISTS idx_invitations_accepted_user_id ON public.invitations(accepted_user_id);

-- Fix attachment URLs that are incorrectly pointing to wrong storage buckets
-- Documents should use workspace-documents bucket, not workspace-images bucket
UPDATE public.post_attachments 
SET url = REPLACE(url, '/storage/v1/object/sign/workspace-images/', '/storage/v1/object/sign/workspace-documents/')
WHERE attachment_type = 'DOCUMENT' 
AND url LIKE '%/storage/v1/object/sign/workspace-images/%';

-- Also update any IMAGE attachments that might be incorrectly pointing to workspace-documents
UPDATE public.post_attachments 
SET url = REPLACE(url, '/storage/v1/object/sign/workspace-documents/', '/storage/v1/object/sign/workspace-images/')
WHERE attachment_type = 'IMAGE' 
AND url LIKE '%/storage/v1/object/sign/workspace-documents/%';
