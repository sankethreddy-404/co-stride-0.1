"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useGlobal } from "@/lib/context/GlobalContext";
import { createSPASassClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Brain,
  Send,
  MessageSquare,
  Plus,
  Loader2,
  User,
  Bot,
  Wrench,
  Trash2,
  BarChart3,
} from "lucide-react";

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
      setLoading(true);
      const supabase = await createSPASassClient();
      const { data, error } = await supabase.getChatSessions(user!.id);

      if (error) throw error;

      setSessions(data || []);

      // Auto-select the most recent session if we don't have one selected
      if (!currentSessionId && data && data.length > 0) {
        setCurrentSessionId(data[0].id);
      }
    } catch (err) {
      console.error("Error loading sessions:", err);
      setError("Failed to load chat sessions");
    } finally {
      setLoading(false);
    }
  }, [user, currentSessionId]);

  useEffect(() => {
    if (user?.id) {
      loadSessions();
    }
  }, [user?.id, loadSessions]);

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

  const createNewSession = async () => {
    try {
      setError("");
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: "Hello! I'd like to start a new conversation.",
          createNewSession: true,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("API Error:", data);
        throw new Error(
          data.details || data.error || "Failed to create new session"
        );
      }

      // Reload sessions and select the new one
      await loadSessions();
      setCurrentSessionId(data.sessionId);
    } catch (err) {
      console.error("Error creating session:", err);
      setError("Failed to create new session");
    }
  };

  const deleteSession = async (sessionId: string) => {
    try {
      setError("");
      const supabase = await createSPASassClient();
      const { error } = await supabase.deleteChatSession(sessionId);

      if (error) throw error;

      // Remove from local state
      setSessions(sessions.filter((s) => s.id !== sessionId));

      // If we deleted the current session, select another one or clear
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

      // Update current session if a new one was created
      if (!currentSessionId && data.sessionId) {
        setCurrentSessionId(data.sessionId);
        await loadSessions(); // Reload to get the new session in the list
      }

      // Reload messages to get the latest conversation
      if (data.sessionId) {
        await loadMessages(data.sessionId);
      }
    } catch (err) {
      console.error("Error sending message:", err);
      setError(
        `Failed to send message: ${err instanceof Error ? err.message : String(err)}`
      );
      setNewMessage(messageText); // Restore the message
    } finally {
      setSending(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderMessage = (message: ChatMessage) => {
    const isUser = message.sender_type === "user";
    const isToolCall = message.sender_type === "tool_call";
    const isToolOutput = message.sender_type === "tool_output";

    return (
      <div
        key={message.id}
        className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}
      >
        <div
          className={`flex gap-3 max-w-[80%] ${
            isUser ? "flex-row-reverse" : "flex-row"
          }`}
        >
          <div
            className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
              isUser
                ? "bg-primary-600 text-white"
                : isToolCall || isToolOutput
                  ? "bg-purple-600 text-white"
                  : "bg-gray-600 text-white"
            }`}
          >
            {isUser ? (
              <User className="w-4 h-4" />
            ) : isToolCall || isToolOutput ? (
              <Wrench className="w-4 h-4" />
            ) : (
              <Bot className="w-4 h-4" />
            )}
          </div>

          <div
            className={`rounded-lg px-4 py-2 ${
              isUser
                ? "bg-primary-600 text-white"
                : isToolCall
                  ? "bg-purple-100 border border-purple-200"
                  : isToolOutput
                    ? "bg-yellow-50 border border-yellow-200"
                    : "bg-gray-100 border border-gray-200"
            }`}
          >
            <div className="text-sm leading-relaxed whitespace-pre-wrap">
              {message.message_content}
            </div>

            {isToolCall && message.tool_name && (
              <div className="mt-2 pt-2 border-t border-purple-200">
                <div className="text-xs text-purple-700 font-medium">
                  Tool: {message.tool_name}
                </div>
                {message.tool_args && (
                  <div className="text-xs text-purple-600 mt-1">
                    Args: {JSON.stringify(message.tool_args)}
                  </div>
                )}
              </div>
            )}

            <div
              className={`text-xs mt-2 opacity-70 ${
                isUser ? "text-white" : "text-gray-500"
              }`}
            >
              {formatTimestamp(message.created_at)}
            </div>
          </div>
        </div>
      </div>
    );
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
      {/* Sessions Sidebar */}
      <div className="w-80 flex flex-col">
        <Card className="flex-1 flex flex-col">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Brain className="h-5 w-5" />
                AI Chat
              </h2>
              <Button
                onClick={createNewSession}
                size="sm"
                className="bg-primary-600 text-white hover:bg-primary-700"
              >
                <Plus className="h-4 w-4 mr-1" />
                New
              </Button>
            </div>

            <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="h-4 w-4 text-blue-600" />
                <span className="font-medium text-blue-800">
                  Available Tool:
                </span>
              </div>
              <p className="text-blue-700">
                <strong>Summarize Posts</strong> - Ask me to summarize your
                recent work and progress updates from your workspaces.
              </p>
            </div>
          </div>

          <CardContent className="flex-1 p-0 overflow-y-auto">
            {sessions.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No conversations yet</p>
                <p className="text-sm">Start a new chat to begin</p>
              </div>
            ) : (
              <div className="p-2">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer mb-2 transition-colors ${
                      currentSessionId === session.id
                        ? "bg-primary-50 border border-primary-200"
                        : "hover:bg-gray-50"
                    }`}
                    onClick={() => setCurrentSessionId(session.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm truncate">
                        {session.title}
                      </h3>
                      <p className="text-xs text-gray-500">
                        {new Date(session.updated_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteSession(session.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        <Card className="flex-1 flex flex-col">
          {!currentSessionId ? (
            <CardContent className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Brain className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Welcome to AI Chat
                </h3>
                <p className="text-gray-500 mb-6 max-w-md">
                  Start a conversation to get insights about your work progress,
                  summarize your recent posts, and get AI-powered assistance.
                </p>
                <Button
                  onClick={createNewSession}
                  className="bg-primary-600 text-white hover:bg-primary-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Start New Conversation
                </Button>
              </div>
            </CardContent>
          ) : (
            <>
              {/* Messages Area */}
              <CardContent className="flex-1 overflow-y-auto p-4">
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                      <p className="text-gray-500">
                        No messages yet. Start the conversation!
                      </p>
                    </div>
                  </div>
                ) : (
                  <div>
                    {messages.map((message) => renderMessage(message))}
                    {sending && (
                      <div className="flex justify-start mb-4">
                        <div className="flex gap-3">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-600 text-white flex items-center justify-center">
                            <Bot className="w-4 h-4" />
                          </div>
                          <div className="bg-gray-100 border border-gray-200 rounded-lg px-4 py-2">
                            <div className="flex items-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span className="text-sm text-gray-600">
                                Thinking...
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </CardContent>

              {/* Input Area */}
              <div className="border-t p-4">
                {error && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <form onSubmit={sendMessage} className="flex gap-3">
                  <Textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Ask me to summarize your posts, or anything else..."
                    rows={3}
                    className="flex-1 resize-none"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage(e);
                      }
                    }}
                  />
                  <Button
                    type="submit"
                    disabled={!newMessage.trim() || sending}
                    className="self-end bg-primary-600 text-white hover:bg-primary-700"
                  >
                    {sending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </form>

                <div className="mt-2 text-xs text-gray-500">
                  <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">
                    Enter
                  </kbd>{" "}
                  to send,{" "}
                  <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">
                    Shift + Enter
                  </kbd>{" "}
                  for new line
                </div>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
