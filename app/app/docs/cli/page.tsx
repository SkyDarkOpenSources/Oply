export default function DocsCliPage() {
  return (
    <div className="space-y-12 pb-20">
      <div className="space-y-4">
        <h1 className="text-4xl font-extrabold tracking-tight">Oply CLI Reference</h1>
        <p className="text-xl text-muted-foreground leading-relaxed">
          The Oply CLI is the command-line interface for the Autonomous Software Delivery Platform. It allows you to initialize projects, trigger pipelines, interactive AI debugging, and run K8S/Docker operations directly from your terminal.
        </p>
      </div>

      <hr className="border-border" />

      {/* Global Options */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold">Global Installation</h2>
        <div className="glass bg-black rounded-lg p-4 border border-border">
          <code className="text-sm font-mono text-accent">npm install -g oply-cli</code>
          <p className="text-sm text-muted-foreground mt-4">
            If you are running from the source repository, navigate into <code className="text-accent bg-accent/10 px-1 py-0.5 rounded">/cli</code> and use <code className="text-accent bg-accent/10 px-1 py-0.5 rounded">node bin/oply.js</code>.
          </p>
        </div>
      </section>

      {/* Commands List */}
      <section className="space-y-8 mt-12">
        <h2 className="text-2xl font-bold">Commands</h2>

        {/* oply init */}
        <div className="glass p-6 rounded-xl border border-border space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h3 className="text-xl font-semibold"><code className="text-accent">oply init</code></h3>
            <span className="text-xs font-mono bg-surface-hover px-2 py-1 rounded text-muted-foreground">Setup</span>
          </div>
          <p className="text-sm text-foreground">Scans the repository, detects the language & framework, and uses AI to generate an optimal pipeline DAG (oply.config.json).</p>
          <div className="bg-black/50 p-4 rounded-lg border border-border font-mono text-sm space-y-2 text-muted-foreground">
            <div>$ oply init --repo github.com/user/project --name my-project</div>
          </div>
        </div>

        {/* oply deploy */}
        <div className="glass p-6 rounded-xl border border-border space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h3 className="text-xl font-semibold"><code className="text-accent">oply deploy</code></h3>
            <span className="text-xs font-mono bg-surface-hover px-2 py-1 rounded text-muted-foreground">Deployment</span>
          </div>
          <p className="text-sm text-foreground">Triggers deployments to specific environments. Automates Docker build/push, executes tests, computes AI risk scores, and connects to K8s for the rollout.</p>
          <div className="bg-black/50 p-4 rounded-lg border border-border font-mono text-sm space-y-2 text-muted-foreground overflow-x-auto">
            <div>$ oply deploy --env staging --strategy canary</div>
            <div>$ oply deploy --env production --skip-build --image my-app:latest</div>
          </div>
        </div>

        {/* oply status */}
        <div className="glass p-6 rounded-xl border border-border space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h3 className="text-xl font-semibold"><code className="text-accent">oply status</code></h3>
            <span className="text-xs font-mono bg-surface-hover px-2 py-1 rounded text-muted-foreground">Monitoring</span>
          </div>
          <p className="text-sm text-foreground">View pipeline run statuses and currently active deployments.</p>
          <div className="bg-black/50 p-4 rounded-lg border border-border font-mono text-sm space-y-2 text-muted-foreground overflow-x-auto">
            <div>$ oply status</div>
            <div>$ oply status --deployments --limit 5</div>
          </div>
        </div>

        {/* oply ai-debug */}
        <div className="glass p-6 rounded-xl border border-border border-l-4 border-l-accent space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h3 className="text-xl font-semibold"><code className="text-accent">oply ai-debug</code></h3>
            <span className="text-xs font-mono bg-accent/20 text-accent px-2 py-1 rounded flex gap-1 items-center">✨ AI Feature</span>
          </div>
          <p className="text-sm text-foreground">Starts an interactive session with the AI Failure Analyzer. Oply will scan your logs, read git diffs, determine root causes, and suggest exact terminal commands to fix issues.</p>
          <div className="bg-black/50 p-4 rounded-lg border border-border font-mono text-sm space-y-2 text-muted-foreground overflow-x-auto">
            <div>$ oply ai-debug</div>
            <div>$ oply ai-debug --error "npm ERR! ERESOLVE unable to resolve dependency tree"</div>
            <div>$ oply ai-debug --logs ./failed-build.log</div>
          </div>
        </div>

        {/* oply logs */}
        <div className="glass p-6 rounded-xl border border-border space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h3 className="text-xl font-semibold"><code className="text-accent">oply logs</code></h3>
            <span className="text-xs font-mono bg-surface-hover px-2 py-1 rounded text-muted-foreground">Monitoring</span>
          </div>
          <p className="text-sm text-foreground">Interactive log viewer allowing you to tail logs from CI/CD pipeline runs, Docker containers, or Kubernetes pods.</p>
          <div className="bg-black/50 p-4 rounded-lg border border-border font-mono text-sm space-y-2 text-muted-foreground overflow-x-auto">
            <div>$ oply logs</div>
            <div>$ oply logs --pod --namespace staging -f</div>
          </div>
        </div>

        {/* Sub-group k8s */}
        <div className="space-y-4 pt-4 border-t border-border">
          <h3 className="text-lg font-bold">Kubernetes & Docker Commands</h3>
        </div>
        
        <div className="grid md:grid-cols-2 gap-6">
           <div className="glass p-5 rounded-xl border border-border space-y-3">
             <h4 className="font-semibold text-lg"><code className="text-accent">oply k8s *</code></h4>
             <ul className="list-disc pl-4 text-sm text-muted-foreground space-y-1">
               <li><code className="text-foreground">k8s status</code> - Cluster nodes and basic info</li>
               <li><code className="text-foreground">k8s scale -r 5</code> - Scale deployments</li>
               <li><code className="text-foreground">k8s rollout</code> - Deployment rollout status</li>
               <li><code className="text-foreground">k8s events</code> - View recent K8s events</li>
             </ul>
           </div>
           
           <div className="glass p-5 rounded-xl border border-border space-y-3">
             <h4 className="font-semibold text-lg"><code className="text-accent">oply docker *</code></h4>
             <ul className="list-disc pl-4 text-sm text-muted-foreground space-y-1">
               <li><code className="text-foreground">docker build/push</code> - Manage images</li>
               <li><code className="text-foreground">docker ps</code> - Container statuses</li>
               <li><code className="text-foreground">docker scan</code> - Trivy security scans</li>
               <li><code className="text-foreground">docker prune</code> - Clean unused resources</li>
             </ul>
           </div>
        </div>

      </section>
    </div>
  );
}
