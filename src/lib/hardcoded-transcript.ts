import KHAN_TRANSCRIPT from "./transcript-content";

export function getKhanTranscript(): string {
  if (!KHAN_TRANSCRIPT) {
    throw new Error(
      "Transcript not generated yet. Run: node scripts/get-transcript.mjs"
    );
  }
  return KHAN_TRANSCRIPT;
}
