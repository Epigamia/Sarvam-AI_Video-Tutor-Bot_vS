"use client";

import { useState, useCallback, useEffect } from "react";
import ChatArea, { ChatMessage } from "@/components/ChatArea";
import ChatInput from "@/components/ChatInput";

type Status = "loading" | "ready" | "error";

export default function Home() {
  const [status, setStatus] = useState<Status>("loading");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    fetch("/api/init", { method: "POST" })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setSessionId(data.sessionId);
        setStatus("ready");
      })
      .catch((err) => {
        setErrorMsg(err.message);
        setStatus("error");
      });
  }, []);

  const handleSend = useCallback(
    async (text: string) => {
      if (!sessionId || isTyping) return;

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
      setIsTyping(true);

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, message: text }),
        });

        if (!response.body) throw new Error("No response stream");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullContent = "";

        function extractContent(raw: string): string {
          // Remove complete <think>...</think> blocks
          let result = raw.replace(/<think>[\s\S]*?<\/think>/g, "");
          // If there's still an unclosed <think>, hide everything from it onwards (still thinking)
          const openIdx = result.indexOf("<think>");
          if (openIdx !== -1) result = result.substring(0, openIdx);
          return result.trim();
        }

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          for (const line of chunk.split("\n")) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            if (data === "[DONE]") continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                fullContent += parsed.content;
                const cleaned = extractContent(fullContent);
                setMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last?.role === "assistant") last.content = cleaned;
                  return updated;
                });
              }
            } catch {
              // skip unparseable lines
            }
          }
        }

        // After streaming ends, if content is still empty (e.g. model never closed <think>),
        // strip all think tags and show whatever text remains
        const finalContent = extractContent(fullContent);
        if (!finalContent && fullContent) {
          const fallback = fullContent.replace(/<\/?think>/g, "").trim();
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last?.role === "assistant") last.content = fallback;
            return updated;
          });
        }
      } catch (err) {
        console.error("Chat failed:", err);
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last?.role === "assistant") {
            last.content = "Sorry, something went wrong. Please try again.";
            last.isStreaming = false;
          }
          return updated;
        });
      } finally {
        setIsTyping(false);
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last?.role === "assistant") last.isStreaming = false;
          return updated;
        });
      }
    },
    [sessionId, isTyping]
  );

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-4 text-white">
        <svg className="w-10 h-10 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p className="text-gray-400 text-sm">Loading video transcript...</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-4 text-white p-6">
        <p className="text-red-400 text-center">Failed to load transcript: {errorMsg}</p>
        <button
          onClick={() => { setStatus("loading"); setErrorMsg(""); window.location.reload(); }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col h-screen">
      <header className="border-b border-gray-800 px-4 py-3 bg-gray-900 flex items-center gap-3">
        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-sm font-bold">3B</div>
        <div>
          <h1 className="text-base font-semibold">Neural Networks Tutor</h1>
          <p className="text-xs text-gray-500">3Blue1Brown · But what is a neural network?</p>
        </div>
      </header>

      <ChatArea messages={messages} />
      <ChatInput onSend={handleSend} disabled={isTyping} />
    </div>
  );
}
