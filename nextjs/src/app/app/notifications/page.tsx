"use client";

import React, { useState, useEffect } from "react";
import { useGlobal } from "@/lib/context/GlobalContext";
import { createSPASassClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Bell,
  BellOff,
  Star,
  MessageSquare,
  Users,
  Brain,
  AtSign,
  Check,
  CheckCheck,
  Loader2,
  AlertCircle,
  Settings,
} from "lucide-react";
import Link from "next/link";

interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

interface UserPreferences {
  id: string;
  user_id: string;
  email_notifications: boolean;
  push_notifications: boolean;
}

export default function NotificationsPage() {
  const { user } = useGlobal();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [markingRead, setMarkingRead] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      loadNotifications();
      loadPreferences();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const supabase = await createSPASassClient();
      const { data, error } = await supabase
        .getSupabaseClient()
        .from("notifications")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setNotifications(data || []);
    } catch (err) {
      setError("Failed to load notifications");
      console.error("Error loading notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadPreferences = async () => {
    try {
      const supabase = await createSPASassClient();
      const { data, error } = await supabase
        .getSupabaseClient()
        .from("user_preferences")
        .select("*")
        .eq("user_id", user!.id)
        .single();

      if (error && error.code !== "PGRST116") throw error;

      if (data) {
        setPreferences(data);
      } else {
        // Create default preferences
        const { data: newPrefs, error: createError } = await supabase
          .getSupabaseClient()
          .from("user_preferences")
          .insert({ user_id: user!.id })
          .select()
          .single();

        if (createError) throw createError;
        setPreferences(newPrefs);
      }
    } catch (err) {
      console.error("Error loading preferences:", err);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      setMarkingRead(notificationId);
      const supabase = await createSPASassClient();
      const { error } = await supabase
        .getSupabaseClient()
        .from("notifications")
        .update({ read: true })
        .eq("id", notificationId);

      if (error) throw error;

      setNotifications(
        notifications.map((n) =>
          n.id === notificationId ? { ...n, read: true } : n
        )
      );
    } catch (err) {
      console.error("Error marking notification as read:", err);
    } finally {
      setMarkingRead(null);
    }
  };

  const markAllAsRead = async () => {
    try {
      const supabase = await createSPASassClient();
      const { error } = await supabase
        .getSupabaseClient()
        .from("notifications")
        .update({ read: true })
        .eq("user_id", user!.id)
        .eq("read", false);

      if (error) throw error;

      setNotifications(notifications.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.error("Error marking all notifications as read:", err);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "post_rated":
        return <Star className="h-5 w-5 text-yellow-500" />;
      case "post_commented":
        return <MessageSquare className="h-5 w-5 text-blue-500" />;
      case "workspace_invite":
        return <Users className="h-5 w-5 text-green-500" />;
      case "summary_generated":
        return <Brain className="h-5 w-5 text-purple-500" />;
      case "mention":
        return <AtSign className="h-5 w-5 text-orange-500" />;
      default:
        return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground">
            Stay updated with your team&apos;s activity
            {unreadCount > 0 && (
              <span className="ml-2 px-2 py-1 text-xs bg-primary-100 text-primary-700 rounded-full">
                {unreadCount} unread
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <Button
              onClick={markAllAsRead}
              variant="outline"
              className="flex items-center gap-2"
            >
              <CheckCheck className="h-4 w-4" />
              Mark All Read
            </Button>
          )}
          <Link href="/app/settings">
            <Button variant="outline" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </Button>
          </Link>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Notifications List */}
      <Card>
        <CardContent className="p-0">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <BellOff className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No notifications
              </h3>
              <p className="text-gray-500 text-center">
                You&apos;re all caught up! New notifications will appear here.
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-gray-50 transition-colors ${
                    !notification.read
                      ? "bg-blue-50 border-l-4 border-l-blue-500"
                      : ""
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="flex-shrink-0 mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-gray-900">
                          {notification.title}
                        </h4>
                        <p className="text-sm text-gray-600 mt-1">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-400 mt-2">
                          {new Date(notification.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {!notification.read && (
                        <Button
                          onClick={() => markAsRead(notification.id)}
                          disabled={markingRead === notification.id}
                          variant="ghost"
                          size="sm"
                          className="text-blue-600 hover:text-blue-700"
                        >
                          {markingRead === notification.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
