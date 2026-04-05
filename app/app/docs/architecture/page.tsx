import { PageHeader, Callout, CardGrid, Card, CodeBlock } from "@/components/DocsUI";

export default function DocsArchitecturePage() {
  return (
    <div className="pb-20 animate-fade-in">
      <PageHeader 
        title="Core Architecture" 
        description="Oply is built on an event-driven, fully autonomous execution lifecycle. Unlike traditional server-heavy CI/CD systems, Oply relies on the intelligence of its CLI and Git integrators." 
      />

      <hr className="border-white/10 my-10" />

      {/* ─── Zero YAML & The DAG ───────────────────────────────────── */}
      <h2 className="text-2xl font-semibold text-white mb-6">1. The 'Zero YAML' Philosophy</h2>
      <p className="text-gray-300 text-lg mb-6">
        When a developer initializes Oply via <code className="text-[#00E5FF] font-mono text-sm">oply init</code>, the CLI does not ask for a massive pipeline script. Instead, it delegates discovery to a localized intelligence module.
      </p>
      
      <CardGrid>
        <Card 
          title="Stack Inference" 
          description="The Engine scans your directory tree. If it spots a 'package.json' alongside a 'next.config.js', it automatically pulls the 'Next.js' optimal build parameters. If it spots a 'go.mod', it flags it as a Golang binary build." 
        />
        <Card 
          title="Topological Sorting" 
          description="Build dependencies are sorted before anything runs. 'LINT' and 'TEST' stages are strictly evaluated before 'BUILD'. If Docker is detected, the containerization step gets tacked to the end." 
        />
      </CardGrid>

      <Callout type="info" title="The Abstract Syntax Tree (AST) of Dev">
        Oply doesn't run sequential scripts. It runs an acyclic graph. If 'lint' and 'test' don't depend on each other, they are executed in parallel background workers.
      </Callout>

      <hr className="border-white/10 my-10" />

      {/* ─── The Execution Lifecycle ───────────────────────────────── */}
      <h2 className="text-2xl font-semibold text-white mb-6">2. The Execution Lifecycle</h2>
      <p className="text-gray-300 text-lg mb-8">
        Once <code className="text-[#00E5FF] font-mono text-sm">oply deploy</code> is triggered, the system invokes the four distinct stages of the Local Pipeline Engine.
      </p>

      <div className="bg-[#111111] p-8 rounded-xl border border-white/10 relative overflow-hidden mb-12">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#00E5FF]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
        
        <div className="space-y-8 relative z-10">
          <div className="flex gap-6">
            <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 text-white flex items-center justify-center font-mono text-sm shrink-0">01</div>
            <div>
              <h3 className="text-xl font-medium text-white mb-2">Pre-Flight Risk AI</h3>
              <p className="text-gray-400 leading-relaxed text-sm">Oply extracts the `git diff` output from your most recent commit and sends it to the AI Sentinel. The GPT model analyzes semantic changes, test coverage, and evaluates if the rollout poses a High Risk. If `riskThreshold &gt; 80`, it halts execution.</p>
            </div>
          </div>
          
          <div className="flex gap-6">
            <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 text-white flex items-center justify-center font-mono text-sm shrink-0">02</div>
            <div>
              <h3 className="text-xl font-medium text-white mb-2">Stage Execution (Graph Check)</h3>
              <p className="text-gray-400 leading-relaxed text-sm">The CLI processes the local `oply.config.json` graph. Testing is executed natively using the installed binary environment (e.g. `npm run test` or `cargo test`). If the `--skip-build` flag is passed, the build step is skipped.</p>
            </div>
          </div>
          
          <div className="flex gap-6">
            <div className="w-10 h-10 rounded-full bg-[#00E5FF]/20 border border-[#00E5FF]/30 text-[#00E5FF] flex items-center justify-center font-mono text-sm shrink-0 shadow-[0_0_15px_rgba(0,229,255,0.2)]">03</div>
            <div>
              <h3 className="text-xl font-medium text-white mb-2">Docker & K8s Connection</h3>
              <p className="text-gray-400 leading-relaxed text-sm">If successful, the engine builds the artifact using Docker caching. The newly generated tag (e.g., `acme-api:a1b2c3d`) is pushed to the remote registry and swapped into the local Kubernetes configuration manifest.</p>
            </div>
          </div>
          
          <div className="flex gap-6">
            <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 text-white flex items-center justify-center font-mono text-sm shrink-0">04</div>
            <div>
              <h3 className="text-xl font-medium text-white mb-2">Telemetrics Sync</h3>
              <p className="text-gray-400 leading-relaxed text-sm">The duration, log stream mapping, and end state are flushed to the local `.oply/history.json` datastore and `.oply/current.json` becomes the new active state.</p>
            </div>
          </div>
        </div>
      </div>

      <hr className="border-white/10 my-10" />

      {/* ─── AI Integrations ───────────────────────────────────────── */}
      <h2 className="text-2xl font-semibold text-white mb-6">3. Deep AI Integrations</h2>
      <p className="text-gray-300 text-lg mb-8">
        There is no single "AI Wrapper". The Intelligence module routes discrete tasks to specialized LLM prompts natively living in the CLI tool source code.
      </p>

      <CodeBlock 
        language="js" 
        title="cli/src/commands/ai-debug.js"
        code={`// Example interaction flow internally executed by the AI Debug Engine
async function analyzeFailure(logString) {
  const diff = getRecentDiff(process.cwd());
  
  const instruction = \`
    You are an expert DevOps engineer specializing in K8s and Docker.
    The pipeline failed with the following traceback: \${logString}.
    The recent codebase changes are: \${diff}.

    Provide the exact terminal command string required to fix this problem.
  \`;

  return GPT.generateCommand(instruction);
}`}
      />

    </div>
  );
}
