"use client";

interface TranscriptionProgressProps {
  status: string;
  message: string;
  current: number;
  total: number;
}

export default function TranscriptionProgress({
  status,
  message,
  current,
  total,
}: TranscriptionProgressProps) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="w-full max-w-md mx-auto text-center space-y-4">
      <div className="animate-pulse">
        <svg
          className="w-16 h-16 mx-auto text-blue-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
          />
        </svg>
      </div>

      <div>
        <p className="text-white font-medium mb-1">{message}</p>
        <p className="text-gray-500 text-sm capitalize">{status}</p>
      </div>

      {total > 0 && (
        <div>
          <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${percentage}%` }}
            />
          </div>
          <p className="text-gray-400 text-sm">
            {current} / {total} chunks transcribed ({percentage}%)
          </p>
        </div>
      )}
    </div>
  );
}
