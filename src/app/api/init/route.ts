import { NextResponse } from "next/server";
import { getKhanTranscript } from "@/lib/hardcoded-transcript";
import { createSession, updateSession } from "@/lib/session";

export const maxDuration = 120;

export async function POST() {
  try {
    const transcript = await getKhanTranscript();
    const session = createSession();
    updateSession(session.id, { transcript, status: "ready" });
    return NextResponse.json({ sessionId: session.id });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load transcript" },
      { status: 500 }
    );
  }
}
