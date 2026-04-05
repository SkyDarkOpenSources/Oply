import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Oply CLI Documentation',
  description: 'Complete architecture, API, and CLI documentation for the Oply Autonomous Software Delivery Platform.',
};

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-gray-200 selection:bg-[#00E5FF]/30 selection:text-white">
      {/* ─── Top Navbar ────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 w-full bg-[#0A0A0A]/80 backdrop-blur-md border-b border-white/10">
        <div className="h-16 px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-7 h-7 rounded shrink-0 bg-gradient-to-br from-[#00E5FF] to-[#007BFF] flex items-center justify-center shadow-[0_0_10px_rgba(0,229,255,0.3)] group-hover:shadow-[0_0_15px_rgba(0,229,255,0.5)] transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-black">
                  <path d="M 14 12 c -2.4 -3.2 -4.8 -4.8 -7.2 -4.8 a 4.8 4.8 0 1 0 0 9.6 c 2.4 0 4.8 -1.6 7.2 -4.8 Z M 14 12 c 1.6 2.13 3.2 3.2 4.8 3.2 a 3.2 3.2 0 1 0 0 -6.4 c -1.6 0 -3.2 1.07 -4.8 3.2 Z"/>
                </svg>
              </div>
              <span className="text-lg font-semibold tracking-tight text-white">Oply Docs</span>
            </Link>
          </div>
          <nav className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-xs text-gray-400">
              <span>Search documentation...</span>
              <kbd className="ml-4 font-mono text-[10px] px-1.5 py-0.5 rounded border border-white/10 bg-black">Ctrl K</kbd>
            </div>
            <a href="https://github.com" className="text-sm font-medium text-gray-400 hover:text-white flex items-center gap-2 transition-colors">
              GitHub
            </a>
          </nav>
        </div>
      </header>

      {/* ─── Main Layout ───────────────────────────────────────── */}
      <div className="flex max-w-[1536px] mx-auto items-start">
        
        {/* Left Sidebar */}
        <aside className="fixed top-16 z-30 hidden w-64 shrink-0 h-[calc(100vh-4rem)] overflow-y-auto border-r border-white/5 bg-[#0A0A0A] py-8 px-6 lg:block custom-scrollbar">
          <nav className="space-y-8 text-sm">
            <div>
              <h4 className="font-semibold text-white mb-3 text-xs tracking-wider">GETTING STARTED</h4>
              <ul className="space-y-1">
                <li>
                  <Link href="/docs" className="flex items-center px-3 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all">
                    Introduction
                  </Link>
                </li>
                <li>
                  <Link href="/docs/architecture" className="flex items-center px-3 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all">
                    Core Concepts
                  </Link>
                </li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-white mb-3 text-xs tracking-wider">CLI REFERENCE</h4>
              <ul className="space-y-1">
                <li>
                  <Link href="/docs/cli" className="flex items-center px-3 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00E5FF] mr-2"></span>
                    oply init
                  </Link>
                </li>
                <li>
                  <Link href="/docs/cli" className="flex items-center px-3 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all">
                    oply deploy
                  </Link>
                </li>
                <li>
                  <Link href="/docs/cli" className="flex items-center px-3 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all">
                    oply ai-debug
                  </Link>
                </li>
                <li>
                  <Link href="/docs/cli" className="flex items-center px-3 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all">
                    oply status
                  </Link>
                </li>
                <li>
                  <Link href="/docs/cli" className="flex items-center px-3 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all">
                    oply rollback
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-3 text-xs tracking-wider">SYSTEM</h4>
              <ul className="space-y-1">
                <li>
                  <Link href="/docs/api" className="flex items-center px-3 py-2 rounded-lg text-[#00E5FF] bg-[#00E5FF]/10 transition-all font-medium">
                    Store Architecture
                  </Link>
                </li>
              </ul>
            </div>
          </nav>
        </aside>

        {/* Content Area */}
        <main className="flex-1 lg:pl-64 py-12 px-6 lg:px-12 w-full animate-fade-in relative grid grid-cols-[1fr_240px] gap-12">
          
          <div className="prose prose-invert prose-blue max-w-none prose-headings:font-semibold prose-headings:tracking-tight prose-a:text-[#00E5FF] prose-a:no-underline hover:prose-a:underline prose-pre:bg-[#111111] prose-pre:border prose-pre:border-white/10 prose-code:text-[#00E5FF] prose-code:bg-[#00E5FF]/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none min-w-0">
            {/* Breadcrumb dummy */}
            <div className="flex items-center gap-2 text-sm text-gray-500 font-mono mb-8">
              <span>docs</span>
              <span>/</span>
              <span className="text-[#00E5FF]">overview</span>
            </div>

            {children}
          </div>

          {/* Right Sidebar (TOC) */}
          <div className="hidden xl:block">
            <div className="sticky top-28">
              <h4 className="font-semibold text-white mb-4 text-xs tracking-wider">ON THIS PAGE</h4>
              <ul className="space-y-3 text-sm text-gray-500 border-l border-white/10 pl-4">
                <li className="hover:text-white cursor-pointer transition-colors text-[#00E5FF]">Introduction</li>
                <li className="hover:text-white cursor-pointer transition-colors">Quick Start</li>
                <li className="hover:text-white cursor-pointer transition-colors">Architecture</li>
                <li className="hover:text-white cursor-pointer transition-colors">Integration</li>
              </ul>
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}
