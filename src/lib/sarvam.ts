import fs from "fs";
import path from "path";

const API_KEY = process.env.SARVAM_API_KEY!;
const BASE_URL = "https://api.sarvam.ai";

export async function transcribeAudio(filePath: string): Promise<string> {
  const formData = new FormData();
  const fileBuffer = fs.readFileSync(filePath);
  const fileName = path.basename(filePath);
  const blob = new Blob([fileBuffer], { type: "audio/wav" });
  formData.append("file", blob, fileName);
  formData.append("model", "saaras:v3");
  formData.append("language_code", "unknown");

  const response = await fetch(`${BASE_URL}/speech-to-text`, {
    method: "POST",
    headers: {
      "api-subscription-key": API_KEY,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`STT failed (${response.status}): ${error}`);
  }

  const data = await response.json();
  return data.transcript || "";
}

export async function textToSpeech(text: string): Promise<string> {
  // bulbul:v3 supports up to 2500 chars — truncate at nearest sentence end
  const limit = 2500;
  let truncated = text.slice(0, limit);
  if (text.length > limit) {
    const lastSentence = Math.max(
      truncated.lastIndexOf(". "),
      truncated.lastIndexOf("? "),
      truncated.lastIndexOf("! "),
      truncated.lastIndexOf("।")  // Hindi sentence end
    );
    if (lastSentence > 0) truncated = truncated.slice(0, lastSentence + 1);
  }

  // Detect Hindi by presence of Devanagari script
  const languageCode = /[ऀ-ॿ]/.test(truncated) ? "hi-IN" : "en-IN";

  const response = await fetch(`${BASE_URL}/text-to-speech`, {
    method: "POST",
    headers: {
      "api-subscription-key": API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      inputs: [truncated],
      target_language_code: languageCode,
      speaker: "shubh",
      model: "bulbul:v3",
      pitch: 0,
      pace: 1.0,
      loudness: 1.5,
      speech_sample_rate: 22050,
      enable_preprocessing: false,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`TTS failed (${response.status}): ${error}`);
  }

  const data = await response.json();
  if (!data.audios?.[0]) {
    throw new Error(`TTS returned no audio. Response: ${JSON.stringify(data)}`);
  }
  return data.audios[0];
}

export interface LLMMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export async function chatCompletion(
  messages: LLMMessage[],
  stream: boolean = false
): Promise<Response> {
  const response = await fetch(`${BASE_URL}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "api-subscription-key": API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "sarvam-30b",
      messages,
      stream,
      temperature: 0.3,
      max_tokens: 2048,
    }),
  });

  if (!response.ok && !stream) {
    const error = await response.text();
    throw new Error(`LLM failed (${response.status}): ${error}`);
  }

  return response;
}
