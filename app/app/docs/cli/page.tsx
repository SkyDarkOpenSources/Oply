import { PageHeader, Callout, CardGrid, Card, CodeBlock } from "@/components/DocsUI";

export default function DocsCliPage() {
  return (
    <div className="pb-20 animate-fade-in">
      <PageHeader 
        title="CLI Reference" 
        description="The terminal is your primary interface with Oply. The Node.js-based CLI handles everything from stack detection to rolling out Kubernetes updates." 
      />

      <hr className="border-white/10 my-10" />

      {/* Global Flags */}
      <h2 className="text-2xl font-semibold text-white mb-6">Installation & Globals</h2>
      
      <CodeBlock 
        language="bash"
        title="Terminal"
        code="git clone https://github.com/SkyDarkOpenSources/oply.git"
      />
      
      <Callout type="info" title="DEVELOPER BUILD">
        If you are running the cli from the source monorepo, you must navigate into the <code className="text-[#00E5FF] px-1 rounded bg-[#00E5FF]/10 text-xs">/cli</code> directory and invoke <code className="text-[#00E5FF] px-1 rounded bg-[#00E5FF]/10 text-xs">node bin/oply.js</code> natively instead of using the global binary.
      </Callout>

      <hr className="border-white/10 my-10" />

      {/* ─── Commands List ─────────────────────────────────────────── */}
      <h2 className="text-2xl font-semibold text-white mb-8">Base Commands</h2>

      <div className="space-y-12">
        
        {/* oply init */}
        <div className="border border-white/10 rounded-xl bg-[#111111]/50 overflow-hidden group hover:border-[#00E5FF]/30 transition-colors">
          <div className="bg-[#1A1A1A] px-6 py-4 border-b border-white/10 flex items-center justify-between">
            <h3 className="text-xl font-bold font-mono text-white m-0">oply init</h3>
            <span className="text-xs bg-white/10 text-gray-300 px-2 py-1 rounded">Configuration</span>
          </div>
          <div className="p-6">
            <p className="text-gray-400 text-sm mb-6 leading-relaxed">
              Interactively scans the current directory to establish the `oply.config.json` graph, hooks into Git, and writes an ignored `.env.oply` secrets file.
            </p>
            <CodeBlock language="bash" code="$ oply init -n acme-api --repo https://github.com/org/repo" />
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4 mt-6">Available Flags</h4>
            <ul className="space-y-3 text-sm text-gray-400 list-disc pl-5">
              <li><code className="text-[#00E5FF] font-mono mr-2">-r, --repo &lt;url&gt;</code> Specify the GitHub/GitLab repository URL manually.</li>
              <li><code className="text-[#00E5FF] font-mono mr-2">-n, --name &lt;name&gt;</code> The arbitrary name of the project.</li>
              <li><code className="text-[#00E5FF] font-mono mr-2">--api &lt;url&gt;</code> Connect the CLI to an upstream telemetry API (Default: localhost).</li>
            </ul>
          </div>
        </div>

        {/* oply deploy */}
        <div className="border border-white/10 rounded-xl bg-[#111111]/50 overflow-hidden group hover:border-[#00E5FF]/30 transition-colors">
          <div className="bg-[#1A1A1A] px-6 py-4 border-b border-white/10 flex items-center justify-between">
            <h3 className="text-xl font-bold font-mono text-white m-0">oply deploy</h3>
            <span className="text-xs bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-1 rounded">Execution</span>
          </div>
          <div className="p-6">
            <p className="text-gray-400 text-sm mb-6 leading-relaxed">
              Triggers the pipeline execution. Recomputes dependencies, packages Docker images, and requests scaling operations to Kubernetes. Includes inherent 'Production Safety Checks' to prevent disastrous overwrites.
            </p>
            <CodeBlock language="bash" code="$ oply deploy --env production --skip-tests --strategy canary" />
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4 mt-6">Available Flags</h4>
            <ul className="space-y-3 text-sm text-gray-400 list-disc pl-5">
              <li><code className="text-[#00E5FF] font-mono mr-2">-e, --env &lt;env&gt;</code> Target semantic environment designation (development, staging, production).</li>
              <li><code className="text-[#00E5FF] font-mono mr-2">-s, --strategy &lt;type&gt;</code> Force strategy type: 'rolling', 'canary', 'blue-green'.</li>
              <li><code className="text-[#00E5FF] font-mono mr-2">--dry-run</code> Calculates the final rollout manifest without executing writes.</li>
              <li><code className="text-[#00E5FF] font-mono mr-2">--skip-build / --skip-tests</code> Bypasses DAG stages manually for emergency fixes.</li>
            </ul>
          </div>
        </div>

        {/* oply status */}
        <div className="border border-white/10 rounded-xl bg-[#111111]/50 overflow-hidden group hover:border-[#00E5FF]/30 transition-colors">
          <div className="bg-[#1A1A1A] px-6 py-4 border-b border-white/10 flex items-center justify-between">
            <h3 className="text-xl font-bold font-mono text-white m-0">oply status</h3>
            <span className="text-xs bg-white/10 text-gray-300 px-2 py-1 rounded">Telemetry</span>
          </div>
          <div className="p-6">
            <p className="text-gray-400 text-sm mb-6 leading-relaxed">
              Reads local pointers and active deployment metrics without hitting any external servers except the active k8s cluster.
            </p>
            <CodeBlock language="bash" code="$ oply status --deployments --limit 5" />
          </div>
        </div>

        {/* oply ai-debug */}
        <div className="border border-[#00E5FF]/30 rounded-xl bg-[#00E5FF]/[0.02] overflow-hidden group relative">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#00E5FF]" />
          <div className="bg-[#00E5FF]/5 px-6 py-4 border-b border-[#00E5FF]/20 flex items-center justify-between">
            <h3 className="text-xl font-bold font-mono text-white m-0 flex items-center gap-2">
              <svg className="w-5 h-5 text-[#00E5FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              oply ai-debug
            </h3>
            <span className="text-xs bg-[#00E5FF]/20 text-[#00E5FF] px-2 py-1 rounded font-semibold tracking-wider">PREMIUM</span>
          </div>
          <div className="p-6">
            <p className="text-gray-400 text-sm mb-6 leading-relaxed">
              Starts an interactive terminal session where you chat with the failure analyzer. Highly context-aware based on the current process exit codes.
            </p>
            <CodeBlock language="bash" code={`# Inject manual string error
$ oply ai-debug --error "npm ERR! ERESOLVE unable to resolve dependency tree"

# Parse physical dump
$ oply ai-debug --logs ./failed-build.log`} />
          </div>
        </div>

      </div>
    </div>
  );
}
