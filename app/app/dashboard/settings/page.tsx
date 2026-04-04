"use client";

/* ═══════════════════════════════════════════════════════════
   Settings — Project Configuration
   ═══════════════════════════════════════════════════════════ */

export default function SettingsPage() {
  return (
    <div className="p-6 space-y-8 animate-fade-in max-w-4xl">
      <h1 className="text-xl font-bold">Settings</h1>

      {/* General */}
      <section className="glass rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">General</h2>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-muted block mb-1.5">Project Name</label>
            <input
              defaultValue="acme-api"
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-accent transition-colors"
            />
          </div>
          <div>
            <label className="text-sm text-muted block mb-1.5">Organization</label>
            <input
              defaultValue="Acme Corp"
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-accent transition-colors"
            />
          </div>
        </div>
      </section>

      {/* Repository */}
      <section className="glass rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">Repository Integration</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-surface-hover border border-border">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              <div>
                <div className="text-sm font-medium">github.com/acme/api-gateway</div>
                <div className="text-xs text-muted">Branch: main • Webhook: Active</div>
              </div>
            </div>
            <span className="text-xs bg-success/10 text-success px-2 py-0.5 rounded">Connected</span>
          </div>
          <button className="btn-secondary text-sm">+ Connect Repository</button>
        </div>
      </section>

      {/* AI Configuration */}
      <section className="glass rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">AI Configuration</h2>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-muted block mb-1.5">AI Provider</label>
            <select className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-accent">
              <option>OpenAI (GPT-4o)</option>
              <option>Anthropic (Claude 3.5)</option>
              <option>Self-Hosted (Llama 3)</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-muted block mb-1.5">API Key</label>
            <input
              type="password"
              defaultValue="sk-●●●●●●●●●●●●●●●●●●●●"
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-accent transition-colors font-mono"
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Auto-Fix PRs</div>
              <div className="text-xs text-muted">Automatically create PRs when AI identifies code fixes</div>
            </div>
            <button className="w-10 h-5 rounded-full bg-accent relative">
              <div className="absolute right-0.5 top-0.5 w-4 h-4 rounded-full bg-white" />
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Risk Gate Threshold</div>
              <div className="text-xs text-muted">Require manual approval above this risk score</div>
            </div>
            <span className="text-sm font-mono text-accent">60/100</span>
          </div>
        </div>
      </section>

      {/* Danger Zone */}
      <section className="rounded-xl p-6 border border-danger/20 bg-danger/5">
        <h2 className="text-lg font-semibold mb-4 text-danger">Danger Zone</h2>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">Delete Project</div>
            <div className="text-xs text-muted">Permanently delete this project and all associated data</div>
          </div>
          <button className="btn-danger text-sm">Delete Project</button>
        </div>
      </section>
    </div>
  );
}
