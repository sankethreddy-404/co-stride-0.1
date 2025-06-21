"use client";

import React, { useState, useEffect } from "react";
import { useGlobal } from "@/lib/context/GlobalContext";
import { createSPASassClient } from "@/lib/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  User,
  Star,
  MessageSquare,
  Users,
  Trophy,
  Activity,
  Loader2,
  AlertCircle,
  CheckCircle,
  Edit,
} from "lucide-react";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

interface UserProfile {
  id: string;
  user_id: string;
  display_name: string | null;
  bio: string | null;
  total_posts: number;
  average_rating_received: number;
  total_comments: number;
  workspaces_joined: number;
  total_ratings_given: number;
  total_ratings_received: number;
  created_at: string;
  updated_at: string;
}

interface ActivityLog {
  id: string;
  user_id: string;
  activity_type: string;
  action: string;
  entity_type: string;
  description: string;
  created_at: string;
}

export default function ProfilePage() {
  const { user } = useGlobal();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");

  // Form state
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");

  useEffect(() => {
    if (user?.id) {
      loadProfileData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const loadProfileData = async () => {
    try {
      setLoading(true);
      const supabase = await createSPASassClient();

      // Load user profile
      const { data: profileData, error: profileError } = await supabase
        .getSupabaseClient()
        .from("user_profiles")
        .select("*")
        .eq("user_id", user!.id)
        .single();

      if (profileError && profileError.code !== "PGRST116") {
        throw profileError;
      }

      if (profileData) {
        setProfile(profileData);
        setDisplayName(profileData.display_name || "");
        setBio(profileData.bio || "");
      } else {
        // Create default profile
        const { data: newProfile, error: createError } = await supabase
          .getSupabaseClient()
          .from("user_profiles")
          .insert({ user_id: user!.id })
          .select()
          .single();

        if (createError) throw createError;
        setProfile(newProfile);
      }

      // Load recent activities
      const { data: activitiesData, error: activitiesError } = await supabase
        .getSupabaseClient()
        .from("activity_logs")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (activitiesError) throw activitiesError;
      setActivities(activitiesData || []);
    } catch (err) {
      setError("Failed to load profile data");
      console.error("Error loading profile:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      setError("");

      const supabase = await createSPASassClient();
      const { error } = await supabase
        .getSupabaseClient()
        .from("user_profiles")
        .update({
          display_name: displayName.trim() || null,
          bio: bio.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user!.id);

      if (error) throw error;

      setSuccess("Profile updated successfully");
      setEditing(false);
      await loadProfileData();
    } catch (err) {
      setError("Failed to update profile");
      console.error("Error updating profile:", err);
    } finally {
      setSaving(false);
    }
  };

  const getActivityData = () => {
    if (!activities.length) return [];

    // Group activities by date for the last 7 days
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toISOString().split("T")[0];
    }).reverse();

    return last7Days.map((date) => {
      const dayActivities = activities.filter(
        (activity) => activity.created_at.split("T")[0] === date
      );

      return {
        date: new Date(date).toLocaleDateString("en-US", { weekday: "short" }),
        activities: dayActivities.length,
      };
    });
  };

  const getAchievements = () => {
    if (!profile) return [];

    const achievements = [];

    if (profile.total_posts >= 10) {
      achievements.push({
        name: "Prolific Poster",
        description: "10+ posts shared",
        icon: "📝",
      });
    }
    if (profile.average_rating_received >= 4.5) {
      achievements.push({
        name: "High Quality",
        description: "4.5+ average rating",
        icon: "⭐",
      });
    }
    if (profile.total_comments >= 50) {
      achievements.push({
        name: "Great Collaborator",
        description: "50+ comments made",
        icon: "💬",
      });
    }
    if (profile.workspaces_joined >= 3) {
      achievements.push({
        name: "Team Player",
        description: "3+ workspaces joined",
        icon: "👥",
      });
    }
    if (profile.total_ratings_given >= 25) {
      achievements.push({
        name: "Helpful Reviewer",
        description: "25+ ratings given",
        icon: "🎯",
      });
    }

    return achievements;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  const activityChartData = getActivityData();
  const achievements = getAchievements();

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>
          <p className="text-muted-foreground">
            Your progress, achievements, and activity overview
          </p>
        </div>
        <Button
          onClick={() => setEditing(!editing)}
          variant="outline"
          className="flex items-center gap-2"
        >
          <Edit className="h-4 w-4" />
          {editing ? "Cancel" : "Edit Profile"}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Profile Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {editing ? (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Display Name</label>
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Enter your display name"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Bio</label>
                <Textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell us about yourself..."
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="bg-primary-600 text-white hover:bg-primary-700"
                >
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
                <Button onClick={() => setEditing(false)} variant="outline">
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Email
                </label>
                <p className="mt-1">{user?.email}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Display Name
                </label>
                <p className="mt-1">{profile?.display_name || "Not set"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Bio</label>
                <p className="mt-1">{profile?.bio || "No bio added yet"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Member Since
                </label>
                <p className="mt-1">
                  {profile?.created_at
                    ? new Date(profile.created_at).toLocaleDateString()
                    : "Unknown"}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Posts</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {profile?.total_posts || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Progress updates shared
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Average Rating
            </CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {profile?.average_rating_received
                ? Number(profile.average_rating_received).toFixed(1)
                : "0.0"}
              /5
            </div>
            <p className="text-xs text-muted-foreground">
              From {profile?.total_ratings_received || 0} ratings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Comments</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {profile?.total_comments || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Discussions participated
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Workspaces</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {profile?.workspaces_joined || 0}
            </div>
            <p className="text-xs text-muted-foreground">Teams joined</p>
          </CardContent>
        </Card>
      </div>

      {/* Activity Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Overview</CardTitle>
          <p className="text-sm text-muted-foreground">
            Your activity over the last 7 days
          </p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={activityChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="activities" fill="#0284c7" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Achievements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Achievements
          </CardTitle>
        </CardHeader>
        <CardContent>
          {achievements.length === 0 ? (
            <div className="text-center py-8">
              <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No achievements yet</p>
              <p className="text-sm text-gray-400">
                Keep posting and collaborating to unlock achievements!
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {achievements.map((achievement, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-4 border rounded-lg"
                >
                  <div className="text-2xl">{achievement.icon}</div>
                  <div>
                    <h3 className="font-medium">{achievement.name}</h3>
                    <p className="text-sm text-gray-500">
                      {achievement.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {activities.length === 0 ? (
            <p className="text-center text-gray-500 py-4">No recent activity</p>
          ) : (
            <div className="space-y-3">
              {activities.slice(0, 10).map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <p className="font-medium capitalize">
                      {activity.action.replace("_", " ")}
                    </p>
                    <p className="text-sm text-gray-500 capitalize">
                      {activity.entity_type}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(activity.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
