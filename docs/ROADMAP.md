# Implementation Roadmap & Constraints

Oply takes a phased approach to building its autonomous capabilities. Trying to build "Self-healing Kubernetes deployments" before creating basic pipeline orchestrations is dangerous.

## MVP Strategy: Phased Rollout

### Phase 1: Core CI Foundation (Months 1-2)
- Focus: Establishing the baseline engine.
- Deliverables:
  - Database, Next.js Dashboard, Github Webhook integrations.
  - "Pipeline Generator" AI model implementation. 
  - Central Orchestrator creating simple Docker build + test tasks on a local worker.
- Value Prop: Users don't write yaml. Oply watches Github and provides build artifacts automatically.

### Phase 2: Deployment & Observability (Months 3-4)
- Focus: Moving artifacts to production.
- Deliverables:
  - Agent-based Kubernetes deployments. 
  - Hooking into basic Observability metrics (Prometheus scraping).
  - Introduction of the Dashboard AI Assistant to manually explain pipeline and deployment errors.
- Value Prop: See all your microservices graphically, deploy directly to K8s from the UI without writing Helm charts.

### Phase 3: Risk Prediction & Auto-Fixes (Months 5-6)
- Focus: Pre-emptive AI intelligence.
- Deliverables:
  - Risk Model trained on the user's historical deployment success/failure.
  - The "Auto-Fix Engine" that generates PRs when it detects standard errors (e.g. dependency conflict patches).
- Value Prop: Deployments require less oversight. Broken builds auto-generate PRs fixing the code immediately.

### Phase 4: Full Autonomous Execution (Months 7+)
- Focus: Loop-closure. The system starts making decisions without humans.
- Deliverables:
  - Self-healing deployments: If Oply pushes an update, and error metrics spike, Oply automatically triggers a rollback.
  - Multi-cloud federation: Routing traffic to GCP if AWS is failing autonomously.
- Value Prop: A real "Zero-DevOps" platform where humans only write code and monitor the master dashboard.

---

## Important System Constraints & Considerations

1. **Enterprise Scalability:** Single-point-of-failures must be avoided. The Central Orchestrator should run in an HA cluster mode. Redis queues must be persistent.
2. **"Read-only" Rollouts First:** Before enabling *autonomous* self-healing (which can be destructive or confusing), the AI must prompt the user with "Rollback suggested. Approve?" until trust is established.
3. **Data Privacy / AI Studio:** Enterprise code should be handled with privacy in mind. While we default to **Google Gemini 1.5 Pro** via AI Studio, the AI Intelligence service should allow pluggable models so users can provide their own Anthropic Claude endpoints or local Llama 3 weights.
4. **Seamless Integration vs Replacement:** Many organizations have existing GitHub Actions. Oply must be able to visually represent and wrap around external GitHub Actions initially before replacing them entirely with the native Oply execution graph.
