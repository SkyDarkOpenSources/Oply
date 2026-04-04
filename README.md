<div align="center">

# ⚡ Oply v1.0.0

### Autonomous Software Delivery Platform

**AI-powered CI/CD that replaces YAML with intelligence.**

Push code → AI generates pipelines → Deploys to Kubernetes → Self-heals failures.

[![License: MIT](https://img.shields.io/badge/License-MIT-6366f1.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-black.svg)](https://nextjs.org)
[![Drizzle](https://img.shields.io/badge/Drizzle-ORM-10b981.svg)](https://orm.drizzle.team)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6.svg)](https://www.typescriptlang.org)

</div>

---

## What is Oply?

Oply is an **enterprise-grade, autonomous software delivery platform** that acts as the "brain" of your CI/CD pipeline. Instead of writing YAML configs, Oply's AI engine:

1. **Scans your repository** — detects language, framework, and dependencies
2. **Generates an execution DAG** — a directed acyclic graph of build/test/deploy steps
3. **Executes the pipeline** — builds Docker images, runs tests, pushes artifacts
4. **Predicts deployment risk** — AI scores each deploy (0–100) before it goes live
5. **Self-heals failures** — auto-analyzes errors, generates patches, triggers rollbacks

> **Think of Oply as Vercel + GitHub Actions + PagerDuty — powered by AI, with zero YAML.**

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     OPLY PLATFORM                               │
│                                                                 │
│  ┌──────────┐   ┌──────────────┐   ┌──────────────────────┐   │
│  │ Dashboard │◄──│ API Gateway  │◄──│ GitHub Webhooks      │   │
│  │ (Next.js) │   │ (REST + SSE) │   │ (push/PR triggers)   │   │
│  └──────────┘   └──────────────┘   └──────────────────────┘   │
│       │               │                       │                 │
│       │          ┌─────▼─────┐          ┌─────▼─────┐          │
│       │          │ PostgreSQL│          │ AI Engine  │          │
│       │          │ (Drizzle) │          │ (OpenAI)   │          │
│       │          └───────────┘          └───────────┘          │
│       │               │                       │                 │
│  ┌────▼────┐    ┌─────▼─────┐          ┌─────▼─────┐          │
│  │ Copilot │    │   Redis   │          │ Pipeline  │          │
│  │ (Chat)  │    │ (BullMQ)  │──────────│ Workers   │          │
│  └─────────┘    └───────────┘          └───────────┘          │
│                                              │                  │
│                                   ┌──────────▼──────────┐      │
│                                   │  Docker + K8s +AWS  │      │
│                                   │  (Build & Deploy)   │      │
│                                   └─────────────────────┘      │
└─────────────────────────────────────────────────────────────────┘
```

### Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | Next.js 16, Tailwind CSS 4 | Dashboard & landing page |
| Database | PostgreSQL + Drizzle ORM | Persistent storage |
| Auth | NextAuth v5 (GitHub + Google OAuth) | User authentication |
| AI | OpenAI GPT-4o | Copilot, pipeline gen, failure analysis |
| Queue | Redis + BullMQ | Job queue for pipeline execution |
| CLI | Node.js + Commander + Dockerode | Command-line interface |
| Infra | Docker, Kubernetes, AWS | Build, deploy, orchestrate |

---

## Project Structure

```
Oply/
├── .env.example              # Environment variables template
├── README.md                 # This file
├── docs/                     # Architecture blueprints
│   ├── ARCHITECTURE.md       # System architecture & diagrams
│   ├── DATABASE.md           # PostgreSQL schema design
│   ├── API_DESIGN.md         # REST & GraphQL API spec
│   ├── WORKFLOW_ENGINE.md    # CI/CD execution engine design
│   ├── AI_SYSTEM_AND_PROMPTS.md  # AI prompts & subsystems
│   ├── UI_UX_DASHBOARD.md   # Dashboard wireframes
│   └── ROADMAP.md            # Implementation phases
│
├── app/                      # Next.js Dashboard Application
│   ├── package.json
│   ├── drizzle.config.ts     # Drizzle ORM migration config
│   ├── next.config.ts
│   ├── lib/
│   │   ├── db/
│   │   │   ├── schema.ts     # Full Drizzle schema (10+ tables)
│   │   │   └── index.ts      # Database client singleton
│   │   ├── auth.ts           # NextAuth v5 config
│   │   └── ai/
│   │       └── prompts.ts    # AI system prompts
│   └── app/
│       ├── globals.css       # Design system
│       ├── layout.tsx        # Root layout
│       ├── page.tsx          # Landing page
│       ├── login/            # OAuth login
│       ├── dashboard/        # Protected dashboard
│       │   ├── page.tsx      # Overview with stats
│       │   ├── pipelines/    # Pipeline management & DAG viz
│       │   ├── deployments/  # Deployment table with risk scores
│       │   ├── environments/ # Cluster management (Dev/Staging/Prod)
│       │   ├── services/     # Service map graph topology
│       │   ├── logs/         # Real-time log explorer
│       │   ├── copilot/      # AI DevOps assistant chat
│       │   └── settings/     # Project & AI configuration
│       └── api/
│           ├── auth/         # NextAuth route handler
│           └── v1/
│               ├── webhooks/github/   # GitHub webhook processor
│               ├── pipelines/         # Pipeline CRUD + trigger
│               ├── deployments/       # Deploy + rollback
│               ├── projects/          # Project management
│               └── ai/assistant/chat/ # AI Copilot streaming
│
└── cli/                      # Oply CLI
    ├── package.json
    ├── bin/oply.js           # CLI entry point
    └── src/
        ├── index.js          # Commander program setup
        ├── config.js         # Persistent config (conf)
        ├── api.js            # API client (axios)
        └── commands/
            ├── init.js       # Project initialization
            ├── status.js     # Pipeline & deployment status
            ├── deploy.js     # Build, push, deploy workflow
            ├── logs.js       # K8s/Docker/pipeline log viewer
            ├── ai-debug.js   # AI failure analysis
            ├── pipeline.js   # Pipeline trigger & generate
            ├── docker.js     # Docker build/push/scan/prune
            ├── k8s.js        # kubectl operations
            └── rollback.js   # Deployment rollback
```

---

## Quick Start

### Prerequisites

- **Node.js 20+**
- **PostgreSQL** (local, Neon, or Supabase)
- **Docker** (for container operations)
- **kubectl** (for Kubernetes operations)

### 1. Clone & Configure

```bash
git clone https://github.com/SkyDarkOpenSources/oply.git
cd oply

# Copy environment template
cp .env.example .env
```

Edit `.env` with your credentials:

```env
# Required
DATABASE_URL=postgresql://user:pass@localhost:5432/oply
NEXTAUTH_SECRET=your-secret-here
NEXTAUTH_URL=http://localhost:3000

# OAuth (at least one)
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...

# AI (for Copilot & pipeline generation)
OPENAI_API_KEY=sk-...
```

### 2. Install & Setup Database

```bash
# Install dashboard dependencies
cd app
npm install

# Push database schema to PostgreSQL
npm run db:push

# Start the dashboard
npm run dev
```

### 3. Access the Dashboard

Open **http://localhost:3000** — you'll see the Oply landing page.

- Click **"Get Started"** → Sign in with GitHub or Google
- You'll land on the Dashboard with pipeline overview, deployments, and service maps.

### 4. Install & Use the CLI

```bash
# In a new terminal
cd cli
npm install

# Initialize a project
node bin/oply.js init

# Check pipeline status
node bin/oply.js status

# Deploy to staging
node bin/oply.js deploy --env staging

# AI debugging
node bin/oply.js ai-debug

# View Kubernetes pods
node bin/oply.js k8s status
```

---

## Dashboard Pages

| Page | Path | Description |
|------|------|-------------|
| **Overview** | `/dashboard` | Summary cards, recent pipeline runs, active deployments |
| **Pipelines** | `/dashboard/pipelines` | Workflow list, DAG visualization, run history |
| **Deployments** | `/dashboard/deployments` | Deploy table with risk scores, rollback actions |
| **Environments** | `/dashboard/environments` | Dev/Staging/Prod cluster cards with CPU/memory gauges |
| **Service Map** | `/dashboard/services` | Interactive SVG graph of infrastructure topology |
| **Logs** | `/dashboard/logs` | Real-time log stream with level filtering |
| **AI Copilot** | `/dashboard/copilot` | Chat with your DevOps AI assistant |
| **Settings** | `/dashboard/settings` | Project config, repo integration, AI settings |

---

## CLI Reference

```
COMMANDS:
  oply init                    Initialize Oply in current project
  oply status                  View pipeline & deployment status
  oply deploy [options]        Deploy to an environment
  oply logs [options]          View K8s/Docker/pipeline logs
  oply ai-debug                Interactive AI failure analysis
  oply pipeline trigger        Trigger a pipeline run
  oply pipeline generate       AI-generate a pipeline DAG
  oply docker build            Build Docker image
  oply docker push             Push image to registry
  oply docker scan             Security scan with Trivy
  oply docker ps               List running containers
  oply docker prune            Clean up Docker resources
  oply k8s status              Cluster & pod status
  oply k8s pods                List pods
  oply k8s apply               Apply K8s manifests
  oply k8s rollout             Check rollout status
  oply k8s scale               Scale deployment replicas
  oply k8s events              Recent cluster events
  oply rollback                Rollback a deployment

DEPLOY OPTIONS:
  -e, --env <env>              Target: dev, staging, production
  -i, --image <tag>            Docker image tag
  -s, --strategy <type>        rolling, canary, blue-green
  --skip-build                 Skip Docker build
  --skip-tests                 Skip test execution
  --dry-run                    Simulate without executing
```

### CLI Examples

```bash
# Initialize and scan your project
oply init --repo github.com/acme/api

# Deploy to staging with canary strategy
oply deploy --env staging --strategy canary

# AI debug a Docker build failure
oply ai-debug --error "npm ERR! ERESOLVE unable to resolve dependency tree"

# Build and push Docker image
oply docker build --tag myapp:v1.2.0
oply docker push --tag myapp:v1.2.0

# Scale production to 5 replicas
oply k8s scale -d api-gateway -r 5 -n production

# View K8s pod logs
oply logs --pod --namespace staging

# Emergency production rollback
oply rollback --env production --deployment api-gateway
```

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/webhooks/github` | GitHub webhook receiver |
| `GET` | `/api/v1/pipelines` | List pipeline runs |
| `POST` | `/api/v1/pipelines` | Trigger pipeline manually |
| `GET` | `/api/v1/projects` | List projects |
| `POST` | `/api/v1/projects` | Create project |
| `GET` | `/api/v1/deployments` | List deployments |
| `POST` | `/api/v1/deployments` | Create deployment |
| `PATCH` | `/api/v1/deployments` | Rollback / approve |
| `POST` | `/api/v1/ai/assistant/chat` | AI Copilot (SSE stream) |

---

## Database Schema

Managed with **Drizzle ORM**. Schema includes:

- `organization` — Multi-tenant org structure
- `user` — Users with roles (ADMIN, MEMBER, VIEWER)
- `project` — Projects owned by organizations
- `repository` — Git repos (GitHub, GitLab, Bitbucket)
- `environment` — Dev, Staging, Production clusters
- `workflow` — AI-generated pipeline definitions (DAG)
- `pipeline_run` — Execution records with AI analysis cache
- `task_run` — Individual pipeline step execution
- `deployment` — Deploy records with risk scores & rollback
- `ai_conversation` / `ai_message` — Copilot chat history

```bash
# Generate migrations
npm run db:generate

# Push schema changes
npm run db:push

# Open Drizzle Studio (visual DB browser)
npm run db:studio
```

---

## AI Subsystems

Oply uses four AI models (documented in `docs/AI_SYSTEM_AND_PROMPTS.md`):

| Subsystem | Purpose | Trigger |
|-----------|---------|---------|
| **Pipeline Generator** | Analyzes repo → generates build DAG | On repo connect / `oply init` |
| **Risk Predictor** | Scores deployment risk 0–100 | Before every deployment |
| **Failure Analyzer** | Root-cause analysis + auto-fix patches | On pipeline failure |
| **Copilot Assistant** | Conversational DevOps assistant | Dashboard chat / `oply ai-debug` |

---

## Environment Variables

See [`.env.example`](.env.example) for all configuration options:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | ✅ | Session encryption key |
| `NEXTAUTH_URL` | ✅ | App URL (http://localhost:3000) |
| `GITHUB_CLIENT_ID` | ✅ | GitHub OAuth app ID |
| `GITHUB_CLIENT_SECRET` | ✅ | GitHub OAuth secret |
| `GOOGLE_CLIENT_ID` | ◻️ | Google OAuth ID |
| `GOOGLE_CLIENT_SECRET` | ◻️ | Google OAuth secret |
| `OPENAI_API_KEY` | ◻️ | For AI Copilot & pipeline gen |
| `REDIS_URL` | ◻️ | BullMQ job queue |
| `GITHUB_WEBHOOK_SECRET` | ◻️ | Webhook signature verification |
| `DOCKER_REGISTRY_URL` | ◻️ | Docker registry for image pushes |

---

## Development

```bash
# Dashboard (Next.js)
cd app && npm run dev          # http://localhost:3000

# CLI (any directory)
cd cli && node bin/oply.js     # Shows help

# Database
cd app && npm run db:studio    # Visual DB browser
cd app && npm run db:push      # Push schema changes
```

---

## Blueprints & Documentation

Detailed system design documents are in the `docs/` folder:

- **[Architecture](docs/ARCHITECTURE.md)** — Full system diagram, modular breakdown, K8s deployment strategy
- **[Database](docs/DATABASE.md)** — PostgreSQL schema with ER diagram
- **[API Design](docs/API_DESIGN.md)** — REST & GraphQL endpoints, security
- **[Workflow Engine](docs/WORKFLOW_ENGINE.md)** — Dynamic DAG execution, BullMQ workers
- **[AI System](docs/AI_SYSTEM_AND_PROMPTS.md)** — All AI agent prompts and data flows
- **[UI/UX](docs/UI_UX_DASHBOARD.md)** — Dashboard wireframes and component spec
- **[Roadmap](docs/ROADMAP.md)** — 4-phase implementation plan

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

<div align="center">

**Built with ❤️ by engineers, for engineers.**

[Dashboard](http://localhost:3000) · [CLI Docs](#cli-reference) · [API Reference](#api-endpoints) · [Architecture](docs/ARCHITECTURE.md)

</div>
