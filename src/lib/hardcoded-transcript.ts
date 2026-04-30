import VIDEO_TRANSCRIPT from "./transcript-content";

export function getVideoTranscript(): string {
  if (!VIDEO_TRANSCRIPT) {
    throw new Error(
      "Transcript not generated yet. Run: node scripts/get-transcript.mjs"
    );
  }
  return VIDEO_TRANSCRIPT;
}
