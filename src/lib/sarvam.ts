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
  formData.append("model", "saarika:v2.5");
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
  // bulbul:v2 supports up to 500 chars per input
  const truncated = text.slice(0, 500);

  const response = await fetch(`${BASE_URL}/text-to-speech`, {
    method: "POST",
    headers: {
      "api-subscription-key": API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      inputs: [truncated],
      target_language_code: "en-IN",
      speaker: "anushka",
      model: "bulbul:v2",
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
      model: "sarvam-m",
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
