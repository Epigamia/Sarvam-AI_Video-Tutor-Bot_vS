import { NextResponse } from "next/server";
import { getVideoTranscript } from "@/lib/hardcoded-transcript";
import { createSession, updateSession } from "@/lib/session";

export async function POST() {
  try {
    const transcript = getVideoTranscript();
    const session = createSession();
    updateSession(session.id, { transcript, status: "ready" });
    return NextResponse.json({ sessionId: session.id });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to initialize" },
      { status: 500 }
    );
  }
}
