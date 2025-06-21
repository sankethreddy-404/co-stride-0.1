// Database Types
export interface Workspace {
  id: string;
  name: string;
  description?: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface Invitation {
  id: string;
  workspace_id: string;
  invited_email: string;
  invitation_token: string;
  status: "pending" | "accepted" | "declined" | "cancelled" | "expired";
  expires_at: string;
  created_at: string;
  workspaces?: Workspace;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  created_at: string;
}

export interface Post {
  id: string;
  text_content: string;
  user_id: string;
  workspace_id: string;
  created_at: string;
  updated_at: string;
  post_attachments?: PostAttachment[];
  ratings?: Rating[];
  workspace_comments?: Comment[];
}

export interface PostAttachment {
  id: string;
  post_id: string;
  attachment_type: string;
  filename: string;
  file_size?: number;
  file_url?: string;
  url?: string;
}

export interface Rating {
  id: string;
  post_id: string;
  user_id: string;
  rating_value: number;
  created_at: string;
}

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  comment_text: string;
  created_at: string;
}

export interface Summary {
  id: string;
  workspace_id: string;
  summary_text: string;
  summary_type: "daily" | "weekly" | "monthly";
  period_start: string;
  period_end: string;
  created_by: string;
  created_at: string;
}

// Analytics Types
export interface AnalyticsData {
  posts: Array<{ created_at: string; id: string }>;
  ratings: Array<{ rating_value: number; created_at: string; post_id: string }>;
  comments: Array<{ created_at: string; post_id: string }>;
}

export interface LeaderboardUser {
  userId: string;
  posts: number;
  totalRating: number;
  ratingCount: number;
  averageRating: string | number;
}

// API Response Types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface SentimentAnalysis {
  sentiment: "positive" | "neutral" | "negative";
  confidence: number;
  insights: string;
  recommendations: string[];
  themes?: string[];
  mood_indicators?: {
    positive_signals: string[];
    concerns: string[];
  };
}

// Generic Database type for Supabase client
export interface Database {
  public: {
    Tables: {
      [table: string]: {
        Row: Record<string, unknown>;
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
    };
  };
}
