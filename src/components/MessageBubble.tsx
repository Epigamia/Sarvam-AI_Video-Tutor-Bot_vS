"use client";

import { useState, useRef } from "react";

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
}

export default function MessageBubble({ role, content, isStreaming }: MessageBubbleProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [ttsError, setTtsError] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  async function handleTTS() {
    if (!content) return;

    // If already playing, stop it
    if (isPlaying) {
      audioRef.current?.pause();
      audioRef.current = null;
      setIsPlaying(false);
      return;
    }

    setIsPlaying(true);
    setTtsError("");

    try {
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: content }),
      });

      const data = await response.json();
      if (data.error) {
        console.error("TTS error:", data.error);
        setTtsError(data.error);
        setIsPlaying(false);
        return;
      }
      if (data.audio) {
        const audio = new Audio(`data:audio/wav;base64,${data.audio}`);
        audioRef.current = audio;
        audio.onended = () => { setIsPlaying(false); audioRef.current = null; };
        audio.onerror = (e) => {
          console.error("Audio playback error:", e);
          setIsPlaying(false);
          audioRef.current = null;
        };
        await audio.play();
      } else {
        console.error("No audio in TTS response:", data);
        setIsPlaying(false);
      }
    } catch (err) {
      console.error("TTS fetch failed:", err);
      setTtsError(err instanceof Error ? err.message : "TTS failed");
      setIsPlaying(false);
    }
  }

  const isUser = role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
          isUser
            ? "bg-blue-600 text-white"
            : "bg-gray-800 text-gray-100 border border-gray-700"
        }`}
      >
        {!isUser && (
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-blue-400">Tutor</span>
          </div>
        )}

        <p className="whitespace-pre-wrap text-sm leading-relaxed">
          {content}
          {isStreaming && (
            <span className="inline-block w-1.5 h-4 bg-blue-400 animate-pulse ml-0.5 align-text-bottom" />
          )}
        </p>

        {!isUser && content && !isStreaming && (
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={handleTTS}
              className="text-gray-500 hover:text-blue-400 transition-colors"
              title={isPlaying ? "Stop" : "Listen to response"}
            >
              {isPlaying ? (
                <svg className="w-4 h-4 animate-pulse" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                </svg>
              )}
            </button>
            {ttsError && (
              <span className="text-xs text-red-400">{ttsError}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
