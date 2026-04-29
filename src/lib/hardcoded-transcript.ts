import { fetchYouTubeTranscript } from "./youtube";
import fs from "fs";
import path from "path";
import os from "os";

export const KHAN_VIDEO_URL = "https://www.youtube.com/watch?v=Z5myJ8dg_rM";
const CACHE_PATH = path.join(os.tmpdir(), "khan-transcript-cache.txt");

let memCache: string | null = null;

export async function getKhanTranscript(): Promise<string> {
  if (memCache) return memCache;

  if (fs.existsSync(CACHE_PATH)) {
    const cached = fs.readFileSync(CACHE_PATH, "utf-8").trim();
    if (cached) {
      memCache = cached;
      return memCache;
    }
  }

  const transcript = await fetchYouTubeTranscript(KHAN_VIDEO_URL);
  fs.writeFileSync(CACHE_PATH, transcript);
  memCache = transcript;
  return transcript;
}
