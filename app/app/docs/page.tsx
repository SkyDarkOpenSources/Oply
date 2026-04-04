export default function DocsIndexPage() {
  return (
    <div className="space-y-12 pb-20">
      {/* Hero */}
      <div className="space-y-4">
        <h1 className="text-4xl font-extrabold tracking-tight">Oply Documentation</h1>
        <p className="text-xl text-muted-foreground leading-relaxed">
          Welcome to the official documentation for Oply, the AI-powered Autonomous Software Delivery Platform.
          Learn how to orchestrate your CI/CD pipelines without writing YAML.
        </p>
      </div>

      <hr className="border-border" />

      {/* Introduction */}
      <section id="introduction" className="space-y-4">
        <h2 className="text-2xl font-bold">Introduction</h2>
        <p>
          Oply replaces traditional hard-coded <code>.yml</code> configurations with an intelligent AI engine.
          By analyzing your repository, Oply dynamically generates, executes, and heals your build and deployment pipelines.
        </p>
        <div className="grid md:grid-cols-2 gap-6 mt-6">
          <div className="glass p-6 rounded-xl border border-border">
            <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center mb-4 text-accent text-xl">🤖</div>
            <h3 className="text-lg font-semibold mb-2">No More YAML</h3>
            <p className="text-sm text-muted-foreground">Oply infers your tech stack, language, and dependencies to automatically build a directed acyclic graph (DAG) of the optimal execution order.</p>
          </div>
          <div className="glass p-6 rounded-xl border border-border">
            <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center mb-4 text-success text-xl">🛡️</div>
            <h3 className="text-lg font-semibold mb-2">AI Risk Prediction</h3>
            <p className="text-sm text-muted-foreground">Every deployment is scored out of 100 based on commit size, test coverage, and historical failure rates before going to production.</p>
          </div>
        </div>
      </section>

      {/* Architecture */}
      <section id="architecture" className="space-y-4">
        <h2 className="text-2xl font-bold">Architecture Overview</h2>
        <p>
          Oply operates on a microservice architecture built for scale and high performance.
        </p>
        <div className="glass p-6 rounded-xl border border-border bg-surface mt-4 overflow-x-auto">
          <pre className="text-sm text-muted-foreground font-mono bg-transparent m-0 p-0">
{`┌─────────────────────────────────────────────────────────────────┐
│                     OPLY PLATFORM                               │
│                                                                 │
│  ┌──────────┐   ┌──────────────┐   ┌──────────────────────┐     │
│  │ Dashboard │◄──│ API Gateway  │◄──│ GitHub Webhooks      │     │
│  │ (Next.js) │   │ (REST + SSE) │   │ (push/PR triggers)   │     │
│  └──────────┘   └──────────────┘   └──────────────────────┘     │
│       │               │                       │                 │
│       │          ┌─────▼─────┐          ┌─────▼─────┐           │
│       │          │ PostgreSQL│          │ AI Engine  │           │
│       │          │ (Drizzle) │          │ (OpenAI)   │           │
│       │          └───────────┘          └───────────┘           │
│       │               │                       │                 │
│  ┌────▼────┐    ┌─────▼─────┐          ┌─────▼─────┐           │
│  │ Copilot │    │   Redis   │          │ Pipeline  │           │
│  │ (Chat)  │    │ (BullMQ)  │──────────│ Workers   │           │
│  └─────────┘    └───────────┘          └───────────┘           │
│                                              │                  │
│                                   ┌──────────▼──────────┐       │
│                                   │ Docker + K8s + AWS  │       │
│                                   │ (Build & Deploy)    │       │
│                                   └─────────────────────┘       │
└─────────────────────────────────────────────────────────────────┘`}
          </pre>
        </div>
      </section>

      {/* Quick Start */}
      <section id="quickstart" className="space-y-4">
        <h2 className="text-2xl font-bold">Quick Start Guide</h2>
        <p>Follow these steps to integrate a repository and start deploying.</p>
        
        <div className="space-y-6 mt-6">
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center font-bold shrink-0">1</div>
            <div>
              <h3 className="text-lg font-semibold mb-2">Install the Oply CLI</h3>
              <p className="text-sm text-muted-foreground mb-3">The CLI is your primary tool for local debugging, manual deployments, and interacting with the Copilot.</p>
              <div className="glassbg-black rounded-lg p-3 border border-border">
                <code className="text-sm font-mono text-accent">npm install -g oply-cli</code>
              </div>
            </div>
          </div>
          
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center font-bold shrink-0">2</div>
            <div>
              <h3 className="text-lg font-semibold mb-2">Initialize your Project</h3>
              <p className="text-sm text-muted-foreground mb-3">Navigate to your project directory and run the initialization command. Oply will scan your code and generate an AI plan.</p>
              <div className="glass bg-black rounded-lg p-3 border border-border">
                <code className="text-sm font-mono text-accent">oply init</code>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center font-bold shrink-0">3</div>
            <div>
              <h3 className="text-lg font-semibold mb-2">Trigger a Deployment</h3>
              <p className="text-sm text-muted-foreground mb-3">Push code to GitHub to trigger a webhook, or run a manual deployment from the CLI to build your images and apply Kubernetes configurations.</p>
              <div className="glass bg-black rounded-lg p-3 border border-border">
                <code className="text-sm font-mono text-accent">oply deploy --env staging</code>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
