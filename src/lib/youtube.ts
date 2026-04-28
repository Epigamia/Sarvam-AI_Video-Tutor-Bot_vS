import { YoutubeTranscript } from "youtube-transcript";

export function validateYouTubeUrl(url: string): boolean {
  const patterns = [
    /^https?:\/\/(www\.)?youtube\.com\/watch\?v=[\w-]+/,
    /^https?:\/\/youtu\.be\/[\w-]+/,
    /^https?:\/\/(www\.)?youtube\.com\/shorts\/[\w-]+/,
  ];
  return patterns.some((p) => p.test(url));
}

export function extractVideoId(url: string): string | null {
  const patterns = [
    /[?&]v=([\w-]+)/,
    /youtu\.be\/([\w-]+)/,
    /shorts\/([\w-]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export async function fetchYouTubeTranscript(url: string): Promise<string> {
  const videoId = extractVideoId(url);
  if (!videoId) throw new Error("Could not extract video ID from URL");

  let entries;
  try {
    entries = await YoutubeTranscript.fetchTranscript(videoId);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.toLowerCase().includes("disabled") || msg.toLowerCase().includes("no transcript")) {
      throw new Error(
        "This video does not have captions/subtitles available. Please upload the video file directly instead."
      );
    }
    throw new Error(`Failed to fetch YouTube transcript: ${msg}`);
  }

  if (!entries || entries.length === 0) {
    throw new Error(
      "No transcript found for this video. Please upload the video file directly instead."
    );
  }

  return entries.map((e) => e.text).join(" ").replace(/\s+/g, " ").trim();
}
