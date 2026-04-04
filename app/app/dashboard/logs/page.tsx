"use client";

import { useState } from "react";

/* ═══════════════════════════════════════════════════════════
   Logs Explorer — Real-Time Log Viewer
   ═══════════════════════════════════════════════════════════ */

const sampleLogs = [
  { ts: "10:32:01.234", level: "INFO", source: "api-gateway", msg: "Server listening on port 3000" },
  { ts: "10:32:01.456", level: "INFO", source: "api-gateway", msg: "Connected to PostgreSQL at db-prod.neon.tech" },
  { ts: "10:32:01.789", level: "INFO", source: "api-gateway", msg: "Redis connection established" },
  { ts: "10:32:02.012", level: "INFO", source: "worker-service", msg: "Worker started, polling pipeline-executions queue" },
  { ts: "10:32:05.345", level: "INFO", source: "api-gateway", msg: "POST /api/v1/webhooks/github → 200 (12ms)" },
  { ts: "10:32:05.567", level: "INFO", source: "orchestrator", msg: "Pipeline run-001 triggered for commit abc1234" },
  { ts: "10:32:05.890", level: "INFO", source: "orchestrator", msg: "DAG generated: [Lint] → [Test, E2E] → [Build] → [Deploy]" },
  { ts: "10:32:06.123", level: "INFO", source: "worker-service", msg: "Task LINT started for run-001" },
  { ts: "10:32:14.456", level: "INFO", source: "worker-service", msg: "Task LINT completed (8.3s) ✓" },
  { ts: "10:32:14.789", level: "INFO", source: "worker-service", msg: "Task TEST started for run-001" },
  { ts: "10:32:14.790", level: "INFO", source: "worker-service", msg: "Task E2E started for run-001" },
  { ts: "10:32:32.012", level: "INFO", source: "worker-service", msg: "Task TEST completed (17.2s) ✓ — 48/48 tests passed" },
  { ts: "10:32:38.345", level: "WARN", source: "worker-service", msg: "Task E2E slow: timeout approaching for checkout flow test" },
  { ts: "10:32:42.567", level: "INFO", source: "worker-service", msg: "Task E2E completed (27.8s) ✓ — 12/12 tests passed" },
  { ts: "10:32:42.890", level: "INFO", source: "worker-service", msg: "Task BUILD started → docker build -t api:abc1234 ." },
  { ts: "10:33:02.123", level: "INFO", source: "worker-service", msg: "Docker image built (19.2s), pushing to registry..." },
  { ts: "10:33:08.456", level: "INFO", source: "worker-service", msg: "Image pushed: registry.oply.io/api:abc1234 ✓" },
  { ts: "10:33:08.789", level: "INFO", source: "ai-engine", msg: "Risk prediction: 12/100 — Auto-approved for staging" },
  { ts: "10:33:09.012", level: "INFO", source: "deploy-manager", msg: "Rolling update started: staging/api-gateway → abc1234" },
  { ts: "10:33:15.345", level: "INFO", source: "deploy-manager", msg: "Health checks passing. Deployment HEALTHY ✓" },
  { ts: "10:33:15.567", level: "ERROR", source: "worker-service", msg: "Task NOTIFY failed: SMTP connection refused at smtp.acme.io:465" },
  { ts: "10:33:15.890", level: "INFO", source: "ai-engine", msg: "Failure analysis: INFRASTRUCTURE error — SMTP server unreachable, non-critical, skipping." },
];

function levelColor(level: string) {
  switch (level) {
    case "ERROR": return "text-danger";
    case "WARN": return "text-warning";
    case "DEBUG": return "text-muted";
    default: return "text-foreground";
  }
}

function sourceBadge(source: string) {
  const colors: Record<string, string> = {
    "api-gateway": "bg-accent/10 text-accent",
    "worker-service": "bg-purple-500/10 text-purple-400",
    "orchestrator": "bg-success/10 text-success",
    "ai-engine": "bg-warning/10 text-warning",
    "deploy-manager": "bg-cyan-500/10 text-cyan-400",
  };
  return (
    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${colors[source] || "bg-muted/10 text-muted"}`}>
      {source}
    </span>
  );
}

export default function LogsPage() {
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  const filteredLogs = sampleLogs.filter((log) => {
    if (filter !== "ALL" && log.level !== filter) return false;
    if (search && !log.msg.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="p-6 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Logs Explorer</h1>
        <div className="flex items-center gap-2">
          <div className="status-dot status-running" />
          <span className="text-xs text-muted">Live Streaming</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-surface border border-border rounded-lg px-3 py-2 text-sm w-80 outline-none focus:border-accent transition-colors placeholder:text-muted"
          placeholder="Search logs..."
        />
        <div className="flex gap-1">
          {["ALL", "INFO", "WARN", "ERROR"].map((level) => (
            <button
              key={level}
              onClick={() => setFilter(level)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filter === level
                  ? "bg-accent/10 text-accent border border-accent/20"
                  : "bg-surface border border-border text-muted hover:text-foreground"
              }`}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      {/* Log Stream */}
      <div className="glass rounded-xl overflow-hidden font-mono text-xs">
        <div className="max-h-[calc(100vh-220px)] overflow-y-auto">
          {filteredLogs.map((log, i) => (
            <div
              key={i}
              className={`flex items-start gap-3 px-4 py-1.5 border-b border-border/50 hover:bg-surface-hover/50 transition-colors ${
                log.level === "ERROR" ? "bg-danger/5" : ""
              }`}
            >
              <span className="text-muted shrink-0 w-24">{log.ts}</span>
              <span className={`shrink-0 w-12 font-semibold ${levelColor(log.level)}`}>{log.level}</span>
              {sourceBadge(log.source)}
              <span className={`flex-1 ${levelColor(log.level)}`}>{log.msg}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
