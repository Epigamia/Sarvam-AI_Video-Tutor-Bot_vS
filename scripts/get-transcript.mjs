// Run once locally: node scripts/get-transcript.mjs
// Fetches the Khan Academy video transcript and saves it as a hardcoded constant.

import { writeFileSync } from "fs";

const VIDEO_URL = "https://www.youtube.com/watch?v=Z5myJ8dg_rM";

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept-Language": "en-US,en;q=0.9",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
};

function extractJson(html, marker) {
  const startIdx = html.indexOf(marker);
  if (startIdx === -1) return null;
  let braceCount = 0;
  let jsonStart = -1;
  for (let i = startIdx + marker.length; i < html.length; i++) {
    if (html[i] === "{") {
      if (jsonStart === -1) jsonStart = i;
      braceCount++;
    } else if (html[i] === "}") {
      braceCount--;
      if (braceCount === 0 && jsonStart !== -1) {
        try { return JSON.parse(html.slice(jsonStart, i + 1)); } catch { return null; }
      }
    }
  }
  return null;
}

console.log("Fetching YouTube page...");
const pageRes = await fetch(VIDEO_URL, { headers: HEADERS });
const html = await pageRes.text();
console.log(`Page size: ${html.length} chars`);

const playerResponse = extractJson(html, "ytInitialPlayerResponse =");
if (!playerResponse) {
  console.error("Could not parse YouTube page — try again or check your internet connection.");
  process.exit(1);
}

const captionTracks = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
if (!captionTracks || captionTracks.length === 0) {
  console.error("No captions found. Top-level keys:", Object.keys(playerResponse).join(", "));
  process.exit(1);
}

console.log("Available tracks:", captionTracks.map((t) => t.languageCode).join(", "));

const track =
  captionTracks.find((t) => t.languageCode === "en") ||
  captionTracks.find((t) => t.languageCode.startsWith("en")) ||
  captionTracks[0];

console.log(`Using: ${track.languageCode}`);

const captionRes = await fetch(track.baseUrl);
const xml = await captionRes.text();

// Parse YouTube's XML caption format: <text start="..." dur="...">content</text>
const transcript = [...xml.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g)]
  .map((m) =>
    m[1]
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\[.*?\]/g, "")
      .trim()
  )
  .filter(Boolean)
  .join(" ")
  .replace(/\s+/g, " ")
  .trim();

console.log(`Transcript: ${transcript.length} characters`);

const output = `// Auto-generated — do not edit manually.
// Regenerate with: node scripts/get-transcript.mjs

const KHAN_TRANSCRIPT = ${JSON.stringify(transcript)};

export default KHAN_TRANSCRIPT;
`;

writeFileSync("src/lib/transcript-content.ts", output);
console.log("✓ Saved to src/lib/transcript-content.ts — commit and push this file.");
