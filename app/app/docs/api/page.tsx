export default function DocsApiPage() {
  return (
    <div className="space-y-12 pb-20">
      <div className="space-y-4">
        <h1 className="text-4xl font-extrabold tracking-tight">API Reference</h1>
        <p className="text-xl text-muted-foreground leading-relaxed">
          The Oply platform exposes a robust HTTP API for triggering CI/CD pipelines, managing infrastructure, and streaming AI assistant capabilities.
        </p>
      </div>

      <hr className="border-border" />

      {/* Authentication */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold">Authentication</h2>
        <p className="text-muted-foreground">Internal Dashboard access uses NextAuth v5 session cookies. CLI and external script access use Bearer tokens placed in the Authorization header.</p>
        <div className="glass bg-black p-4 rounded-lg border border-border mt-4 text-sm font-mono text-muted-foreground">
          Authorization: Bearer oply_token_xxxxxxxxxxxx
        </div>
      </section>

      {/* Endpoints */}
      <section className="space-y-8 mt-12">
        <h2 className="text-2xl font-bold">Endpoints</h2>

        <div className="space-y-6">

          {/* Webhooks */}
          <div className="glass rounded-xl overflow-hidden border border-border">
            <div className="px-6 py-4 border-b border-border bg-surface-hover flex justify-between items-center">
              <h3 className="font-semibold text-lg flex items-center gap-3">
                <span className="bg-success text-white px-2 py-1 rounded text-xs">POST</span>
                /api/v1/webhooks/github
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-foreground">Receives GitHub Push/PR events. Verifies the SHA256 HMAC signature. Triggers pipeline executions based on branch matching.</p>
              <h4 className="font-semibold text-sm">Payload</h4>
              <pre className="text-xs font-mono text-muted-foreground bg-black p-3 rounded">{`{
  "ref": "refs/heads/main",
  "after": "abcd1234efgh5678",
  "repository": { "html_url": "..." },
  "pusher": { "email": "..." }
}`}</pre>
            </div>
          </div>

          {/* Pipelines GET */}
          <div className="glass rounded-xl overflow-hidden border border-border">
            <div className="px-6 py-4 border-b border-border bg-surface-hover flex justify-between items-center">
              <h3 className="font-semibold text-lg flex items-center gap-3">
                <span className="bg-accent text-white px-2 py-1 rounded text-xs">GET</span>
                /api/v1/pipelines
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-foreground">Retrieves the pipeline run history with nested DAG task statuses.</p>
              <h4 className="font-semibold text-sm">Query Parameters</h4>
              <ul className="text-sm text-muted-foreground list-disc pl-5">
                <li><code>limit</code> (default 20)</li>
                <li><code>workflowId</code> (optional)</li>
                <li><code>status</code> (SUCCESS, FAILED, RUNNING)</li>
              </ul>
            </div>
          </div>

          {/* Pipelines POST */}
          <div className="glass rounded-xl overflow-hidden border border-border">
            <div className="px-6 py-4 border-b border-border bg-surface-hover flex justify-between items-center">
              <h3 className="font-semibold text-lg flex items-center gap-3">
                <span className="bg-success text-white px-2 py-1 rounded text-xs">POST</span>
                /api/v1/pipelines
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-foreground">Trigger a pipeline run manually. This forces pipeline execution irrespective of webhooks.</p>
              <h4 className="font-semibold text-sm">Payload</h4>
              <pre className="text-xs font-mono text-muted-foreground bg-black p-3 rounded">{`{
  "workflowId": "uuid",
  "commitHash": "optional_override",
  "commitMessage": "Manual trigger"
}`}</pre>
            </div>
          </div>

          {/* Deployments POST */}
          <div className="glass rounded-xl overflow-hidden border border-border">
            <div className="px-6 py-4 border-b border-border bg-surface-hover flex justify-between items-center">
              <h3 className="font-semibold text-lg flex items-center gap-3">
                <span className="bg-success text-white px-2 py-1 rounded text-xs">POST</span>
                /api/v1/deployments
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-foreground">Create a deployment event. Generates a risk score via the AI engine before executing the rollout strategy.</p>
              <h4 className="font-semibold text-sm">Payload</h4>
              <pre className="text-xs font-mono text-muted-foreground bg-black p-3 rounded">{`{
  "projectId": "uuid",
  "environmentId": "uuid",
  "version": "v1.2.3",
  "imageTag": "registry/app:commit",
  "strategy": "BLUE_GREEN"
}`}</pre>
            </div>
          </div>

          {/* Deployments PATCH */}
          <div className="glass rounded-xl overflow-hidden border border-border">
            <div className="px-6 py-4 border-b border-border bg-surface-hover flex justify-between items-center">
              <h3 className="font-semibold text-lg flex items-center gap-3">
                <span className="bg-warning text-white px-2 py-1 rounded text-xs">PATCH</span>
                /api/v1/deployments
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-foreground">Approve a gated deployment, cancel it, or initiate a rollback to a healthy state.</p>
              <h4 className="font-semibold text-sm">Payload</h4>
              <pre className="text-xs font-mono text-muted-foreground bg-black p-3 rounded">{`{
  "deploymentId": "uuid",
  "action": "approve" | "rollback" | "cancel"
}`}</pre>
            </div>
          </div>

          {/* AI Chat Streaming */}
          <div className="glass rounded-xl overflow-hidden border border-border border-l-4 border-l-accent">
            <div className="px-6 py-4 border-b border-border bg-surface-hover flex justify-between items-center">
              <h3 className="font-semibold text-lg flex items-center gap-3">
                <span className="bg-success text-white px-2 py-1 rounded text-xs">POST</span>
                /api/v1/ai/assistant/chat
              </h3>
              <span className="bg-accent/20 text-accent text-xs px-2 py-1 rounded">Server-Sent Events</span>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-foreground">Initiate a conversation with the Copilot AI engine. Requires context objects. The response uses SSE (Server-Sent Events) to stream tokens dynamically in real time.</p>
            </div>
          </div>

        </div>
      </section>

    </div>
  );
}
