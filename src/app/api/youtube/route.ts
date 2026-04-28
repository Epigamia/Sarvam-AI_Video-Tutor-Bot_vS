import { NextRequest } from "next/server";
import { createSession, updateSession } from "@/lib/session";
import { validateYouTubeUrl, downloadYouTubeAudio } from "@/lib/youtube";
import { extractAudioFromVideo, chunkAudio, cleanupTempFiles } from "@/lib/audio";
import { transcribeAudio } from "@/lib/sarvam";

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function send(event: string, data: unknown) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ event, ...data as object })}\n\n`)
        );
      }

      try {
        const { url } = await request.json();

        if (!url || !validateYouTubeUrl(url)) {
          send("error", { message: "Invalid YouTube URL" });
          controller.close();
          return;
        }

        const session = createSession();
        send("session", { sessionId: session.id });

        updateSession(session.id, { status: "downloading" });
        send("status", { status: "downloading", message: "Downloading YouTube audio..." });

        const audioFile = await downloadYouTubeAudio(url, session.id);

        updateSession(session.id, { status: "extracting" });
        send("status", { status: "extracting", message: "Converting audio to proper format..." });

        // yt-dlp may output various formats; ensure we have 16kHz mono WAV for STT
        const wavPath = await extractAudioFromVideo(audioFile, session.id);

        send("status", { status: "transcribing", message: "Splitting audio into chunks..." });
        const chunks = await chunkAudio(wavPath);
        const total = chunks.length;
        updateSession(session.id, {
          status: "transcribing",
          progress: { current: 0, total },
        });
        send("progress", { current: 0, total });

        let fullTranscript = "";

        for (let i = 0; i < chunks.length; i++) {
          try {
            const text = await transcribeAudio(chunks[i]);
            fullTranscript += text + " ";
          } catch (err) {
            console.error(`Chunk ${i} transcription failed:`, err);
          }

          updateSession(session.id, {
            progress: { current: i + 1, total },
          });
          send("progress", { current: i + 1, total });
        }

        const transcript = fullTranscript.trim();
        updateSession(session.id, {
          transcript,
          status: "ready",
        });

        send("complete", { transcript, sessionId: session.id });
        cleanupTempFiles(session.id);
      } catch (err) {
        send("error", {
          message: err instanceof Error ? err.message : "YouTube processing failed",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
