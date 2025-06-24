/*
  # Fix Chat Tables Foreign Key References
  
  The chat tables were created with foreign keys referencing auth.users(id) 
  but the existing schema pattern uses users(id). This migration fixes the
  foreign key references to match the existing pattern.
*/

-- First, drop the existing foreign key constraints if they exist
ALTER TABLE IF EXISTS chat_sessions 
  DROP CONSTRAINT IF EXISTS chat_sessions_user_id_fkey;

ALTER TABLE IF EXISTS chat_messages 
  DROP CONSTRAINT IF EXISTS chat_messages_user_id_fkey,
  DROP CONSTRAINT IF EXISTS chat_messages_session_id_fkey;

-- Update the foreign key constraints to reference users(id) instead of auth.users(id)
-- This matches the pattern used by other tables in the schema
ALTER TABLE chat_sessions 
  ADD CONSTRAINT chat_sessions_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE chat_messages 
  ADD CONSTRAINT chat_messages_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE chat_messages 
  ADD CONSTRAINT chat_messages_session_id_fkey 
  FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE;

-- Update RLS policies to use the uid() function consistently (like other tables)
DROP POLICY IF EXISTS "Users can manage their own chat sessions" ON chat_sessions;
DROP POLICY IF EXISTS "Users can view their own chat messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can create their own chat messages" ON chat_messages;

-- Create simplified policies using uid() function
CREATE POLICY "Users can manage their own chat sessions"
  ON chat_sessions
  FOR ALL
  TO authenticated
  USING (uid() IS NOT NULL AND user_id = uid())
  WITH CHECK (uid() IS NOT NULL AND user_id = uid());

CREATE POLICY "Users can view their own chat messages"
  ON chat_messages
  FOR SELECT
  TO authenticated
  USING (uid() IS NOT NULL AND user_id = uid());

CREATE POLICY "Users can create their own chat messages"
  ON chat_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    uid() IS NOT NULL AND 
    user_id = uid() AND
    session_id IN (SELECT id FROM chat_sessions WHERE user_id = uid())
  );