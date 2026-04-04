"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

/* ═══════════════════════════════════════════════════════════
   Oply Landing Page — Marketing & Product Showcase
   ═══════════════════════════════════════════════════════════ */

// Terminal animation lines
const terminalLines = [
  { text: "$ oply init --repo github.com/acme/api", delay: 0 },
  { text: "✓ Repository connected. Scanning file structure...", delay: 800 },
  { text: "✓ Detected: Node.js 22 / NestJS / PostgreSQL", delay: 1600 },
  { text: "✓ AI generated pipeline: Lint → Test → Build → Deploy", delay: 2400 },
  { text: "✓ Risk Score: 12/100 — Auto-approved for staging", delay: 3200 },
  { text: "✓ Deployed to staging-cluster in 47s", delay: 4000 },
  { text: "✓ Health checks passing. Zero downtime. ✨", delay: 4800 },
];

function AnimatedTerminal() {
  const [visibleLines, setVisibleLines] = useState(0);

  useEffect(() => {
    const timers = terminalLines.map((line, i) =>
      setTimeout(() => setVisibleLines(i + 1), line.delay)
    );
    const resetTimer = setTimeout(() => setVisibleLines(0), 7000);
    const restartTimer = setTimeout(() => {
      setVisibleLines(0);
      // Restart animation
    }, 7500);
    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(resetTimer);
      clearTimeout(restartTimer);
    };
  }, [visibleLines]);

  useEffect(() => {
    if (visibleLines === 0) {
      const timer = setTimeout(() => setVisibleLines(1), 500);
      return () => clearTimeout(timer);
    }
  }, [visibleLines]);

  return (
    <div className="glass rounded-2xl overflow-hidden max-w-2xl w-full">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <div className="w-3 h-3 rounded-full bg-danger/80" />
        <div className="w-3 h-3 rounded-full bg-warning/80" />
        <div className="w-3 h-3 rounded-full bg-success/80" />
        <span className="text-muted text-xs ml-2 font-mono">oply — pipeline</span>
      </div>
      <div className="p-5 font-mono text-sm space-y-1.5 min-h-[240px]">
        {terminalLines.slice(0, visibleLines).map((line, i) => (
          <div
            key={i}
            className="animate-fade-in"
            style={{ animationDelay: `${i * 0.1}s` }}
          >
            {line.text.startsWith("$") ? (
              <span className="text-muted">{line.text}</span>
            ) : line.text.includes("✓") ? (
              <span className="text-success">{line.text}</span>
            ) : (
              <span className="text-foreground">{line.text}</span>
            )}
          </div>
        ))}
        {visibleLines < terminalLines.length && (
          <span className="inline-block w-2 h-4 bg-accent animate-blink" />
        )}
      </div>
    </div>
  );
}

// Pipeline DAG visualization
function PipelineDAG() {
  const nodes = [
    { id: "lint", label: "Lint", status: "success", x: 50, y: 80 },
    { id: "test", label: "Unit Test", status: "success", x: 220, y: 40 },
    { id: "e2e", label: "E2E Test", status: "success", x: 220, y: 120 },
    { id: "build", label: "Build", status: "running", x: 400, y: 80 },
    { id: "scan", label: "Security", status: "pending", x: 570, y: 40 },
    { id: "deploy", label: "Deploy", status: "pending", x: 570, y: 120 },
  ];
  const edges = [
    [0, 1], [0, 2], [1, 3], [2, 3], [3, 4], [3, 5],
  ];

  return (
    <svg viewBox="0 0 680 170" className="w-full max-w-3xl">
      {/* Edges */}
      {edges.map(([from, to], i) => (
        <line
          key={`e-${i}`}
          x1={nodes[from].x + 60}
          y1={nodes[from].y + 18}
          x2={nodes[to].x}
          y2={nodes[to].y + 18}
          stroke={nodes[from].status === "success" ? "#10b981" : "#1e2235"}
          strokeWidth={2}
          strokeDasharray={nodes[from].status !== "success" ? "6 4" : "none"}
        />
      ))}
      {/* Nodes */}
      {nodes.map((node) => (
        <g key={node.id}>
          <rect
            x={node.x}
            y={node.y}
            width={110}
            height={36}
            rx={10}
            fill={
              node.status === "success"
                ? "rgba(16, 185, 129, 0.1)"
                : node.status === "running"
                ? "rgba(99, 102, 241, 0.15)"
                : "rgba(18, 20, 28, 0.8)"
            }
            stroke={
              node.status === "success"
                ? "#10b981"
                : node.status === "running"
                ? "#6366f1"
                : "#1e2235"
            }
            strokeWidth={1.5}
          />
          <circle
            cx={node.x + 16}
            cy={node.y + 18}
            r={4}
            fill={
              node.status === "success"
                ? "#10b981"
                : node.status === "running"
                ? "#6366f1"
                : "#64748b"
            }
          >
            {node.status === "running" && (
              <animate attributeName="opacity" values="1;0.3;1" dur="1.5s" repeatCount="indefinite" />
            )}
          </circle>
          <text
            x={node.x + 30}
            y={node.y + 22}
            fill="#e2e8f0"
            fontSize={13}
            fontFamily="Inter, sans-serif"
            fontWeight={500}
          >
            {node.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

const features = [
  {
    icon: "🤖",
    title: "AI Pipeline Generator",
    description:
      "Push code. Oply reads your repo, detects your stack, and generates an optimized build pipeline as a DAG. No YAML required.",
  },
  {
    icon: "🛡️",
    title: "Deployment Risk Predictor",
    description:
      "Before every deploy, an AI model scores the risk (0–100) based on commit diff, test coverage, and failure history.",
  },
  {
    icon: "🔧",
    title: "Auto-Fix Engine",
    description:
      "When builds fail, the Failure Analysis AI reads your logs and git diff, then generates a patch or fix command automatically.",
  },
  {
    icon: "☸️",
    title: "Kubernetes Native",
    description:
      "Agent-based architecture deploys to any K8s cluster. Supports Canary, Blue/Green, and Rolling strategies out of the box.",
  },
  {
    icon: "💬",
    title: "AI Copilot",
    description:
      'An embedded DevOps assistant with full context — ask "Why is memory spiking in staging?" and get real answers.',
  },
  {
    icon: "📊",
    title: "Observability Hub",
    description:
      "Prometheus metrics, log aggregation, and service maps in one view. Auto-rollback when error rates spike.",
  },
];

const stats = [
  { value: "10×", label: "Faster Deployments" },
  { value: "Zero", label: "YAML Written" },
  { value: "99.9%", label: "Uptime SLA" },
  { value: "<60s", label: "Avg Deploy Time" },
];

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* ─── Navbar ─────────────────────────────────────── */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? "glass py-3" : "py-5"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-purple-500 flex items-center justify-center">
              <span className="text-white font-bold text-sm">O</span>
            </div>
            <span className="text-xl font-bold tracking-tight gradient-text">
              Oply
            </span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-muted hover:text-foreground transition-colors">
              Features
            </a>
            <a href="#pipeline" className="text-sm text-muted hover:text-foreground transition-colors">
              Pipeline
            </a>
            <Link href="/docs" className="text-sm text-muted hover:text-foreground transition-colors">
              Docs
            </Link>
            <a href="#pricing" className="text-sm text-muted hover:text-foreground transition-colors">
              Pricing
            </a>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted hover:text-foreground transition-colors"
            >
              GitHub
            </a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="btn-secondary text-sm !py-2 !px-4">
              Sign In
            </Link>
            <Link href="/login" className="btn-primary text-sm !py-2 !px-4">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── Hero Section ───────────────────────────────── */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        {/* Animated gradient orbs */}
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-accent/10 rounded-full blur-[120px] animate-pulse-glow" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-purple-600/10 rounded-full blur-[100px] animate-pulse-glow" style={{ animationDelay: "1s" }} />

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center max-w-4xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-light text-sm text-muted mb-6">
              <span className="status-dot status-success" />
              Now in Public Beta — v1.0
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-tight mb-6">
              <span className="text-foreground">Software Delivery,</span>
              <br />
              <span className="gradient-text">Fully Autonomous</span>
            </h1>
            <p className="text-lg md:text-xl text-muted max-w-2xl mx-auto leading-relaxed">
              Oply is an AI-powered CI/CD platform that replaces YAML with
              intelligence. Push code and watch an AI engine build, test, deploy,
              monitor, and self-heal — autonomously.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
              <Link href="/login" className="btn-primary text-base !py-3 !px-8">
                Start Deploying Free →
              </Link>
              <a
                href="#pipeline"
                className="btn-secondary text-base !py-3 !px-8"
              >
                Watch It Work
              </a>
            </div>
          </div>

          {/* Animated Terminal */}
          <div className="flex justify-center">
            <AnimatedTerminal />
          </div>
        </div>
      </section>

      {/* ─── Stats Bar ──────────────────────────────────── */}
      <section className="py-12 border-y border-border">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, i) => (
            <div key={i} className="text-center">
              <div className="text-3xl md:text-4xl font-bold gradient-text-accent mb-2">
                {stat.value}
              </div>
              <div className="text-sm text-muted">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Pipeline Visualization ─────────────────────── */}
      <section id="pipeline" className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Dynamic Execution Graph
            </h2>
            <p className="text-muted text-lg max-w-2xl mx-auto">
              No static YAML. Oply&apos;s AI generates a DAG — a directed
              acyclic graph — tailored to your repository. Each node executes in
              parallel when dependencies allow.
            </p>
          </div>
          <div className="flex justify-center glass rounded-2xl p-10">
            <PipelineDAG />
          </div>
        </div>
      </section>

      {/* ─── Features Grid ──────────────────────────────── */}
      <section id="features" className="py-24 bg-surface/30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Built for Serious Engineering
            </h2>
            <p className="text-muted text-lg max-w-2xl mx-auto">
              Every feature is designed by engineers, for engineers. From AI
              pipeline generation to automatic rollbacks.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <div
                key={i}
                className="glass rounded-2xl p-6 hover:border-accent/30 transition-all duration-300 group cursor-default"
              >
                <div className="text-3xl mb-4">{f.icon}</div>
                <h3 className="text-lg font-semibold mb-2 group-hover:text-accent transition-colors">
                  {f.title}
                </h3>
                <p className="text-sm text-muted leading-relaxed">
                  {f.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How It Works ───────────────────────────────── */}
      <section className="py-24">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Three Steps to Autonomous
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Connect Repository",
                desc: "Link your GitHub, GitLab, or Bitbucket repo. Oply installs a webhook and scans your codebase.",
              },
              {
                step: "02",
                title: "AI Generates Pipeline",
                desc: "Our AI reads your lockfiles, Dockerfiles, and config to build an optimized execution graph.",
              },
              {
                step: "03",
                title: "Push & Deploy",
                desc: "Every commit triggers the pipeline. AI scores risk, deploys to K8s, and auto-heals failures.",
              },
            ].map((item, i) => (
              <div key={i} className="relative">
                <div className="text-6xl font-black text-accent/10 mb-2">
                  {item.step}
                </div>
                <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-muted leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Pricing ────────────────────────────────────── */}
      <section id="pricing" className="py-24 bg-surface/30">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Simple, Transparent Pricing
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                name: "Open Source",
                price: "Free",
                desc: "For side projects and OSS",
                features: [
                  "3 Projects",
                  "AI Pipeline Generation",
                  "Community Support",
                  "Docker Builds",
                  "Basic Logs",
                ],
                cta: "Get Started",
                highlighted: false,
              },
              {
                name: "Pro",
                price: "$49",
                desc: "For growing teams",
                features: [
                  "Unlimited Projects",
                  "AI Copilot & Auto-Fix",
                  "Risk Prediction",
                  "Multi-Env Kubernetes",
                  "Priority Support",
                  "Advanced Observability",
                ],
                cta: "Start Free Trial",
                highlighted: true,
              },
              {
                name: "Enterprise",
                price: "Custom",
                desc: "For organizations at scale",
                features: [
                  "Everything in Pro",
                  "Self-Hosted / Air-Gapped",
                  "RBAC & SSO / SAML",
                  "Custom AI Model (BYO LLM)",
                  "SLA & Dedicated Support",
                  "Multi-Cloud Federation",
                ],
                cta: "Contact Sales",
                highlighted: false,
              },
            ].map((plan, i) => (
              <div
                key={i}
                className={`rounded-2xl p-8 flex flex-col ${
                  plan.highlighted
                    ? "glass glow-accent border-accent/30"
                    : "glass"
                }`}
              >
                <h3 className="text-lg font-semibold mb-1">{plan.name}</h3>
                <div className="text-3xl font-bold mb-1">
                  {plan.price}
                  {plan.price !== "Free" && plan.price !== "Custom" && (
                    <span className="text-sm text-muted font-normal">
                      /month
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted mb-6">{plan.desc}</p>
                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-center gap-2 text-sm">
                      <span className="text-success">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/login"
                  className={`text-center rounded-xl py-2.5 font-medium text-sm transition-all ${
                    plan.highlighted
                      ? "btn-primary !rounded-xl"
                      : "btn-secondary !rounded-xl"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ────────────────────────────────────────── */}
      <section className="py-24">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Stop Writing YAML.
            <br />
            <span className="gradient-text">Start Shipping.</span>
          </h2>
          <p className="text-muted text-lg mb-8 max-w-xl mx-auto">
            Join thousands of engineers who replaced fragile CI/CD configs with
            an AI that understands their code.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/login" className="btn-primary text-base !py-3 !px-8">
              Deploy Your First Project →
            </Link>
          </div>
          <p className="text-xs text-muted mt-4">
            Free tier. No credit card required.
          </p>
        </div>
      </section>

      {/* ─── Footer ─────────────────────────────────────── */}
      <footer className="border-t border-border py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent to-purple-500 flex items-center justify-center">
                  <span className="text-white font-bold text-xs">O</span>
                </div>
                <span className="text-lg font-bold gradient-text">Oply</span>
              </div>
              <p className="text-xs text-muted leading-relaxed">
                Autonomous Software Delivery.
                <br />
                AI-powered. Zero-YAML.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-3">Product</h4>
              <ul className="space-y-2 text-sm text-muted">
                <li><a href="#features" className="hover:text-foreground transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a></li>
                <li><a href="#pipeline" className="hover:text-foreground transition-colors">Pipeline Engine</a></li>
                <li><Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-3">Resources</h4>
              <ul className="space-y-2 text-sm text-muted">
                <li><a href="#" className="hover:text-foreground transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">API Reference</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">CLI Guide</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Changelog</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-3">Company</h4>
              <ul className="space-y-2 text-sm text-muted">
                <li><a href="#" className="hover:text-foreground transition-colors">About</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Contact</a></li>
              </ul>
            </div>
          </div>
          <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-border">
            <p className="text-xs text-muted">
              © {new Date().getFullYear()} Oply. All rights reserved.
            </p>
            <div className="flex gap-6 mt-4 md:mt-0">
              <a href="#" className="text-xs text-muted hover:text-foreground transition-colors">
                Privacy
              </a>
              <a href="#" className="text-xs text-muted hover:text-foreground transition-colors">
                Terms
              </a>
              <a href="#" className="text-xs text-muted hover:text-foreground transition-colors">
                Security
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
