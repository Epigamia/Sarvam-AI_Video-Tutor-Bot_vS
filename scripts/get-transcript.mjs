// Run once locally: node scripts/get-transcript.mjs
// Requires: npm install (youtube-transcript is a devDependency)

import { YoutubeTranscript } from "youtube-transcript";
import { writeFileSync } from "fs";

const videoId = "Z5myJ8dg_rM";

console.log("Fetching transcript for Khan Academy video...");

let entries;
try {
  entries = await YoutubeTranscript.fetchTranscript(videoId);
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

const output = `// Auto-generated — do not edit manually.
// Regenerate with: npm install && node scripts/get-transcript.mjs

const KHAN_TRANSCRIPT = ${JSON.stringify(transcript)};

export default KHAN_TRANSCRIPT;
`;

writeFileSync("src/lib/transcript-content.ts", output);
console.log("✓ Saved to src/lib/transcript-content.ts");
console.log("Next: git add src/lib/transcript-content.ts && git commit -m 'Add transcript' && git push origin main");
