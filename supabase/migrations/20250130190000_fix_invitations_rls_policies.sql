-- Fix invitations table RLS policies to avoid auth.users table access issues
-- Remove problematic private function dependencies and avoid auth.users table reads

-- Drop existing problematic policies
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