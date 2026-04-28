import { randomUUID } from "crypto";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface SessionData {
  id: string;
  transcript: string;
  chatHistory: ChatMessage[];
  status: "idle" | "downloading" | "extracting" | "transcribing" | "ready";
  progress: { current: number; total: number };
}

const sessions = new Map<string, SessionData>();

export function createSession(): SessionData {
  const id = randomUUID();
  const session: SessionData = {
    id,
    transcript: "",
    chatHistory: [],
    status: "idle",
    progress: { current: 0, total: 0 },
  };
  sessions.set(id, session);
  return session;
}

export function getSession(id: string): SessionData | undefined {
  return sessions.get(id);
}

export function updateSession(
  id: string,
  partial: Partial<Omit<SessionData, "id">>
): SessionData | undefined {
  const session = sessions.get(id);
  if (!session) return undefined;
  Object.assign(session, partial);
  return session;
}
