// Run once locally: node scripts/get-transcript.mjs
// Requires: npm install (youtube-transcript is a devDependency)

import { YoutubeTranscript } from "youtube-transcript";
import { writeFileSync } from "fs";

const videoId = "aircAruvnKk";

console.log("Fetching English transcript for 3Blue1Brown neural networks video...");

let entries;
try {
  entries = await YoutubeTranscript.fetchTranscript(videoId, { lang: "en" });
} catch (err) {
  console.error("Failed:", err.message);
  process.exit(1);
}

if (!entries || entries.length === 0) {
  console.error("No transcript entries returned.");
  process.exit(1);
}

const transcript = entries
  .map((e) => e.text)
  .join(" ")
  .replace(/\[.*?\]/g, "")
  .replace(/\s+/g, " ")
  .trim();

console.log(`Transcript: ${transcript.length} characters, ${entries.length} segments`);
console.log("Preview:", transcript.slice(0, 200));

const output = `// Auto-generated — do not edit manually.
// Regenerate with: npm install && node scripts/get-transcript.mjs

const VIDEO_TRANSCRIPT = ${JSON.stringify(transcript)};

export default VIDEO_TRANSCRIPT;
`;

writeFileSync("src/lib/transcript-content.ts", output);
console.log("✓ Saved to src/lib/transcript-content.ts");
