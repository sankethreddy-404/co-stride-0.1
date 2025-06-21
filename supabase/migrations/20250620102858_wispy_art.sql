/*
  # Enhanced User Profiles and Notifications System

  1. New Tables
    - `user_profiles` - Extended user information and stats
    - `notifications` - System notifications for users
    - `user_preferences` - User notification and privacy preferences
    - `activity_logs` - Track user activities for analytics

  2. Security
    - Enable RLS on all new tables
    - Add policies for user access control
    - Secure notification system

  3. Features
    - User profile stats and achievements
    - Notification system for workspace activities
    - User preferences for notifications
    - Activity tracking for insights
*/

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  display_name text,
  bio text,
  avatar_url text,
  total_posts integer DEFAULT 0,
  total_ratings_given integer DEFAULT 0,
  total_ratings_received integer DEFAULT 0,
  average_rating_received numeric(3,2) DEFAULT 0,
  total_comments integer DEFAULT 0,
  workspaces_joined integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('post_rated', 'post_commented', 'workspace_invite', 'summary_generated', 'mention')),
  title text NOT NULL,
  message text NOT NULL,
  data jsonb DEFAULT '{}',
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create user_preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  email_notifications boolean DEFAULT true,
  push_notifications boolean DEFAULT true,
  notification_types jsonb DEFAULT '{"post_rated": true, "post_commented": true, "workspace_invite": true, "summary_generated": true, "mention": true}',
  privacy_settings jsonb DEFAULT '{"profile_visible": true, "stats_visible": true}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create activity_logs table
CREATE TABLE IF NOT EXISTS activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- User profiles policies
CREATE POLICY "Users can view public profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (authenticative.is_user_authenticated());

CREATE POLICY "Users can update their own profile"
  ON user_profiles
  FOR ALL
  TO authenticated
  USING (authenticative.is_user_authenticated() AND user_id = auth.uid());

-- Notifications policies
CREATE POLICY "Users can view their own notifications"
  ON notifications
  FOR SELECT
  TO authenticated
  USING (authenticative.is_user_authenticated() AND user_id = auth.uid());

CREATE POLICY "System can create notifications"
  ON notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update their own notifications"
  ON notifications
  FOR UPDATE
  TO authenticated
  USING (authenticative.is_user_authenticated() AND user_id = auth.uid());

-- User preferences policies
CREATE POLICY "Users can manage their own preferences"
  ON user_preferences
  FOR ALL
  TO authenticated
  USING (authenticative.is_user_authenticated() AND user_id = auth.uid());

-- Activity logs policies
CREATE POLICY "Users can view their own activity"
  ON activity_logs
  FOR SELECT
  TO authenticated
  USING (authenticative.is_user_authenticated() AND user_id = auth.uid());

CREATE POLICY "System can log activities"
  ON activity_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_workspace_id ON activity_logs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);

-- Create function to update user profile stats
CREATE OR REPLACE FUNCTION update_user_profile_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update profile stats based on the action
  IF TG_TABLE_NAME = 'posts' THEN
    IF TG_OP = 'INSERT' THEN
      INSERT INTO user_profiles (user_id, total_posts)
      VALUES (NEW.user_id, 1)
      ON CONFLICT (user_id)
      DO UPDATE SET 
        total_posts = user_profiles.total_posts + 1,
        updated_at = now();
    END IF;
  ELSIF TG_TABLE_NAME = 'ratings' THEN
    IF TG_OP = 'INSERT' THEN
      -- Update ratings given
      INSERT INTO user_profiles (user_id, total_ratings_given)
      VALUES (NEW.user_id, 1)
      ON CONFLICT (user_id)
      DO UPDATE SET 
        total_ratings_given = user_profiles.total_ratings_given + 1,
        updated_at = now();
      
      -- Update ratings received for post author
      UPDATE user_profiles 
      SET 
        total_ratings_received = total_ratings_received + 1,
        sum_of_ratings_received = sum_of_ratings_received + NEW.rating_value,
        average_rating_received = (sum_of_ratings_received / total_ratings_received)::numeric(3,2),
        updated_at = now()
      WHERE user_id = (SELECT user_id FROM posts WHERE id = NEW.post_id);
    END IF;
  ELSIF TG_TABLE_NAME = 'comments' THEN
    IF TG_OP = 'INSERT' THEN
      INSERT INTO user_profiles (user_id, total_comments)
      VALUES (NEW.user_id, 1)
      ON CONFLICT (user_id)
      DO UPDATE SET 
        total_comments = user_profiles.total_comments + 1,
        updated_at = now();
    END IF;
  ELSIF TG_TABLE_NAME = 'workspace_members' THEN
    IF TG_OP = 'INSERT' THEN
      INSERT INTO user_profiles (user_id, workspaces_joined)
      VALUES (NEW.user_id, 1)
      ON CONFLICT (user_id)
      DO UPDATE SET 
        workspaces_joined = user_profiles.workspaces_joined + 1,
        updated_at = now();
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic profile updates
CREATE TRIGGER update_profile_on_post
  AFTER INSERT ON posts
  FOR EACH ROW EXECUTE FUNCTION update_user_profile_stats();

CREATE TRIGGER update_profile_on_rating
  AFTER INSERT ON ratings
  FOR EACH ROW EXECUTE FUNCTION update_user_profile_stats();

CREATE TRIGGER update_profile_on_comment
  AFTER INSERT ON comments
  FOR EACH ROW EXECUTE FUNCTION update_user_profile_stats();

CREATE TRIGGER update_profile_on_workspace_join
  AFTER INSERT ON workspace_members
  FOR EACH ROW EXECUTE FUNCTION update_user_profile_stats();

-- Create function to create notifications
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id uuid,
  p_workspace_id uuid,
  p_type text,
  p_title text,
  p_message text,
  p_data jsonb DEFAULT '{}'
)
RETURNS uuid AS $$
DECLARE
  notification_id uuid;
BEGIN
  INSERT INTO notifications (user_id, workspace_id, type, title, message, data)
  VALUES (p_user_id, p_workspace_id, p_type, p_title, p_message, p_data)
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to log activities
CREATE OR REPLACE FUNCTION log_activity(
  p_user_id uuid,
  p_workspace_id uuid,
  p_action text,
  p_entity_type text,
  p_entity_id uuid,
  p_metadata jsonb DEFAULT '{}'
)
RETURNS uuid AS $$
DECLARE
  log_id uuid;
BEGIN
  INSERT INTO activity_logs (user_id, workspace_id, action, entity_type, entity_id, metadata)
  VALUES (p_user_id, p_workspace_id, p_action, p_entity_type, p_entity_id, p_metadata)
  RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$ LANGUAGE plpgsql;