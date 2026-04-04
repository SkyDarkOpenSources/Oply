/**
 * AI Assistant Chat API — Streaming
 * 
 * POST /api/v1/ai/assistant/chat
 * 
 * Streams AI responses using OpenAI with full project context.
 * Implements the Copilot prompt from docs/AI_SYSTEM_AND_PROMPTS.md
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { COPILOT_SYSTEM_PROMPT } from "@/lib/ai/prompts";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { message, context } = body;

    if (!message) {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is not configured. Set it in your .env file." },
        { status: 500 }
      );
    }

    // Build system prompt with context
    const systemPrompt = COPILOT_SYSTEM_PROMPT(
      context?.projectName || "Default Project",
      context?.environment || "Production",
      context?.clusterStatus || "Healthy"
    );

    // Build messages array
    const messages = [
      { role: "system" as const, content: systemPrompt },
      ...(context?.history || []),
      { role: "user" as const, content: message },
    ];

    // Stream response from OpenAI
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages,
        stream: true,
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("[AI Chat Error]", error);
      return NextResponse.json(
        { error: "Failed to get AI response" },
        { status: response.status }
      );
    }

    // Forward the stream (SSE)
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
        if (!reader) {
          controller.close();
          return;
        }

        const decoder = new TextDecoder();
        let buffer = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const data = line.slice(6);
                if (data === "[DONE]") {
                  controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                  controller.close();
                  return;
                }
                try {
                  const parsed = JSON.parse(data);
                  const content = parsed.choices?.[0]?.delta?.content;
                  if (content) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
                  }
                } catch {
                  // Skip malformed lines
                }
              }
            }
          }
        } catch (err) {
          console.error("[Stream Error]", err);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    console.error("[AI Chat Error]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
