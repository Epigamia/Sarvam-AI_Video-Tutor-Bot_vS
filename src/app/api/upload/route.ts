import { NextRequest } from "next/server";
import { createSession, updateSession } from "@/lib/session";
import { extractAudioFromVideo, chunkAudio, saveTempFile, cleanupTempFiles } from "@/lib/audio";
import { transcribeAudio } from "@/lib/sarvam";

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
        const formData = await request.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
          send("error", { message: "No file provided" });
          controller.close();
          return;
        }

        const session = createSession();
        send("session", { sessionId: session.id });

        updateSession(session.id, { status: "extracting" });
        send("status", { status: "extracting", message: "Extracting audio from video..." });

        const buffer = Buffer.from(await file.arrayBuffer());
        const videoPath = saveTempFile(buffer, session.id, file.name);

        const audioPath = await extractAudioFromVideo(videoPath, session.id);
        send("status", { status: "transcribing", message: "Splitting audio into chunks..." });

        const chunks = await chunkAudio(audioPath);
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
          message: err instanceof Error ? err.message : "Upload failed",
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
