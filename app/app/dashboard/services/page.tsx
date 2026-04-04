"use client";

import { useState } from "react";

/* ═══════════════════════════════════════════════════════════
   Service Map — Infrastructure Graph Visualization
   Nodes = services, edges = traffic flow, K8s/Docker topology
   ═══════════════════════════════════════════════════════════ */

interface ServiceNode {
  id: string;
  name: string;
  type: "api" | "web" | "worker" | "database" | "cache" | "queue" | "external";
  status: "healthy" | "degraded" | "down";
  env: string;
  replicas: number;
  cpu: number;
  memory: number;
  rps: number; // requests per second
  latency: number; // ms
  x: number;
  y: number;
}

interface ServiceEdge {
  from: string;
  to: string;
  rps: number;
  latency: number;
  errorRate: number;
}

const nodes: ServiceNode[] = [
  { id: "ingress", name: "Ingress / LB", type: "external", status: "healthy", env: "prod", replicas: 2, cpu: 12, memory: 18, rps: 1240, latency: 2, x: 400, y: 40 },
  { id: "web", name: "Web Frontend", type: "web", status: "healthy", env: "prod", replicas: 3, cpu: 35, memory: 42, rps: 890, latency: 45, x: 200, y: 160 },
  { id: "api", name: "API Gateway", type: "api", status: "healthy", env: "prod", replicas: 4, cpu: 48, memory: 55, rps: 1120, latency: 18, x: 600, y: 160 },
  { id: "auth", name: "Auth Service", type: "api", status: "healthy", env: "prod", replicas: 2, cpu: 22, memory: 30, rps: 340, latency: 12, x: 400, y: 280 },
  { id: "worker", name: "Pipeline Worker", type: "worker", status: "healthy", env: "prod", replicas: 3, cpu: 62, memory: 71, rps: 45, latency: 0, x: 800, y: 280 },
  { id: "ai", name: "AI Engine", type: "api", status: "healthy", env: "prod", replicas: 2, cpu: 78, memory: 85, rps: 28, latency: 320, x: 600, y: 400 },
  { id: "postgres", name: "PostgreSQL", type: "database", status: "healthy", env: "prod", replicas: 1, cpu: 38, memory: 60, rps: 580, latency: 4, x: 200, y: 400 },
  { id: "redis", name: "Redis Queue", type: "cache", status: "healthy", env: "prod", replicas: 1, cpu: 15, memory: 45, rps: 2200, latency: 1, x: 800, y: 400 },
  { id: "s3", name: "S3 Artifacts", type: "external", status: "healthy", env: "prod", replicas: 0, cpu: 0, memory: 0, rps: 120, latency: 35, x: 400, y: 520 },
];

const edges: ServiceEdge[] = [
  { from: "ingress", to: "web", rps: 890, latency: 3, errorRate: 0.1 },
  { from: "ingress", to: "api", rps: 1120, latency: 2, errorRate: 0.05 },
  { from: "web", to: "api", rps: 450, latency: 12, errorRate: 0.2 },
  { from: "api", to: "auth", rps: 340, latency: 8, errorRate: 0 },
  { from: "api", to: "postgres", rps: 580, latency: 4, errorRate: 0.01 },
  { from: "api", to: "redis", rps: 890, latency: 1, errorRate: 0 },
  { from: "api", to: "worker", rps: 45, latency: 5, errorRate: 0 },
  { from: "worker", to: "redis", rps: 200, latency: 1, errorRate: 0 },
  { from: "worker", to: "ai", rps: 28, latency: 15, errorRate: 0.5 },
  { from: "worker", to: "s3", rps: 120, latency: 35, errorRate: 0.1 },
  { from: "ai", to: "postgres", rps: 15, latency: 6, errorRate: 0 },
];

const typeIcons: Record<string, string> = {
  api: "⚡", web: "🌐", worker: "⚙️", database: "💾", cache: "📡", queue: "📨", external: "☁️",
};

const typeColors: Record<string, string> = {
  api: "#6366f1", web: "#06b6d4", worker: "#8b5cf6", database: "#10b981", cache: "#f59e0b", queue: "#f97316", external: "#64748b",
};

function statusGlow(status: string) {
  if (status === "healthy") return "0 0 12px rgba(16, 185, 129, 0.4)";
  if (status === "degraded") return "0 0 12px rgba(245, 158, 11, 0.5)";
  return "0 0 12px rgba(239, 68, 68, 0.5)";
}

export default function ServiceMapPage() {
  const [selected, setSelected] = useState<ServiceNode | null>(null);

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Service Map</h1>
          <p className="text-sm text-muted">Live infrastructure topology — Production cluster</p>
        </div>
        <div className="flex items-center gap-4">
          {Object.entries(typeColors).map(([type, color]) => (
            <div key={type} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
              <span className="text-xs text-muted capitalize">{type}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Graph Canvas */}
        <div className="lg:col-span-3 glass rounded-xl p-4 overflow-hidden" style={{ minHeight: 600 }}>
          <svg viewBox="0 0 1000 580" className="w-full h-full">
            <defs>
              <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto" fill="#334155">
                <polygon points="0 0, 8 3, 0 6" />
              </marker>
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>

            {/* Edges */}
            {edges.map((edge, i) => {
              const from = nodes.find(n => n.id === edge.from)!;
              const to = nodes.find(n => n.id === edge.to)!;
              const errColor = edge.errorRate > 0.3 ? "#ef4444" : edge.errorRate > 0 ? "#f59e0b" : "#1e2235";
              return (
                <g key={`edge-${i}`}>
                  <line
                    x1={from.x + 60} y1={from.y + 30}
                    x2={to.x + 60} y2={to.y + 30}
                    stroke={errColor} strokeWidth={Math.max(1, Math.log(edge.rps + 1) * 0.5)}
                    opacity={0.5} markerEnd="url(#arrowhead)"
                    strokeDasharray={edge.errorRate > 0.3 ? "6 4" : "none"}
                  />
                  <text
                    x={(from.x + to.x) / 2 + 60}
                    y={(from.y + to.y) / 2 + 25}
                    fill="#64748b" fontSize={9} textAnchor="middle"
                  >
                    {edge.rps} rps
                  </text>
                </g>
              );
            })}

            {/* Nodes */}
            {nodes.map((node) => (
              <g
                key={node.id}
                onClick={() => setSelected(node)}
                style={{ cursor: "pointer" }}
              >
                <rect
                  x={node.x} y={node.y} width={120} height={60} rx={12}
                  fill="#12141c" stroke={typeColors[node.type] || "#1e2235"}
                  strokeWidth={selected?.id === node.id ? 2 : 1}
                  style={{ filter: selected?.id === node.id ? "url(#glow)" : "none" }}
                />
                {/* Status indicator */}
                <circle
                  cx={node.x + 14} cy={node.y + 14}
                  r={4}
                  fill={node.status === "healthy" ? "#10b981" : node.status === "degraded" ? "#f59e0b" : "#ef4444"}
                />
                <text x={node.x + 24} y={node.y + 18} fill="#e2e8f0" fontSize={11} fontWeight={600} fontFamily="Inter, sans-serif">
                  {node.name.length > 14 ? node.name.slice(0, 14) + "…" : node.name}
                </text>
                <text x={node.x + 10} y={node.y + 36} fill="#64748b" fontSize={9} fontFamily="Inter, sans-serif">
                  {node.rps} rps • {node.latency}ms
                </text>
                <text x={node.x + 10} y={node.y + 50} fill="#64748b" fontSize={9} fontFamily="Inter, sans-serif">
                  CPU {node.cpu}% • Mem {node.memory}%
                </text>
              </g>
            ))}
          </svg>
        </div>

        {/* Detail Panel */}
        <div className="glass rounded-xl p-5 space-y-4">
          {selected ? (
            <>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">{typeIcons[selected.type]}</span>
                <h3 className="text-lg font-semibold">{selected.name}</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className={`status-dot ${selected.status === "healthy" ? "status-success" : selected.status === "degraded" ? "status-queued" : "status-failed"}`} />
                <span className="text-sm capitalize">{selected.status}</span>
              </div>

              <div className="space-y-2 pt-2 border-t border-border">
                <InfoRow label="Type" value={selected.type} />
                <InfoRow label="Environment" value={selected.env} />
                <InfoRow label="Replicas" value={String(selected.replicas)} />
                <InfoRow label="Requests/sec" value={`${selected.rps} rps`} />
                <InfoRow label="Latency (p50)" value={`${selected.latency}ms`} />
              </div>

              <div className="space-y-2 pt-2 border-t border-border">
                <div className="text-xs text-muted mb-1">CPU Usage</div>
                <UsageBar value={selected.cpu} />
                <div className="text-xs text-muted mb-1 mt-2">Memory Usage</div>
                <UsageBar value={selected.memory} />
              </div>

              <div className="pt-2 border-t border-border space-y-1">
                <h4 className="text-xs font-medium text-muted mb-2">Connected Services</h4>
                {edges.filter(e => e.from === selected.id || e.to === selected.id).map((edge, i) => {
                  const other = edge.from === selected.id ? edge.to : edge.from;
                  const dir = edge.from === selected.id ? "→" : "←";
                  return (
                    <div key={i} className="text-xs flex items-center justify-between">
                      <span className="text-muted">{dir} {other}</span>
                      <span className="text-muted">{edge.rps} rps</span>
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-2 pt-2">
                <button className="btn-secondary text-xs !py-1.5 flex-1">Logs</button>
                <button className="btn-secondary text-xs !py-1.5 flex-1">Scale</button>
              </div>
            </>
          ) : (
            <div className="text-center text-muted text-sm py-10">
              <p className="text-2xl mb-2">🗺️</p>
              <p>Click a service node to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted">{label}</span>
      <span className="font-medium capitalize">{value}</span>
    </div>
  );
}

function UsageBar({ value }: { value: number }) {
  const color = value > 80 ? "#ef4444" : value > 60 ? "#f59e0b" : "#10b981";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-surface-hover rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${value}%`, background: color }} />
      </div>
      <span className="text-xs font-mono w-10 text-right" style={{ color }}>{value}%</span>
    </div>
  );
}
