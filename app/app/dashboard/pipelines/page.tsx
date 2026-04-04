"use client";

import { useState } from "react";

/* ═══════════════════════════════════════════════════════════
   Pipelines — Workflow Management & Pipeline Visualization
   ═══════════════════════════════════════════════════════════ */

const workflows = [
  {
    id: "wf-1",
    name: "Build & Deploy API",
    repo: "acme/api-gateway",
    branch: "main",
    trigger: "push",
    lastRun: "SUCCESS",
    lastDuration: "42s",
    lastCommit: "feat: add rate limiting",
    isActive: true,
    runs: 156,
    successRate: 98.1,
  },
  {
    id: "wf-2",
    name: "Frontend CI/CD",
    repo: "acme/web-dashboard",
    branch: "main",
    trigger: "push",
    lastRun: "RUNNING",
    lastDuration: "—",
    lastCommit: "fix: responsive sidebar",
    isActive: true,
    runs: 89,
    successRate: 95.5,
  },
  {
    id: "wf-3",
    name: "E2E Test Suite",
    repo: "acme/api-gateway",
    branch: "develop",
    trigger: "schedule",
    lastRun: "FAILED",
    lastDuration: "1m 23s",
    lastCommit: "test: payment flow",
    isActive: true,
    runs: 45,
    successRate: 91.1,
  },
  {
    id: "wf-4",
    name: "Security Audit",
    repo: "acme/api-gateway",
    branch: "main",
    trigger: "manual",
    lastRun: "SUCCESS",
    lastDuration: "2m 10s",
    lastCommit: "deps: update packages",
    isActive: false,
    runs: 12,
    successRate: 100,
  },
];

const pipelineStages = [
  { id: "lint", name: "Lint", type: "LINT", status: "SUCCESS", duration: "8s" },
  { id: "test", name: "Unit Tests", type: "TEST", status: "SUCCESS", duration: "18s" },
  { id: "build", name: "Docker Build", type: "BUILD", status: "SUCCESS", duration: "32s" },
  { id: "scan", name: "Security Scan", type: "SECURITY_SCAN", status: "SUCCESS", duration: "12s" },
  { id: "deploy-stg", name: "Deploy Staging", type: "DEPLOY", status: "RUNNING", duration: "—" },
  { id: "deploy-prod", name: "Deploy Prod", type: "DEPLOY", status: "PENDING", duration: "—" },
];

function statusBadge(status: string) {
  const map: Record<string, string> = {
    SUCCESS: "bg-success/10 text-success border-success/20",
    RUNNING: "bg-accent/10 text-accent border-accent/20",
    FAILED: "bg-danger/10 text-danger border-danger/20",
    PENDING: "bg-muted/10 text-muted border-muted/20",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium border ${map[status] || ""}`}>
      <span className={`status-dot ${status === "SUCCESS" ? "status-success" : status === "RUNNING" ? "status-running" : status === "FAILED" ? "status-failed" : "status-pending"}`} />
      {status}
    </span>
  );
}

export default function PipelinesPage() {
  const [selectedWorkflow, setSelectedWorkflow] = useState<string | null>("wf-1");

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Pipelines</h1>
        <button className="btn-primary text-sm">+ New Workflow</button>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Workflow List */}
        <div className="lg:col-span-2 space-y-3">
          {workflows.map((wf) => (
            <button
              key={wf.id}
              onClick={() => setSelectedWorkflow(wf.id)}
              className={`w-full text-left glass rounded-xl p-4 transition-all ${
                selectedWorkflow === wf.id
                  ? "border-accent/40 glow-accent"
                  : "hover:border-accent/20"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold">{wf.name}</h3>
                {statusBadge(wf.lastRun)}
              </div>
              <div className="text-xs text-muted mb-2 font-mono">{wf.repo} • {wf.branch}</div>
              <div className="flex items-center gap-4 text-xs text-muted">
                <span>{wf.runs} runs</span>
                <span className="text-success">{wf.successRate}% pass</span>
                <span className="capitalize">trigger: {wf.trigger}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Pipeline Visualization */}
        <div className="lg:col-span-3 glass rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="font-semibold text-sm">Pipeline Execution — Latest Run</h3>
            <p className="text-xs text-muted mt-0.5">Workflow: {workflows.find(w => w.id === selectedWorkflow)?.name}</p>
          </div>
          <div className="p-6">
            {/* DAG Visualization */}
            <div className="space-y-3">
              {pipelineStages.map((stage, i) => (
                <div key={stage.id} className="flex items-center gap-4">
                  {/* Connector */}
                  <div className="flex flex-col items-center w-6">
                    <div className={`w-3 h-3 rounded-full ${
                      stage.status === "SUCCESS" ? "bg-success" :
                      stage.status === "RUNNING" ? "bg-accent animate-pulse-glow" :
                      stage.status === "FAILED" ? "bg-danger" : "bg-muted/30"
                    }`} />
                    {i < pipelineStages.length - 1 && (
                      <div className={`w-0.5 h-8 ${
                        stage.status === "SUCCESS" ? "bg-success/30" : "bg-border"
                      }`} />
                    )}
                  </div>
                  {/* Stage Card */}
                  <div className={`flex-1 pipeline-node flex items-center justify-between ${
                    stage.status === "RUNNING" ? "border-accent/40" : ""
                  }`}>
                    <div>
                      <div className="text-sm font-medium">{stage.name}</div>
                      <div className="text-xs text-muted font-mono">{stage.type}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted font-mono">{stage.duration}</span>
                      {statusBadge(stage.status)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
