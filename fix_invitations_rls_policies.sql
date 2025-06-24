-- Fix invitations table RLS policies to be consistent with other tables
-- Remove problematic private function dependencies and use direct auth.uid() checks

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Workspace owners can manage invitations" ON public.invitations;
DROP POLICY IF EXISTS "Users can view pending invitations for their email" ON public.invitations;
DROP POLICY IF EXISTS "Users can accept or decline invitations" ON public.invitations;

-- Create new simplified policies following the same pattern as other fixed tables

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

-- Policy 2: Users can view invitations sent to their email address
CREATE POLICY "Users can view their own email invitations"
  ON public.invitations
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IS NOT NULL AND
    invited_email = (
      SELECT email FROM auth.users 
      WHERE id = auth.uid()
    )
  );

-- Policy 3: Users can update invitations sent to their email (for accepting/declining)
CREATE POLICY "Users can update their own email invitations"
  ON public.invitations
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IS NOT NULL AND
    invited_email = (
      SELECT email FROM auth.users 
      WHERE id = auth.uid()
    ) AND
    status = 'pending'
  )
  WITH CHECK (
    status IN ('accepted', 'declined')
  );

-- Policy 4: Workspace members can view invitations in their workspaces (for settings page)
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