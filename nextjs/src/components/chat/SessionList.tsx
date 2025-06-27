"use client";
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Brain, Plus, MessageSquare, Trash2, BarChart3 } from "lucide-react";

interface ChatSession {
  id: string;
  title: string;
  updated_at: string;
}

interface SessionListProps {
  sessions: ChatSession[];
  currentSessionId: string | null;
  onSelectSession: (id: string) => void;
  onCreateNewSession: () => void;
  onDeleteSession: (id: string) => void;
}

export function SessionList({
  sessions,
  currentSessionId,
  onSelectSession,
  onCreateNewSession,
  onDeleteSession,
}: SessionListProps) {
  return (
    <div className="w-80 flex flex-col h-full">
      <Card className="flex-1 flex flex-col min-h-0">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Brain className="h-5 w-5" />
              AI Chat
            </h2>
            <Button
              onClick={onCreateNewSession}
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
              <span className="font-medium text-blue-800">Available Tool:</span>
            </div>
            <p className="text-blue-700">
              <strong>Summarize Posts</strong> - Ask me to summarize your recent
              work and progress updates from your workspaces.
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
                  onClick={() => onSelectSession(session.id)}
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
                      onDeleteSession(session.id);
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
  );
}