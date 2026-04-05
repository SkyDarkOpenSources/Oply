import { PageHeader, Callout, CardGrid, Card, Steps, Step, CodeBlock } from "@/components/DocsUI";

export default function DocsIndexPage() {
  return (
    <div className="pb-20 animate-fade-in">
      <PageHeader 
        title="Introduction" 
        description="Oply is an Autonomous Software Delivery Platform that replaces traditional CI/CD pipelines with an intelligent AI execution engine." 
      />

      <hr className="border-white/10 my-10" />

      {/* ─── Core Concepts ────────────────────────────────────────── */}
      <h2 className="text-2xl font-semibold text-white mb-6">Why Oply?</h2>
      <p className="text-gray-300 text-lg">
        Traditional CI/CD relies on brittle YAML files that are hard to maintain, slow to execute, and lack context. Oply takes a radically different approach by treating your software delivery pipeline as an adaptable, intelligent graph.
      </p>

      <CardGrid>
        <Card 
          title="No More YAML" 
          description="Oply infers your tech stack, language, and dependencies to automatically build a directed acyclic graph (DAG) of the optimal execution order. No manual configuration required." 
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
        />
        <Card 
          title="AI Risk Prediction" 
          description="Every deployment is scored by GPT-4o based on commit size, test coverage, and historical failure rates before hitting production. Risky deployments are automatically gated." 
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>}
        />
        <Card 
          title="Git-Native Rollbacks" 
          description="A fully local, reproducible `.oply/` state store means rollbacks aren't just pipeline re-runs; they are calculated git-reverts mixed with Kubernetes rollouts." 
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>}
        />
        <Card 
          title="Terminal Copilot" 
          description="Execute 'oply ai-debug' to instantly analyze failed builds. The AI Assistant checks recent logs, isolates the culprit, and gives you the exact terminal command to fix it." 
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
        />
      </CardGrid>

      <Callout type="tip" title="Built for the Terminal">
        Oply runs securely entirely inside your local machine or CI runner. Instead of sending all your code to a remote SaaS server, our open-source CLI executes entirely on your hardware and connects via standard APIs.
      </Callout>

      <hr className="border-white/10 my-10" />

      {/* ─── Quick Start ──────────────────────────────────────────── */}
      <h2 className="text-2xl font-semibold text-white mb-6">Quick Start</h2>
      <p className="text-gray-300 text-lg mb-8">
        Get Oply running in your repository in under 60 seconds. Our setup is deliberately minimal.
      </p>

      <Steps>
        <Step number={1} title="Install the Global CLI">
          Start by installing the CLI globally via NPM. This provides the `oply` executable across your machine.
          <CodeBlock 
            language="bash" 
            title="Terminal"
            code="npm install -g oply-cli" 
          />
        </Step>

        <Step number={2} title="Initialize your Repository">
          Navigate into your application's root directory and run the initialization command. Oply will scan your code and auto-detect your stack (Node, Go, Rust, Python, etc.)
          <CodeBlock 
            language="bash" 
            title="Terminal"
            code="cd my-app/
oply init --name my-application" 
          />
          <Callout type="info" title="What happens under the hood?">
            Oply checks your `package.json`, `go.mod`, or `requirements.txt` to infer your framework. It then generates an `oply.config.json` containing the DAG (Directed Acyclic Graph) of how the application should be built and tested.
          </Callout>
        </Step>

        <Step number={3} title="Trigger a Deployment">
          With initialization complete, you can manually trigger your first pipeline or deployment.
          <CodeBlock 
            language="bash" 
            title="Terminal"
            code="oply deploy --env staging" 
          />
          <p className="mt-4">
            If Docker is detected in your dependency graph, Oply will automatically build your image, analyze the commit for risk, execute your unit tests, and deploy.
          </p>
        </Step>
      </Steps>

    </div>
  );
}
