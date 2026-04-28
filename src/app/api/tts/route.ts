import { NextRequest, NextResponse } from "next/server";
import { textToSpeech } from "@/lib/sarvam";

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text) {
      return NextResponse.json({ error: "No text provided" }, { status: 400 });
    }

    const audioBase64 = await textToSpeech(text);

    return NextResponse.json({ audio: audioBase64 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "TTS failed" },
      { status: 500 }
    );
  }
}
