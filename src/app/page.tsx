"use client";

import { useState, useCallback } from "react";
import VideoInput from "@/components/VideoInput";
import TranscriptionProgress from "@/components/TranscriptionProgress";
import ChatArea, { ChatMessage } from "@/components/ChatArea";
import ChatInput from "@/components/ChatInput";
import TranscriptSidebar from "@/components/TranscriptSidebar";

type Phase = "input" | "processing" | "chat";

export default function Home() {
  const [phase, setPhase] = useState<Phase>("input");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [transcript, setTranscript] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isAssistantTyping, setIsAssistantTyping] = useState(false);

  const [progressStatus, setProgressStatus] = useState("processing");
  const [progressMessage, setProgressMessage] = useState("Starting...");
  const [progressCurrent, setProgressCurrent] = useState(0);
  const [progressTotal, setProgressTotal] = useState(0);

  const handleProcessingStart = useCallback(
    async (reader: ReadableStreamDefaultReader<Uint8Array>) => {
      setPhase("processing");
      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value, { stream: true });
          const lines = text.split("\n");

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const data = JSON.parse(line.slice(6));

              switch (data.event) {
                case "session":
                  setSessionId(data.sessionId);
                  break;
                case "status":
                  setProgressStatus(data.status);
                  setProgressMessage(data.message);
                  break;
                case "progress":
                  setProgressCurrent(data.current);
                  setProgressTotal(data.total);
                  break;
                case "complete":
                  setTranscript(data.transcript);
                  setSessionId(data.sessionId);
                  setPhase("chat");
                  break;
                case "error":
                  alert(`Error: ${data.message}`);
                  setPhase("input");
                  break;
              }
            } catch {
              // skip unparseable
            }
          }
        }
      } catch (err) {
        console.error("Stream reading failed:", err);
        setPhase("input");
      }
    },
    []
  );

  async function handleSendMessage(text: string) {
    if (!sessionId || isAssistantTyping) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: text,
    };

    const assistantMsg: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: "",
      isStreaming: true,
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setIsAssistantTyping(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, message: text, transcript }),
      });

      if (!response.body) throw new Error("No response stream");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data);
            if (parsed.content) {
              fullContent += parsed.content;
              const cleaned = fullContent
                .replace(/<think>[\s\S]*?<\/think>/g, "")
                .replace(/<think>[\s\S]*/g, "")
                .trim();
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last.role === "assistant") {
                  last.content = cleaned;
                }
                return updated;
              });
            }
          } catch {
            // skip
          }
        }
      }

      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last.role === "assistant") {
          last.isStreaming = false;
        }
        return updated;
      });
    } catch (err) {
      console.error("Chat failed:", err);
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last.role === "assistant") {
          last.content = "Sorry, something went wrong. Please try again.";
          last.isStreaming = false;
        }
        return updated;
      });
    } finally {
      setIsAssistantTyping(false);
    }
  }

  function handleNewVideo() {
    setPhase("input");
    setSessionId(null);
    setTranscript("");
    setMessages([]);
    setProgressCurrent(0);
    setProgressTotal(0);
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {phase === "input" && (
        <div className="flex-1 flex items-center justify-center p-6">
          <VideoInput
            onProcessingStart={handleProcessingStart}
            disabled={false}
          />
        </div>
      )}

      {phase === "processing" && (
        <div className="flex-1 flex items-center justify-center p-6">
          <TranscriptionProgress
            status={progressStatus}
            message={progressMessage}
            current={progressCurrent}
            total={progressTotal}
          />
        </div>
      )}

      {phase === "chat" && (
        <div className="flex-1 flex flex-col h-screen">
          <header className="border-b border-gray-800 px-4 py-3 flex items-center justify-between bg-gray-900">
            <div>
              <h1 className="text-lg font-semibold">Video Tutor</h1>
              <p className="text-xs text-gray-500">
                Ask questions about your video
              </p>
            </div>
            <button
              onClick={handleNewVideo}
              className="text-sm text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded-lg transition-colors"
            >
              New Video
            </button>
          </header>

          <ChatArea messages={messages} />
          <ChatInput onSend={handleSendMessage} disabled={isAssistantTyping} />
          <TranscriptSidebar transcript={transcript} />
        </div>
      )}
    </div>
  );
}
