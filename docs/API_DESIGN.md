# API Design (REST & GraphQL)

Oply utilizes a hybrid API strategy.
- **GraphQL** is used extensively by the Dashboard for efficient, nested fetching (e.g., getting a Project, its Repositories, current Pipeline runs, and Deployment statuses in a single round-trip).
- **REST APIs** are used for webhooks, agent check-ins, and external CI/CD integrations via CLI.

## Core REST Endpoints

### 1. Webhooks & Integrations
- `POST /api/v1/webhooks/github`
  - Consumes push/pull_request events from GitHub.
  - Matches payloads against stored Repositories and triggers Workflows.

### 2. Agent Comms (Cluster Integrations)
- `POST /api/v1/agent/connect`
  - Authenticates a remote Kubernetes agent.
- `GET /api/v1/agent/tasks` (Long-polling / WebSocket)
  - Remote agent requests pending deploy instructions.
- `POST /api/v1/agent/metrics`
  - Agent pushes cluster health metrics back to the core platform.

### 3. AI Copilot Integration
- `POST /api/v1/ai/assistant/chat`
  - **Body:** `{ "context": { "pipelineRunId": "123" }, "message": "Why did my build fail?" }`
  - Streams response back (uses SSE - Server Sent Events).

## GraphQL Schema Overview (Frontend Consumption)

```graphql
type Query {
  # Dashboard Overviews
  getProjectOverview(projectId: ID!): ProjectAnalytics
  
  # Pipeline & Workflows
  getWorkflows(repositoryId: ID!): [Workflow!]!
  getPipelineRunDetails(pipelineRunId: ID!): PipelineRunDetail
  
  # Service Map
  getServiceMap(environmentId: ID!): ServiceGraph
}

type Mutation {
  # AI Driven Interactions
  generatePipelineForRepo(repositoryId: ID!): WorkflowProposal!
  requestAutoFix(taskId: ID!): AutoFixResult!
  
  # Pipeline actions
  triggerWorkflow(workflowId: ID!, params: JSON): PipelineRun
  approveDeployment(deploymentId: ID!): DeploymentStatus
  rollbackDeployment(deploymentId: ID!): DeploymentStatus
}

type PipelineRunDetail {
  id: ID!
  status: RunStatus!
  tasks: [TaskDetail!]!
  aiAnalysis: AIInsight
  riskScore: Int
}

type AIInsight {
  rootCause: String
  confidence: Float
  suggestedFixContext: String
}
```

## Security & Rate Limiting Overview
- All external API endpoints are protected using standard JWT access tokens.
- Role-based authorization middleware intercepts routes (e.g., checking if the user's role is `ADMIN` to perform an `approveDeployment` mutation).
- Rate-limiting is strictly applied on the AI endpoints to preserve token budgets and infrastructure limits.
