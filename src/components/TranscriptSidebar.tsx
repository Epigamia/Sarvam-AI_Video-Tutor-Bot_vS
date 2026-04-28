"use client";

import { useState } from "react";

interface TranscriptSidebarProps {
  transcript: string;
}

export default function TranscriptSidebar({ transcript }: TranscriptSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 right-4 z-50 bg-gray-800 hover:bg-gray-700 text-gray-300 p-2 rounded-lg border border-gray-600 transition-colors"
        title={isOpen ? "Close transcript" : "View transcript"}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="fixed inset-y-0 right-0 w-96 bg-gray-900 border-l border-gray-700 z-40 flex flex-col shadow-2xl">
          <div className="flex items-center justify-between p-4 border-b border-gray-700">
            <h3 className="text-white font-medium">Video Transcript</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-white"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
              {transcript}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
