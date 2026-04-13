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
import { ChatGroq } from "@langchain/groq";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";

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

    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) {
      return NextResponse.json(
        { error: "GROQ_API_KEY is not configured. Set it in your .env file." },
        { status: 500 }
      );
    }

    // Initialize Groq model
    const model = new ChatGroq({
      model: process.env.GROQ_MODEL || "llama-3.1-70b-versatile",
      temperature: 0.7,
      apiKey: groqKey,
      streaming: true,
    });

    // Build system prompt with context
    const systemPrompt = COPILOT_SYSTEM_PROMPT(
      context?.projectName || "Default Project",
      context?.environment || "Production",
      context?.clusterStatus || "Healthy"
    );

    // Build messages array
    const prompt = ChatPromptTemplate.fromMessages([
      ["system", systemPrompt],
      ...(context?.history || []).map((m: any) => [m.role === "user" ? "user" : "assistant", m.content]),
      ["user", "{message}"],
    ]);

    const chain = prompt.pipe(model).pipe(new StringOutputParser());

    // Stream response
    const stream = await chain.stream({
      message: message,
    });

    const encoder = new TextEncoder();
    const responseStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: chunk })}\n\n`));
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        } catch (err) {
          console.error("[Stream Error]", err);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(responseStream, {
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

