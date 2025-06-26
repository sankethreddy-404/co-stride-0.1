"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Send, Loader2 } from "lucide-react";

interface ChatInputProps {
  newMessage: string;
  setNewMessage: (message: string) => void;
  sendMessage: (e: React.FormEvent) => void;
  sending: boolean;
  error: string;
}

export function ChatInput({
  newMessage,
  setNewMessage,
  sendMessage,
  sending,
  error,
}: ChatInputProps) {
  return (
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
        <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">Enter</kbd> to
        send,{" "}
        <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">
          Shift + Enter
        </kbd>{" "}
        for new line
      </div>
    </div>
  );
}
