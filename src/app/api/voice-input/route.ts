import { NextRequest, NextResponse } from "next/server";
import { transcribeAudio } from "@/lib/sarvam";
import { saveTempFile, cleanupTempFiles } from "@/lib/audio";
import { randomUUID } from "crypto";

export async function POST(request: NextRequest) {
  const tempId = randomUUID();

  try {
    const formData = await request.formData();
    const audioFile = formData.get("audio") as File | null;

    if (!audioFile) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await audioFile.arrayBuffer());
    const filePath = saveTempFile(buffer, tempId, "voice_input.wav");

    const transcript = await transcribeAudio(filePath);

    cleanupTempFiles(tempId);

    return NextResponse.json({ text: transcript });
  } catch (err) {
    cleanupTempFiles(tempId);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Voice transcription failed" },
      { status: 500 }
    );
  }
}
