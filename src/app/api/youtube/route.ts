import { NextRequest } from "next/server";
import { createSession, updateSession } from "@/lib/session";
import { validateYouTubeUrl, fetchYouTubeTranscript } from "@/lib/youtube";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function send(event: string, data: unknown) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ event, ...(data as object) })}\n\n`)
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
        send("status", { status: "fetching", message: "Fetching YouTube transcript..." });

        const transcript = await fetchYouTubeTranscript(url);

        updateSession(session.id, { transcript, status: "ready" });
        send("complete", { transcript, sessionId: session.id });
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
