"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useGlobal } from "@/lib/context/GlobalContext";
import { createSPASassClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";
import { SessionList } from "@/components/chat/SessionList";
import { ChatArea } from "@/components/chat/ChatArea";

interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface ChatMessage {
  id: string;
  session_id: string;
  sender_type: "user" | "ai" | "tool_call" | "tool_output";
  message_content: string;
  tool_name?: string;
  tool_args?: Record<string, unknown>;
  tool_output?: string;
  created_at: string;
}

export default function AIChatPage() {
  const { user } = useGlobal();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadSessions = useCallback(async () => {
    try {
      const supabase = await createSPASassClient();
      const { data, error } = await supabase.getChatSessions(user!.id);

      if (error) throw error;

      setSessions(data || []);
      return data;
    } catch (err) {
      console.error("Error loading sessions:", err);
      setError("Failed to load chat sessions");
    }
  }, [user]);

  useEffect(() => {
    if (user?.id) {
      const initialLoad = async () => {
        setLoading(true);
        const data = await loadSessions();
        if (currentSessionId === null && data && data.length > 0) {
          setCurrentSessionId(data[0].id);
        }
        setLoading(false);
      };
      initialLoad();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (currentSessionId) {
      loadMessages(currentSessionId);
    }
  }, [currentSessionId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadMessages = async (sessionId: string) => {
    try {
      const supabase = await createSPASassClient();
      const { data, error } = await supabase.getChatMessages(sessionId);

      if (error) throw error;
      setMessages(data || []);
    } catch (err) {
      console.error("Error loading messages:", err);
      setError("Failed to load messages");
    }
  };

  const createNewSession = () => {
    setCurrentSessionId(null);
    setMessages([]);
    setError("");
  };

  const deleteSession = async (sessionId: string) => {
    try {
      setError("");
      const supabase = await createSPASassClient();
      const { error } = await supabase.deleteChatSession(sessionId);

      if (error) throw error;

      setSessions(sessions.filter((s) => s.id !== sessionId));

      if (currentSessionId === sessionId) {
        const remainingSessions = sessions.filter((s) => s.id !== sessionId);
        setCurrentSessionId(
          remainingSessions.length > 0 ? remainingSessions[0].id : null
        );
        setMessages([]);
      }
    } catch (err) {
      console.error("Error deleting session:", err);
      setError("Failed to delete session");
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    const messageText = newMessage.trim();
    setNewMessage("");
    setSending(true);
    setError("");

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId: currentSessionId,
          message: messageText,
          createNewSession: !currentSessionId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("API Error:", data);
        throw new Error(data.details || data.error || "Failed to send message");
      }

      if (!currentSessionId && data.sessionId) {
        setCurrentSessionId(data.sessionId);
        await loadSessions();
      }

      if (data.sessionId) {
        await loadMessages(data.sessionId);
      }
    } catch (err) {
      console.error("Error sending message:", err);
      setError(
        `Failed to send message: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
      setNewMessage(messageText);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-6 p-6">
      <SessionList
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelectSession={setCurrentSessionId}
        onCreateNewSession={createNewSession}
        onDeleteSession={deleteSession}
      />
      <ChatArea
        currentSessionId={currentSessionId}
        messages={messages}
        sending={sending}
        messagesEndRef={messagesEndRef as React.RefObject<HTMLDivElement>}
        newMessage={newMessage}
        setNewMessage={setNewMessage}
        sendMessage={sendMessage}
        error={error}
      />
    </div>
  );
}
