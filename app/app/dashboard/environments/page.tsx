"use client";

/* ═══════════════════════════════════════════════════════════
   Environments — Dev / Staging / Production Management
   ═══════════════════════════════════════════════════════════ */

const environments = [
  {
    name: "Production",
    status: "HEALTHY",
    cluster: "gke-prod-us-east1",
    provider: "GCP",
    services: 5,
    pods: 18,
    cpu: 42,
    memory: 61,
    uptime: "99.99%",
    lastDeploy: "2 hours ago",
  },
  {
    name: "Staging",
    status: "PROGRESSING",
    cluster: "gke-staging-us-east1",
    provider: "GCP",
    services: 5,
    pods: 10,
    cpu: 28,
    memory: 35,
    uptime: "99.95%",
    lastDeploy: "5 min ago",
  },
  {
    name: "Development",
    status: "HEALTHY",
    cluster: "minikube-local",
    provider: "Local",
    services: 3,
    pods: 6,
    cpu: 15,
    memory: 22,
    uptime: "99.50%",
    lastDeploy: "1 day ago",
  },
];

function statusDot(status: string) {
  const cls = status === "HEALTHY" ? "status-success" : status === "PROGRESSING" ? "status-running" : "status-failed";
  return <span className={`status-dot ${cls}`} />;
}

function usageBar(value: number, color: string) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-surface-hover rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${value}%`, background: color }} />
      </div>
      <span className="text-xs font-mono text-muted w-10 text-right">{value}%</span>
    </div>
  );
}

export default function EnvironmentsPage() {
  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Environments</h1>
        <button className="btn-primary text-sm">+ Add Environment</button>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
        {environments.map((env) => (
          <div key={env.name} className={`glass rounded-xl p-6 ${env.status === "HEALTHY" ? "hover:border-success/20" : "hover:border-accent/20"} transition-all`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {statusDot(env.status)}
                <h3 className="text-lg font-semibold">{env.name}</h3>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded ${
                env.status === "HEALTHY" ? "bg-success/10 text-success" : "bg-accent/10 text-accent"
              }`}>
                {env.status}
              </span>
            </div>

            <div className="space-y-3 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted">Cluster</span>
                <span className="font-mono text-xs">{env.cluster}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">Provider</span>
                <span>{env.provider}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">Services / Pods</span>
                <span>{env.services} / {env.pods}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">Uptime</span>
                <span className="text-success font-medium">{env.uptime}</span>
              </div>
            </div>

            <div className="space-y-2 pt-4 border-t border-border">
              <div>
                <div className="text-xs text-muted mb-1">CPU Usage</div>
                {usageBar(env.cpu, env.cpu > 70 ? "#ef4444" : env.cpu > 50 ? "#f59e0b" : "#10b981")}
              </div>
              <div>
                <div className="text-xs text-muted mb-1">Memory Usage</div>
                {usageBar(env.memory, env.memory > 70 ? "#ef4444" : env.memory > 50 ? "#f59e0b" : "#6366f1")}
              </div>
            </div>

            <div className="flex gap-2 mt-4 pt-4 border-t border-border">
              <button className="btn-secondary text-xs !py-1.5 !px-3 flex-1">View Pods</button>
              <button className="btn-secondary text-xs !py-1.5 !px-3 flex-1">Metrics</button>
              <button className="btn-secondary text-xs !py-1.5 !px-3">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
