"use client";

import { useState } from "react";

/* ═══════════════════════════════════════════════════════════
   AI Copilot — Full-Page DevOps Assistant
   ═══════════════════════════════════════════════════════════ */

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const sampleConversation: Message[] = [
  {
    id: "1",
    role: "assistant",
    content: `👋 Welcome to **Oply Copilot**! I'm your AI DevOps assistant with direct access to your pipelines, deployments, and cluster metrics.

Here are some things you can ask me:
- "Why did the last build fail?"
- "What's the deployment risk for the current staging build?"
- "Show me the error logs from the worker service"
- "Roll back production to the last healthy version"
- "Why is memory usage spiking in the staging cluster?"`,
    timestamp: new Date(),
  },
];

export default function CopilotPage() {
  const [messages, setMessages] = useState<Message[]>(sampleConversation);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Simulate AI response (replace with real /api/v1/ai/assistant/chat call)
    setTimeout(() => {
      const responses: Record<string, string> = {
        "fail": `### Pipeline Failure Analysis — Run #run-004

**Root Cause:** The E2E test suite timed out on the checkout flow test. The Playwright test at \`tests/checkout.spec.ts:45\` waited for a \`.payment-form\` selector that was removed in commit \`abc1234\`.

**Error Category:** CODE_ERROR

**Suggested Fix:**
\`\`\`diff
- await page.waitForSelector('.payment-form');
+ await page.waitForSelector('[data-testid="payment-form"]');
\`\`\`

**Recommended Actions:**
1. Update the test selector to use data-testid attributes
2. Run \`oply pipeline trigger --workflow wf-3\` to re-run the E2E suite
3. Consider adding selector validation to your pre-commit hooks`,
        "risk": `### Deployment Risk Assessment — Staging v2.15.0-rc1

| Factor | Score | Details |
|--------|-------|---------|
| Change Size | 15 | 3 files modified, +42/-18 lines |
| Test Coverage | 5 | All tests passing, 94% coverage |
| Recent Failures | 3 | No failures in last 10 deploys |
| Dependency Changes | 0 | No new dependencies |

**Overall Risk Score: 23/100** — *Low Risk*

✅ Auto-approved for staging. No manual review required.
The change is a small bug fix in the authentication middleware with full test coverage.`,
        "rollback": `### Rollback Procedure — Production api-gateway

⚠️ **Warning:** This will revert production to **v2.13.8** (the last known healthy version).

**Steps:**
1. \`oply deploy rollback --env production --service api-gateway\`
2. Or click **Deployments → api-gateway → Rollback** in the dashboard

**Impact:**
- Zero-downtime (uses blue/green strategy)
- Estimated rollback time: ~30 seconds
- Active connections will drain gracefully

Do you want me to initiate the rollback?`,
      };

      let responseContent = "I'll analyze that for you. Based on your current project context:\n\nYour pipeline runs are showing a 97.8% success rate with an average build time of 47 seconds. All production services are healthy. Is there something specific you'd like me to look into?";

      const lowInput = input.toLowerCase();
      if (lowInput.includes("fail") || lowInput.includes("error") || lowInput.includes("broke")) {
        responseContent = responses["fail"];
      } else if (lowInput.includes("risk") || lowInput.includes("deploy") || lowInput.includes("safe")) {
        responseContent = responses["risk"];
      } else if (lowInput.includes("rollback") || lowInput.includes("revert") || lowInput.includes("roll back")) {
        responseContent = responses["rollback"];
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: responseContent,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 1500);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-57px)] animate-fade-in">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border flex items-center gap-3">
        <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
        </svg>
        <div>
          <h1 className="text-lg font-semibold">Oply Copilot</h1>
          <p className="text-xs text-muted">AI-powered DevOps assistant with full project context</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-5 py-3 text-sm whitespace-pre-wrap ${
                msg.role === "user"
                  ? "bg-accent text-white rounded-br-md"
                  : "glass rounded-bl-md"
              }`}
            >
              {msg.content.split("\n").map((line, i) => {
                if (line.startsWith("### ")) return <h3 key={i} className="font-bold text-base mb-2 mt-1">{line.replace("### ", "")}</h3>;
                if (line.startsWith("**") && line.endsWith("**")) return <p key={i} className="font-semibold">{line.replace(/\*\*/g, "")}</p>;
                if (line.startsWith("```")) return null;
                if (line.startsWith("- ")) return <div key={i} className="ml-2 text-muted">• {line.replace("- ", "")}</div>;
                if (line.startsWith("|")) return <div key={i} className="font-mono text-xs text-muted">{line}</div>;
                return <p key={i} className="leading-relaxed">{line}</p>;
              })}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="glass rounded-2xl rounded-bl-md px-5 py-3">
              <div className="flex items-center gap-2 text-sm text-muted">
                <span className="animate-pulse-glow">●</span>
                Analyzing your project context...
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border">
        <form onSubmit={handleSubmit} className="flex gap-2 max-w-4xl mx-auto">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 bg-surface border border-border rounded-xl px-4 py-3 text-sm outline-none focus:border-accent transition-colors placeholder:text-muted"
            placeholder="Ask about your pipelines, deployments, or clusters..."
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="btn-primary !py-3 !px-6 disabled:opacity-50"
          >
            Send
          </button>
        </form>
        <p className="text-center text-[10px] text-muted mt-2">
          Oply Copilot has access to your pipeline history, deployment state, and cluster metrics.
        </p>
      </div>
    </div>
  );
}
