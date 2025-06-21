-- Fix invitation system issues
-- 1. Add 'cancelled' status to invitations
-- 2. Increase default expiration time from 7 days to 30 days
-- 3. Add function to automatically mark expired invitations

-- Update the status check constraint to include 'cancelled'
ALTER TABLE invitations DROP CONSTRAINT IF EXISTS invitations_status_check;
ALTER TABLE invitations ADD CONSTRAINT invitations_status_check 
  CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled', 'expired'));

-- Update default expiration time to 30 days
ALTER TABLE invitations ALTER COLUMN expires_at SET DEFAULT (now() + interval '30 days');

-- Create function to automatically mark expired invitations
CREATE OR REPLACE FUNCTION mark_expired_invitations()
RETURNS void AS $$
BEGIN
  UPDATE invitations 
  SET status = 'expired' 
  WHERE status = 'pending' 
    AND expires_at < now();
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to run this function (if pg_cron is available)
-- Note: This requires pg_cron extension which may not be available in all environments
-- SELECT cron.schedule('mark-expired-invitations', '0 */6 * * *', 'SELECT mark_expired_invitations();');

-- Add index for better performance on expiration queries
CREATE INDEX IF NOT EXISTS idx_invitations_expires_at ON invitations(expires_at);
CREATE INDEX IF NOT EXISTS idx_invitations_status_expires ON invitations(status, expires_at); 