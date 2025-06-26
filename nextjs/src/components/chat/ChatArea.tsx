"use client";
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Brain, MessageSquare, Loader2, Bot } from "lucide-react";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";

interface ChatMessageData {
  id: string;
  sender_type: "user" | "ai" | "tool_call" | "tool_output";
  message_content: string;
  tool_name?: string;
  tool_args?: Record<string, unknown>;
  created_at: string;
}

interface ChatAreaProps {
  currentSessionId: string | null;
  messages: ChatMessageData[];
  sending: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  newMessage: string;
  setNewMessage: (message: string) => void;
  sendMessage: (e: React.FormEvent) => void;
  error: string;
}

export function ChatArea({
  currentSessionId,
  messages,
  sending,
  messagesEndRef,
  newMessage,
  setNewMessage,
  sendMessage,
  error,
}: ChatAreaProps) {
  return (
    <div className="flex-1 flex flex-col h-full">
      <Card className="flex-1 flex flex-col overflow-hidden">
        <div className="flex flex-col h-full">
          <CardContent className="flex-1 overflow-y-auto p-4">
            {messages.length === 0 && !currentSessionId ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Brain className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Welcome to AI Chat
                  </h3>
                  <p className="text-gray-500 mb-6 max-w-md">
                    Start a conversation to get insights about your work
                    progress, summarize your recent posts, and get AI-powered
                    assistance.
                  </p>
                </div>
              </div>
            ) : messages.length === 0 ? (
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
                {messages.map((message) => (
                  <ChatMessage key={message.id} message={message} />
                ))}
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
          <ChatInput
            newMessage={newMessage}
            setNewMessage={setNewMessage}
            sendMessage={sendMessage}
            sending={sending}
            error={error}
          />
        </div>
      </Card>
    </div>
  );
}
