import { NextRequest, NextResponse } from "next/server";
import { getSession, updateSession, createSession } from "@/lib/session";
import { buildSystemPrompt } from "@/lib/prompts";
import { chatCompletion, LLMMessage, detectLanguageCode, translateText } from "@/lib/sarvam";

export async function POST(request: NextRequest) {
  try {
    const { sessionId, message, transcript: clientTranscript } = await request.json();

    if (!message) {
      return NextResponse.json(
        { error: "message is required" },
        { status: 400 }
      );
    }

    let session = getSession(sessionId);

    if (!session && clientTranscript) {
      session = createSession();
      updateSession(session.id, { transcript: clientTranscript, status: "ready" });
    }

    if (!session || !session.transcript) {
      return NextResponse.json(
        { error: "Session not found or no transcript available" },
        { status: 404 }
      );
    }

    session.chatHistory.push({ role: "user", content: message });

    const inputLanguage = detectLanguageCode(message);
    // Languages the model handles natively; everything else gets translated
    const needsTranslation = !["en-IN", "hi-IN"].includes(inputLanguage);

    const systemPrompt = buildSystemPrompt(session.transcript);
    const messages: LLMMessage[] = [
      { role: "system", content: systemPrompt },
      ...session.chatHistory,
    ];

    // Inject a per-turn language instruction so chat history can never bleed language
    const replyLanguage = inputLanguage === "hi-IN" ? "Hindi" : "English";
    const translationNote = needsTranslation ? " The response will be automatically translated to the user's language." : "";
    messages.push({
      role: "system",
      content: `IMPORTANT: For this response, reply in ${replyLanguage} only. Do not use any other language regardless of what language previous messages were in.${translationNote}`,
    });

    const response = await chatCompletion(messages, true);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`LLM request failed: ${errorText}`);
    }

    const encoder = new TextEncoder();
    let assistantMessage = "";

    const outputStream = new ReadableStream({
      async start(controller) {
        try {
          const reader = response.body?.getReader();
          if (!reader) {
            controller.close();
            return;
          }

          const decoder = new TextDecoder();

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const text = decoder.decode(value, { stream: true });
            const lines = text.split("\n");

            for (const line of lines) {
              if (!line.startsWith("data: ")) continue;
              const data = line.slice(6).trim();
              if (data === "[DONE]") continue;

              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  assistantMessage += content;
                  // Only stream chunks live when no translation is needed
                  if (!needsTranslation) {
                    controller.enqueue(
                      encoder.encode(`data: ${JSON.stringify({ content })}\n\n`)
                    );
                  }
                }
              } catch {
                // skip unparseable lines
              }
            }
          }

          // Translate the full response if needed, then emit it as one chunk
          if (needsTranslation && assistantMessage) {
            try {
              // Detect what language the model actually responded in (may not be English)
              const modelResponseLanguage = detectLanguageCode(assistantMessage);
              assistantMessage = await translateText(assistantMessage, inputLanguage, modelResponseLanguage);
            } catch {
              // Translation failed — fall back to whatever the model produced
            }
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ content: assistantMessage })}\n\n`)
            );
          }

          session!.chatHistory.push({
            role: "assistant",
            content: assistantMessage,
          });
          updateSession(session!.id, { chatHistory: session!.chatHistory });

          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
        } catch (err) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: err instanceof Error ? err.message : "Stream failed" })}\n\n`
            )
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(outputStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Chat failed" },
      { status: 500 }
    );
  }
}
