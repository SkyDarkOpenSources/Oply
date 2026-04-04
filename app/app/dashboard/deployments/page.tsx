"use client";

/* ═══════════════════════════════════════════════════════════
   Deployments — Deployment History & Management
   ═══════════════════════════════════════════════════════════ */

const deployments = [
  { id: "dep-1", service: "api-gateway", env: "Production", version: "v2.14.1", status: "HEALTHY", strategy: "CANARY", risk: 8, deployedBy: "CI/CD Auto", time: "2 hours ago", image: "registry.oply.io/api:v2.14.1" },
  { id: "dep-2", service: "api-gateway", env: "Staging", version: "v2.15.0-rc1", status: "PROGRESSING", strategy: "ROLLING", risk: 23, deployedBy: "john@acme.com", time: "5 min ago", image: "registry.oply.io/api:v2.15.0-rc1" },
  { id: "dep-3", service: "web-frontend", env: "Production", version: "v3.8.0", status: "HEALTHY", strategy: "BLUE_GREEN", risk: 5, deployedBy: "CI/CD Auto", time: "1 day ago", image: "registry.oply.io/web:v3.8.0" },
  { id: "dep-4", service: "worker-service", env: "Production", version: "v1.1.9", status: "ROLLED_BACK", strategy: "CANARY", risk: 72, deployedBy: "CI/CD Auto", time: "3 hours ago", image: "registry.oply.io/worker:v1.1.9" },
  { id: "dep-5", service: "notification-svc", env: "Staging", version: "v0.4.2", status: "HEALTHY", strategy: "ROLLING", risk: 15, deployedBy: "sarah@acme.com", time: "6 hours ago", image: "registry.oply.io/notify:v0.4.2" },
];

function statusBadge(status: string) {
  const styles: Record<string, string> = {
    HEALTHY: "bg-success/10 text-success border-success/20",
    PROGRESSING: "bg-accent/10 text-accent border-accent/20",
    DEGRADED: "bg-warning/10 text-warning border-warning/20",
    ROLLED_BACK: "bg-danger/10 text-danger border-danger/20",
    PENDING: "bg-muted/10 text-muted border-muted/20",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${styles[status] || ""}`}>
      {status}
    </span>
  );
}

function riskGauge(score: number) {
  const color = score <= 30 ? "#10b981" : score <= 60 ? "#f59e0b" : "#ef4444";
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-surface-hover rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${score}%`, background: color }} />
      </div>
      <span className="text-xs font-mono" style={{ color }}>{score}</span>
    </div>
  );
}

export default function DeploymentsPage() {
  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Deployments</h1>
        <div className="flex gap-2">
          <button className="btn-secondary text-sm">Filter</button>
          <button className="btn-primary text-sm">+ Manual Deploy</button>
        </div>
      </div>

      <div className="glass rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left text-xs font-medium text-muted px-5 py-3">Service</th>
              <th className="text-left text-xs font-medium text-muted px-5 py-3">Environment</th>
              <th className="text-left text-xs font-medium text-muted px-5 py-3">Version</th>
              <th className="text-left text-xs font-medium text-muted px-5 py-3">Strategy</th>
              <th className="text-left text-xs font-medium text-muted px-5 py-3">Risk Score</th>
              <th className="text-left text-xs font-medium text-muted px-5 py-3">Status</th>
              <th className="text-left text-xs font-medium text-muted px-5 py-3">Deployed</th>
              <th className="text-left text-xs font-medium text-muted px-5 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {deployments.map((dep) => (
              <tr key={dep.id} className="hover:bg-surface-hover/50 transition-colors">
                <td className="px-5 py-3">
                  <div className="text-sm font-medium">{dep.service}</div>
                  <div className="text-xs text-muted font-mono truncate max-w-[200px]">{dep.image}</div>
                </td>
                <td className="px-5 py-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                    dep.env === "Production" ? "bg-danger/10 text-danger" : dep.env === "Staging" ? "bg-warning/10 text-warning" : "bg-accent/10 text-accent"
                  }`}>
                    {dep.env}
                  </span>
                </td>
                <td className="px-5 py-3 text-sm font-mono">{dep.version}</td>
                <td className="px-5 py-3 text-xs text-muted">{dep.strategy}</td>
                <td className="px-5 py-3">{riskGauge(dep.risk)}</td>
                <td className="px-5 py-3">{statusBadge(dep.status)}</td>
                <td className="px-5 py-3">
                  <div className="text-xs text-muted">{dep.time}</div>
                  <div className="text-xs text-muted">{dep.deployedBy}</div>
                </td>
                <td className="px-5 py-3">
                  <div className="flex gap-1">
                    {dep.status !== "ROLLED_BACK" && (
                      <button className="text-xs text-danger/70 hover:text-danger px-2 py-1 rounded hover:bg-danger/10 transition-colors">
                        Rollback
                      </button>
                    )}
                    <button className="text-xs text-muted hover:text-foreground px-2 py-1 rounded hover:bg-surface-hover transition-colors">
                      Logs
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
