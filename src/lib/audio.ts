import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import ffprobeStatic from "ffprobe-static";
import fs from "fs";
import path from "path";
import os from "os";

if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic);
}
ffmpeg.setFfprobePath(ffprobeStatic.path);

function getTempDir(sessionId: string): string {
  const dir = path.join(os.tmpdir(), "video-tutor", sessionId);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function extractAudioFromVideo(
  videoPath: string,
  sessionId: string
): Promise<string> {
  const tempDir = getTempDir(sessionId);
  const outputPath = path.join(tempDir, "audio.wav");

  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .outputOptions(["-ac", "1", "-ar", "16000", "-vn"])
      .output(outputPath)
      .on("end", () => resolve(outputPath))
      .on("error", (err) => reject(new Error(`Audio extraction failed: ${err.message}`)))
      .run();
  });
}

function getAudioDuration(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(err);
      resolve(metadata.format.duration || 0);
    });
  });
}

export async function chunkAudio(
  audioPath: string,
  chunkDuration: number = 25
): Promise<string[]> {
  const duration = await getAudioDuration(audioPath);
  const chunks: string[] = [];
  const dir = path.dirname(audioPath);

  const numChunks = Math.ceil(duration / chunkDuration);

  for (let i = 0; i < numChunks; i++) {
    const startTime = i * chunkDuration;
    const chunkPath = path.join(dir, `chunk_${i}.wav`);

    await new Promise<void>((resolve, reject) => {
      ffmpeg(audioPath)
        .setStartTime(startTime)
        .setDuration(chunkDuration)
        .outputOptions(["-ac", "1", "-ar", "16000"])
        .output(chunkPath)
        .on("end", () => resolve())
        .on("error", (err) => reject(new Error(`Chunking failed: ${err.message}`)))
        .run();
    });

    chunks.push(chunkPath);
  }

  return chunks;
}

export function cleanupTempFiles(sessionId: string): void {
  const dir = path.join(os.tmpdir(), "video-tutor", sessionId);
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

export function saveTempFile(
  buffer: Buffer,
  sessionId: string,
  filename: string
): string {
  const dir = getTempDir(sessionId);
  const filePath = path.join(dir, filename);
  fs.writeFileSync(filePath, buffer);
  return filePath;
}
