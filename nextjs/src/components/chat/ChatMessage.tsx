"use client";
import React from "react";
import { User, Bot, Wrench } from "lucide-react";

interface ChatMessage {
  id: string;
  sender_type: "user" | "ai" | "tool_call" | "tool_output";
  message_content: string;
  tool_name?: string;
  tool_args?: Record<string, unknown>;
  created_at: string;
}

interface ChatMessageProps {
  message: ChatMessage;
}

function formatTimestamp(timestamp: string) {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ChatMessage({ message }: ChatMessageProps) {
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
}
