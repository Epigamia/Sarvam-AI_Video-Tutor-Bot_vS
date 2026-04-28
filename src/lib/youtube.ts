import ytdl from "@distube/ytdl-core";
import fs from "fs";
import path from "path";
import os from "os";

export function validateYouTubeUrl(url: string): boolean {
  const patterns = [
    /^https?:\/\/(www\.)?youtube\.com\/watch\?v=[\w-]+/,
    /^https?:\/\/youtu\.be\/[\w-]+/,
    /^https?:\/\/(www\.)?youtube\.com\/shorts\/[\w-]+/,
  ];
  return patterns.some((p) => p.test(url));
}

export async function downloadYouTubeAudio(
  url: string,
  sessionId: string
): Promise<string> {
  const dir = path.join(os.tmpdir(), "video-tutor", sessionId);
  fs.mkdirSync(dir, { recursive: true });

  const outputPath = path.join(dir, "youtube_audio.webm");

  return new Promise((resolve, reject) => {
    const stream = ytdl(url, {
      filter: "audioonly",
      quality: "lowestaudio",
    });

    const writeStream = fs.createWriteStream(outputPath);
    stream.pipe(writeStream);

    stream.on("error", (err) =>
      reject(new Error(`YouTube download failed: ${err.message}`))
    );
    writeStream.on("finish", () => resolve(outputPath));
    writeStream.on("error", (err) =>
      reject(new Error(`File write failed: ${err.message}`))
    );
  });
}
