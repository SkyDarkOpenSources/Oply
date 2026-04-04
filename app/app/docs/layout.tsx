import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Oply Documentation | CI/CD Platform',
  description: 'Complete architecture, API, and CLI documentation for the Oply Autonomous Software Delivery Platform.',
};

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      {/* Docs Header */}
      <header className="sticky top-0 z-40 w-full glass border-b border-border">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-purple-500 flex items-center justify-center">
                <span className="text-white font-bold text-sm">O</span>
              </div>
              <span className="text-xl font-bold tracking-tight gradient-text">Oply Docs</span>
            </a>
          </div>
          <nav className="flex items-center gap-6">
            <a href="/docs" className="text-sm font-medium text-foreground hover:text-accent transition-colors">Overview</a>
            <a href="/docs/api" className="text-sm font-medium text-muted hover:text-foreground transition-colors">API Reference</a>
            <a href="/docs/cli" className="text-sm font-medium text-muted hover:text-foreground transition-colors">CLI Guide</a>
            <a href="/dashboard" className="btn-primary text-sm px-4 py-2">Go to Dashboard</a>
          </nav>
        </div>
      </header>

      {/* Docs Layout */}
      <div className="container mx-auto px-6 py-12 flex items-start gap-12">
        {/* Sidebar */}
        <aside className="w-64 shrink-0 sticky top-28 hidden lg:block">
          <nav className="space-y-8 text-sm">
            <div>
              <h4 className="font-semibold text-foreground mb-3 uppercase tracking-wider text-xs">Getting Started</h4>
              <ul className="space-y-2">
                <li><a href="/docs" className="text-muted hover:text-accent transition-colors">Introduction</a></li>
                <li><a href="/docs/architecture" className="text-muted hover:text-accent transition-colors">Architecture</a></li>
                <li><a href="/docs#quickstart" className="text-muted hover:text-accent transition-colors">Quick Start</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-foreground mb-3 uppercase tracking-wider text-xs">Platform</h4>
              <ul className="space-y-2">
                <li><a href="/docs#ai-engine" className="text-muted hover:text-accent transition-colors">AI Engine & Copilot</a></li>
                <li><a href="/docs#pipelines" className="text-muted hover:text-accent transition-colors">Pipeline Workflows</a></li>
                <li><a href="/docs#deployments" className="text-muted hover:text-accent transition-colors">Deployments & Rollbacks</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-3 uppercase tracking-wider text-xs">References</h4>
              <ul className="space-y-2">
                <li><a href="/docs/api" className="text-accent font-medium">API Documentation</a></li>
                <li><a href="/docs/cli" className="text-muted hover:text-accent transition-colors">CLI Reference</a></li>
              </ul>
            </div>
          </nav>
        </aside>

        {/* Content */}
        <main className="flex-1 max-w-4xl max-w-none animate-fade-in">
          <div className="prose prose-invert prose-blue max-w-none prose-headings:scroll-mt-28">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
