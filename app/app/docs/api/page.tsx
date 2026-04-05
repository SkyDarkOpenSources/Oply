import { PageHeader, Callout, CodeBlock } from "@/components/DocsUI";

export default function DocsStorePage() {
  return (
    <div className="pb-20 animate-fade-in">
      <PageHeader 
        title="Store Architecture" 
        description="Oply operates on a completely local, git-integrated state model. Instead of relying on a centralized database, your repository is your source of truth." 
      />

      <hr className="border-white/10 my-10" />

      {/* ─── The .oply Store ───────────────────────────────────────── */}
      <h2 className="text-2xl font-semibold text-white mb-6">The <code className="bg-transparent px-0 text-white font-mono">.oply/</code> Directory</h2>
      <p className="text-gray-300 text-lg mb-8">
        When you run <code className="text-[#00E5FF] text-sm">oply init</code>, the CLI creates a local directory inside your repository. This acts as the store for pipeline state, deployment histories, and sensitive configuration.
      </p>
      
      <CodeBlock 
        title="File System"
        code={`.oply/
├── oply.config.json      # Primary DAG and configuration
├── .env.oply             # Local secrets (Added to .gitignore)
├── state/
│   ├── current.json      # Active environment state pointer
│   └── history.json      # Append-only log of pipeline runs
└── logs/
    └── run-1234.log      # Output from local or remote tasks`} 
      />

      <hr className="border-white/10 my-10" />

      {/* ─── Secrets Management ────────────────────────────────────── */}
      <h2 className="text-2xl font-semibold text-white mb-6">Security & Secrets</h2>
      <p className="text-gray-300 text-lg mb-8">
        Oply requires certain credentials to interact with LLMs (for AI debugging) and Cloud Providers (for deployments). These are inherently dangerous and therefore are securely managed via the local <code className="text-gray-400">.env.oply</code> file instead of global `.env` files.
      </p>

      <CodeBlock 
        language="bash"
        title=".env.oply"
        code={`# ═══════════════════════════════════════════════════
# Oply — Project Environment Variables
# This file is gitignored. Do NOT commit it.
# ═══════════════════════════════════════════════════

# OpenAI API Key (required for AI features)
OPENAI_API_KEY=sk-xxxxxxx

# Infrastructure & Version Control
KUBE_CONFIG_PATH=~/.kube/config
GITHUB_TOKEN=ghp_xxxxxxx
DOCKER_REGISTRY_URL=registry.digitalocean.com/acme`} 
      />
      
      <Callout type="warning" title="Gitignore Automation">
        Oply automatically injects `.env.oply` and `.oply/logs/` to your repository's `.gitignore` during the `init` script to prevent catastrophic API key leaks. Never commit this file.
      </Callout>

      <hr className="border-white/10 my-10" />

      {/* ─── State Synchronization ─────────────────────────────────── */}
      <h2 className="text-2xl font-semibold text-white mb-6">Git Integration</h2>
      <p className="text-gray-300 text-lg mb-4">
        Oply&apos;s rollback mechanisms rely entirely on Git rather than external snapshotting. The CLI issues standard `git revert` commands locally before generating the patch diff and applying it to your Kubernetes cluster.
      </p>
      <p className="text-gray-300 text-lg">
        Because the state is inherently tied to the commit hash, your `oply.config.json` travels with your code, allowing previous commits to securely maintain their historically accurate deployment DAGs.
      </p>

    </div>
  );
}
