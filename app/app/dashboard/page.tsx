"use client";

/* ═══════════════════════════════════════════════════════════
   Dashboard Overview — Project Analytics & Status
   ═══════════════════════════════════════════════════════════ */

const summaryCards = [
  { label: "Total Pipelines", value: "24", change: "+3 this week", color: "accent" },
  { label: "Deployments", value: "156", change: "+12 this week", color: "success" },
  { label: "Success Rate", value: "97.8%", change: "+0.3%", color: "success" },
  { label: "Avg Build Time", value: "47s", change: "-8s from avg", color: "accent" },
];

const recentRuns = [
  { id: "run-001", workflow: "Build & Deploy API", commit: "feat: add auth middleware", status: "SUCCESS", duration: "42s", time: "2 min ago" },
  { id: "run-002", workflow: "Frontend CI", commit: "fix: responsive nav", status: "SUCCESS", duration: "38s", time: "15 min ago" },
  { id: "run-003", workflow: "Build & Deploy API", commit: "refactor: db queries", status: "RUNNING", duration: "—", time: "just now" },
  { id: "run-004", workflow: "E2E Test Suite", commit: "test: checkout flow", status: "FAILED", duration: "1m 23s", time: "1 hour ago" },
  { id: "run-005", workflow: "Security Scan", commit: "deps: update packages", status: "SUCCESS", duration: "55s", time: "3 hours ago" },
];

const activeDeployments = [
  { env: "Production", service: "api-gateway", version: "v2.14.1", status: "HEALTHY", risk: 8 },
  { env: "Staging", service: "api-gateway", version: "v2.15.0-rc1", status: "PROGRESSING", risk: 23 },
  { env: "Production", service: "web-frontend", version: "v3.8.0", status: "HEALTHY", risk: 5 },
  { env: "Development", service: "worker-service", version: "v1.2.0-dev", status: "HEALTHY", risk: 12 },
];

function statusBadge(status: string) {
  const map: Record<string, string> = {
    SUCCESS: "bg-success/10 text-success border-success/20",
    RUNNING: "bg-accent/10 text-accent border-accent/20",
    FAILED: "bg-danger/10 text-danger border-danger/20",
    QUEUED: "bg-warning/10 text-warning border-warning/20",
    HEALTHY: "bg-success/10 text-success border-success/20",
    PROGRESSING: "bg-accent/10 text-accent border-accent/20",
    DEGRADED: "bg-warning/10 text-warning border-warning/20",
    ROLLED_BACK: "bg-danger/10 text-danger border-danger/20",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border ${map[status] || "bg-muted/10 text-muted border-muted/20"}`}>
      <span className={`status-dot status-${status === "SUCCESS" || status === "HEALTHY" ? "success" : status === "RUNNING" || status === "PROGRESSING" ? "running" : status === "FAILED" || status === "ROLLED_BACK" ? "failed" : "queued"}`} />
      {status}
    </span>
  );
}

function riskBadge(score: number) {
  const color = score <= 30 ? "text-success" : score <= 60 ? "text-warning" : "text-danger";
  return <span className={`text-xs font-mono font-medium ${color}`}>{score}/100</span>;
}

export default function DashboardOverview() {
  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card, i) => (
          <div key={i} className="glass rounded-xl p-5">
            <div className="text-sm text-muted mb-1">{card.label}</div>
            <div className="text-2xl font-bold mb-1">{card.value}</div>
            <div className={`text-xs ${card.color === "success" ? "text-success" : "text-accent"}`}>
              {card.change}
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Pipeline Runs */}
        <div className="lg:col-span-2 glass rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h3 className="font-semibold text-sm">Recent Pipeline Runs</h3>
            <a href="/dashboard/pipelines" className="text-xs text-accent hover:underline">View All →</a>
          </div>
          <div className="divide-y divide-border">
            {recentRuns.map((run) => (
              <div key={run.id} className="px-5 py-3 flex items-center gap-4 hover:bg-surface-hover/50 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{run.workflow}</div>
                  <div className="text-xs text-muted truncate font-mono">{run.commit}</div>
                </div>
                <div className="text-xs text-muted font-mono">{run.duration}</div>
                <div className="text-xs text-muted">{run.time}</div>
                {statusBadge(run.status)}
              </div>
            ))}
          </div>
        </div>

        {/* Active Deployments */}
        <div className="glass rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h3 className="font-semibold text-sm">Active Deployments</h3>
            <a href="/dashboard/deployments" className="text-xs text-accent hover:underline">View All →</a>
          </div>
          <div className="divide-y divide-border">
            {activeDeployments.map((dep, i) => (
              <div key={i} className="px-5 py-3 hover:bg-surface-hover/50 transition-colors">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">{dep.service}</span>
                  {statusBadge(dep.status)}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted">{dep.env} • {dep.version}</span>
                  <span className="text-xs text-muted">Risk: {riskBadge(dep.risk)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
