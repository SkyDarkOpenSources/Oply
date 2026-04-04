export default function DocsArchitecturePage() {
  return (
    <div className="space-y-12 pb-20">
      <div className="space-y-4">
        <h1 className="text-4xl font-extrabold tracking-tight">System Architecture</h1>
        <p className="text-xl text-muted-foreground leading-relaxed">
          Oply is built on a distributed, event-driven architecture designed for extreme reliability and autonomous operations.
        </p>
      </div>

      <hr className="border-border" />

      {/* Core Philosophies */}
      <section className="space-y-8 mt-12">
        <h2 className="text-2xl font-bold">Core Philosophies</h2>
        
        <div className="grid md:grid-cols-2 gap-8">
          <div className="glass p-6 rounded-xl border border-border">
            <h3 className="text-lg font-semibold mb-2">Zero YAML</h3>
            <p className="text-sm text-muted-foreground">
              We believe developers should focus on code, not configuration. Oply uses LLMs to derive the optimal build and test graphs directly from your source files.
            </p>
          </div>
          <div className="glass p-6 rounded-xl border border-border">
            <h3 className="text-lg font-semibold mb-2">Autonomous Healing</h3>
            <p className="text-sm text-muted-foreground">
              When a deployment fails health checks, Oply doesn't just alert you. It analyzes the logs, identifies the breaking change, and auto-initiates a surgical rollback.
            </p>
          </div>
        </div>
      </section>

      {/* Execution Layer */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold">The Execution Layer</h2>
        <p className="text-muted-foreground">
          Oply pipelines are executed across a pool of ephemeral workers. Each task in the DAG runs in an isolated container environment.
        </p>
        <div className="glass bg-black/50 p-6 rounded-xl border border-border mt-6">
          <h4 className="text-sm font-bold text-accent mb-4 uppercase tracking-widest text-xs">Task Lifecycle</h4>
          <ol className="space-y-4">
            <li className="flex gap-4">
              <span className="text-muted font-mono text-xs">01</span>
              <p className="text-sm">Webhook triggers control plane via GitHub/GitLab events.</p>
            </li>
            <li className="flex gap-4">
              <span className="text-muted font-mono text-xs">02</span>
              <p className="text-sm">Orchestrator generates a specific Run instance from the Workflow DAG.</p>
            </li>
            <li className="flex gap-4">
              <span className="text-muted font-mono text-xs">03</span>
              <p className="text-sm">Tasks are dispatched to the Redis-backed BullMQ cluster.</p>
            </li>
            <li className="flex gap-4">
              <span className="text-muted font-mono text-xs">04</span>
              <p className="text-sm">Worker nodes pick up tasks, execute commands, and stream logs via WebSockets.</p>
            </li>
          </ol>
        </div>
      </section>

      {/* AI Subsystems */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold">AI Subsystems</h2>
        <p className="text-muted-foreground">
          Oply integrates four distinct AI agents throughout the delivery lifecycle:
        </p>
        <div className="grid gap-4 mt-4">
          {[
            { name: "The Architect", duty: "Generates optimal pipeline DAGs from repo scans." },
            { name: "The Sentinel", duty: "Predicts deployment risk scores before every rollout." },
            { name: "The Analyst", duty: "Deconstructs build failures and suggests code fixes." },
            { name: "The Copilot", duty: "Interactive DevOps expert available via Chat or CLI." }
          ].map((agent, i) => (
            <div key={i} className="flex items-center gap-4 p-4 rounded-lg bg-surface-hover border border-border">
              <div className="w-2 h-2 rounded-full bg-accent glow-accent-sm" />
              <div className="flex-1">
                <span className="font-semibold text-sm mr-2">{agent.name}:</span>
                <span className="text-sm text-muted-foreground">{agent.duty}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Project Structure */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold">Project Structure</h2>
        <p className="text-muted-foreground">
          Oply is organized as a monorepo containing the dashboard app and the CLI tool.
        </p>
        <div className="glass p-6 rounded-xl border border-border bg-surface mt-4">
          <pre className="text-xs font-mono text-muted-foreground leading-relaxed">
{`Oply/
├── app/                  # Next.js Dashboard & API Gateway
│   ├── app/              # App Router (Dashboard, Docs, API)
│   ├── components/       # Shared UI Components
│   ├── lib/              # Drizzle ORM, AI Prompts, Auth
│   └── public/           # Static Assets
├── cli/                  # Oply Node.js CLI Tool
│   ├── bin/              # CLI Entry Point
│   ├── src/              # Command Implementation (Docker, K8s, AI)
│   └── package.json      # CLI Metadata & Dependencies
├── docs/                 # Raw Architecture & Design Blueprints
└── README.md             # Project Introduction & Quickstart`}
          </pre>
        </div>
      </section>
    </div>
  );
}
