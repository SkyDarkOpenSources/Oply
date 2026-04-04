# Full System Architecture & Modular Breakdown

Oply requires a highly distributed, resilient, and event-driven architecture capable of orchestrating complex workloads and interacting dynamically with AI models.

## 1. System Architecture Diagram (Mermaid)

```mermaid
graph TD
    %% Frontend Layer
    subgraph Frontend [Dashboard & UX]
        UI[Next.js Dashboard App]
        Companion[AI Chat Assistant integrated]
    end

    %% API Layer
    subgraph APILayer [API Gateway & Identity]
        Gateway[API Gateway / BFF]
        Auth[Auth & RBAC Service]
    end

    %% Core Engine
    subgraph Backend [Core Orchestration Backend]
        Engine[Pipeline Orchestration Engine]
        RepoMgmt[Repository & Webhook Manager]
        DeployMgmt[Deployment Manager]
    end

    %% Message Broker
    subgraph MessageBroker [Event Bus & Queues]
        Kafka[Kafka / RabbitMQ]
        Redis[Redis Queue / Caching]
    end

    %% Execution Engines
    subgraph Workers [Execution Workers Layer]
        Build[Docker Build Workers]
        Deploy[Kubernetes Deploy Workers]
        Testing[Test Runner Workers]
    end

    %% AI Modules Layer
    subgraph AISystem [AI Engine & Models]
        Analyzer[Code Understanding Analyzer]
        Generator[Pipeline Generator Model]
        Predictor[Failure Risk Predictor]
        AutoFix[Auto-Fix Recommendation]
        VectorDB[(Vector DB / Pinecone)]
    end

    %% Data Layer
    subgraph Data [Persistence Layer]
        Postgres[(PostgreSQL Main DB)]
        S3[(S3 Log & Artifact Store)]
    end

    %% Infrastructure & Observability
    subgraph Infra [Cloud & Clusters]
        K8s[Kubernetes Clusters]
        AWS[AWS/GCP/Azure]
        Prometheus[Prometheus & Grafana]
    end

    %% Flow
    UI --> |GraphQL/REST| Gateway
    Gateway --> Auth
    Gateway --> Engine
    Engine --> Kafka
    Kafka --> Workers
    Workers --> |Stream Logs| Redis
    Redis --> |WebSocket| UI
    
    Workers --> Postgres
    Workers --> S3
    
    RepoMgmt --> Analyzer
    Analyzer --> Generator
    Engine --> Generator
    
    Workers --> DeployMgmt
    DeployMgmt --> K8s
    DeployMgmt --> AWS
    
    Engine --> Predictor
    Workers --> AutoFix
    
    Companion --> Analyzer
    Companion --> AutoFix
    
    K8s --> Prometheus
    Prometheus --> |Webhooks| Engine
```

## 2. Modular Breakdown (Services and Responsibilities)

### 2.1. Gateway API Service (Node.js/NestJS)
- **Responsibility:** Act as the main entry point for the frontend, routing requests.
- **Functions:** Authentication, RBAC (Role-Based Access Control), rate limiting, GraphQL resolution.

### 2.2. Core Orchestrator Service (Go / NestJS)
- **Responsibility:** The centralized "brain" that tracks state transitions.
- **Functions:** Translates AI-generated workflows into actionable tasks, manages states (Pending, Running, Success, Failed). Integrates with Kafka.

### 2.3. AI Intelligence Service (Python / FastAPI)
- **Responsibility:** Hosts endpoints that interact with LLMs, orchestrates RAG (Retrieval-Augmented Generation).
- **Functions:** Handles prompt engineering for Pipeline Generation, Risk Prediction, Code Understanding, and the AI Assistant. Connects to Vector DB.

### 2.4. Worker Services (Go / Node.js)
- **Responsibility:** Heavy lifting and task execution.
- **Functions:** 
  - **Builder Worker:** Runs `docker build`, pushes to registries.
  - **Deploy Worker:** Applies YAML, Helm charts, triggers deployments.
  - **Log Aggregator Worker:** Collects running logs and pushes them into S3 and Redis streams for the frontend.

### 2.5. Telemetry & Observability Aggregator
- **Responsibility:** Ingests metric data from target environments.
- **Functions:** Parses Prometheus metrics, triggers Auto-rollback if error rates increase unexpectedly (connecting back to the Core Orchestrator).

## 3. Kubernetes Deployment Strategy

Oply's deployment architecture allows it to run inside the user's infrastructure natively. 

### Multi-Cloud & Cluster Integration
- **Agent-based Architecture:** Oply deploys a lightweight "Agent Pod" into the target user Kubernetes cluster.
- **Polling over Pushing:** To bypass restrictive firewalls, the Oply Agent securely polls the Oply Control Plane via HTTPS for pending deployment instructions, avoiding the need to expose user clusters to inbound traffic.
- **Deployment Lifecycle:**
  1. The API instructs a new deployment.
  2. The target Agent fetches the manifest.
  3. The Agent executes a Canary or Blue/Green deployment using Argo Rollouts or native K8s Deployment configurations.
  4. The Agent monitors health checks. If the readiness probes fail or error metrics spike, it automatically reverts the state and notifies the Core Engine for Failure Analysis.
