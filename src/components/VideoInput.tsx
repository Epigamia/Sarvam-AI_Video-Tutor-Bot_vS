"use client";

import { useState, useRef, DragEvent } from "react";

interface VideoInputProps {
  onProcessingStart: (
    reader: ReadableStreamDefaultReader<Uint8Array>
  ) => void;
  disabled: boolean;
}

export default function VideoInput({ onProcessingStart, disabled }: VideoInputProps) {
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileUpload(file: File) {
    setError("");
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.body) throw new Error("No response stream");
      onProcessingStart(response.body.getReader());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    }
  }

  async function handleYouTubeSubmit() {
    if (!youtubeUrl.trim()) return;
    setError("");

    try {
      const response = await fetch("/api/youtube", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: youtubeUrl.trim() }),
      });

      if (!response.body) throw new Error("No response stream");
      onProcessingStart(response.body.getReader());
    } catch (err) {
      setError(err instanceof Error ? err.message : "YouTube processing failed");
    }
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("video/")) {
      handleFileUpload(file);
    } else {
      setError("Please drop a video file");
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Video Tutor Bot</h1>
        <p className="text-gray-400">
          Upload a video or paste a YouTube URL to start learning
        </p>
      </div>

      <div
        className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer ${
          isDragging
            ? "border-blue-500 bg-blue-500/10"
            : "border-gray-600 hover:border-gray-500 bg-gray-800/50"
        } ${disabled ? "opacity-50 pointer-events-none" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <svg
          className="w-12 h-12 mx-auto mb-4 text-gray-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
          />
        </svg>
        <p className="text-gray-300 mb-1">
          Drag & drop a video file here, or click to browse
        </p>
        <p className="text-gray-500 text-sm">MP4, MOV, AVI, WebM supported</p>
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={handleFileChange}
          disabled={disabled}
        />
      </div>

      <div className="flex items-center gap-4">
        <div className="flex-1 h-px bg-gray-700" />
        <span className="text-gray-500 text-sm">OR</span>
        <div className="flex-1 h-px bg-gray-700" />
      </div>

      <div className="flex gap-3">
        <input
          type="text"
          placeholder="Paste YouTube URL here..."
          value={youtubeUrl}
          onChange={(e) => setYoutubeUrl(e.target.value)}
          disabled={disabled}
          className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 disabled:opacity-50"
          onKeyDown={(e) => e.key === "Enter" && handleYouTubeSubmit()}
        />
        <button
          onClick={handleYouTubeSubmit}
          disabled={disabled || !youtubeUrl.trim()}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white px-6 py-3 rounded-lg font-medium transition-colors"
        >
          Load
        </button>
      </div>

      {error && (
        <p className="text-red-400 text-sm text-center">{error}</p>
      )}
    </div>
  );
}
