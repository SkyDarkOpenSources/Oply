/**
 * Oply Database Schema — Drizzle ORM + PostgreSQL
 * 
 * This schema matches the design in docs/DATABASE.md exactly,
 * plus the NextAuth tables required for authentication.
 */

import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  primaryKey,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ═══════════════════════════════════════════════════════════
// NextAuth.js Tables (required for Drizzle adapter)
// ═══════════════════════════════════════════════════════════

export const accounts = pgTable("account", {
  userId: uuid("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 255 }).notNull(),
  provider: varchar("provider", { length: 255 }).notNull(),
  providerAccountId: varchar("providerAccountId", { length: 255 }).notNull(),
  refresh_token: text("refresh_token"),
  access_token: text("access_token"),
  expires_at: integer("expires_at"),
  token_type: varchar("token_type", { length: 255 }),
  scope: varchar("scope", { length: 255 }),
  id_token: text("id_token"),
  session_state: varchar("session_state", { length: 255 }),
}, (account) => [
  primaryKey({ columns: [account.provider, account.providerAccountId] })
]);

export const sessions = pgTable("session", {
  sessionToken: varchar("sessionToken", { length: 255 }).primaryKey(),
  userId: uuid("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable("verificationToken", {
  identifier: varchar("identifier", { length: 255 }).notNull(),
  token: varchar("token", { length: 255 }).notNull(),
  expires: timestamp("expires", { mode: "date" }).notNull(),
}, (vt) => [
  primaryKey({ columns: [vt.identifier, vt.token] })
]);

// ═══════════════════════════════════════════════════════════
// Core Identity — Organizations & Users
// ═══════════════════════════════════════════════════════════

export const organizations = pgTable("organization", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).unique(),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
});

export const users = pgTable("user", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 255 }).unique().notNull(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
  role: varchar("role", { length: 50 }).default("MEMBER").notNull(), // ADMIN, MEMBER, VIEWER
  organizationId: uuid("organizationId").references(() => organizations.id),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
});

// ═══════════════════════════════════════════════════════════
// Projects & Repositories
// ═══════════════════════════════════════════════════════════

export const projects = pgTable("project", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  organizationId: uuid("organizationId").references(() => organizations.id),
  createdById: uuid("createdById").references(() => users.id),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
});

export const repositories = pgTable("repository", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("projectId").references(() => projects.id, { onDelete: "cascade" }),
  provider: varchar("provider", { length: 50 }).notNull(), // GITHUB, GITLAB, BITBUCKET
  url: varchar("url", { length: 500 }).notNull(),
  branch: varchar("branch", { length: 255 }).default("main").notNull(),
  webhookId: varchar("webhookId", { length: 255 }),
  webhookSecret: varchar("webhookSecret", { length: 255 }),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
});

// ═══════════════════════════════════════════════════════════
// Environments (Dev, Staging, Production)
// ═══════════════════════════════════════════════════════════

export const environments = pgTable("environment", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("projectId").references(() => projects.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 50 }).notNull(), // DEV, STAGING, PRODUCTION
  clusterConfig: jsonb("clusterConfig"), // K8s connection details, agent IDs
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
});

// ═══════════════════════════════════════════════════════════
// Workflow Execution Engine
// ═══════════════════════════════════════════════════════════

export const workflows = pgTable("workflow", {
  id: uuid("id").defaultRandom().primaryKey(),
  repositoryId: uuid("repositoryId").references(() => repositories.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  // AI-generated DAG definition, triggers (push, schedule, manual)
  metadata: jsonb("metadata"),
  triggerType: varchar("triggerType", { length: 50 }).default("push").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
});

export const pipelineRuns = pgTable("pipeline_run", {
  id: uuid("id").defaultRandom().primaryKey(),
  workflowId: uuid("workflowId").references(() => workflows.id, { onDelete: "cascade" }),
  commitHash: varchar("commitHash", { length: 255 }),
  commitMessage: text("commitMessage"),
  triggeredBy: varchar("triggeredBy", { length: 255 }), // user email or 'webhook'
  status: varchar("status", { length: 50 }).default("QUEUED").notNull(), // QUEUED, RUNNING, SUCCESS, FAILED, CANCELLED
  startedAt: timestamp("startedAt", { mode: "date" }),
  completedAt: timestamp("completedAt", { mode: "date" }),
  durationMs: integer("durationMs"),
  // Cached AI failure analysis to avoid re-querying
  aiAnalysis: jsonb("aiAnalysis"),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
});

export const taskRuns = pgTable("task_run", {
  id: uuid("id").defaultRandom().primaryKey(),
  pipelineRunId: uuid("pipelineRunId").references(() => pipelineRuns.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(), // BUILD, TEST, LINT, DEPLOY, SECURITY_SCAN, NOTIFY
  status: varchar("status", { length: 50 }).default("PENDING").notNull(),
  command: text("command"), // e.g. "npm run build"
  dependsOn: jsonb("dependsOn").$type<string[]>(), // IDs of task_runs this depends on
  logsUrl: varchar("logsUrl", { length: 500 }),
  logs: text("logs"), // inline logs for fast access
  durationMs: integer("durationMs"),
  errorMessage: text("errorMessage"),
  startedAt: timestamp("startedAt", { mode: "date" }),
  completedAt: timestamp("completedAt", { mode: "date" }),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
});

export const deployments = pgTable("deployment", {
  id: uuid("id").defaultRandom().primaryKey(),
  pipelineRunId: uuid("pipelineRunId").references(() => pipelineRuns.id),
  environmentId: uuid("environmentId").references(() => environments.id),
  projectId: uuid("projectId").references(() => projects.id),
  version: varchar("version", { length: 100 }),
  imageTag: varchar("imageTag", { length: 500 }),
  strategy: varchar("strategy", { length: 50 }).default("ROLLING").notNull(), // ROLLING, CANARY, BLUE_GREEN
  status: varchar("status", { length: 50 }).default("PENDING").notNull(), // PENDING, PROGRESSING, HEALTHY, DEGRADED, ROLLED_BACK
  aiRiskScore: integer("aiRiskScore"), // 0–100
  aiRiskReasoning: text("aiRiskReasoning"),
  approvedBy: uuid("approvedBy").references(() => users.id),
  approvedAt: timestamp("approvedAt", { mode: "date" }),
  rolledBackAt: timestamp("rolledBackAt", { mode: "date" }),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
});

// ═══════════════════════════════════════════════════════════
// AI Conversation Logs (Copilot history)
// ═══════════════════════════════════════════════════════════

export const aiConversations = pgTable("ai_conversation", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("userId").references(() => users.id, { onDelete: "cascade" }),
  projectId: uuid("projectId").references(() => projects.id),
  title: varchar("title", { length: 255 }),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
});

export const aiMessages = pgTable("ai_message", {
  id: uuid("id").defaultRandom().primaryKey(),
  conversationId: uuid("conversationId").references(() => aiConversations.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 20 }).notNull(), // 'user' | 'assistant' | 'system'
  content: text("content").notNull(),
  metadata: jsonb("metadata"), // tokens used, model, etc.
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
});

// ═══════════════════════════════════════════════════════════
// Relations
// ═══════════════════════════════════════════════════════════

export const organizationRelations = relations(organizations, ({ many }) => ({
  users: many(users),
  projects: many(projects),
}));

export const userRelations = relations(users, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [users.organizationId],
    references: [organizations.id],
  }),
  accounts: many(accounts),
  sessions: many(sessions),
  aiConversations: many(aiConversations),
}));

export const projectRelations = relations(projects, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [projects.organizationId],
    references: [organizations.id],
  }),
  createdBy: one(users, {
    fields: [projects.createdById],
    references: [users.id],
  }),
  repositories: many(repositories),
  environments: many(environments),
  deployments: many(deployments),
}));

export const repositoryRelations = relations(repositories, ({ one, many }) => ({
  project: one(projects, {
    fields: [repositories.projectId],
    references: [projects.id],
  }),
  workflows: many(workflows),
}));

export const workflowRelations = relations(workflows, ({ one, many }) => ({
  repository: one(repositories, {
    fields: [workflows.repositoryId],
    references: [repositories.id],
  }),
  pipelineRuns: many(pipelineRuns),
}));

export const pipelineRunRelations = relations(pipelineRuns, ({ one, many }) => ({
  workflow: one(workflows, {
    fields: [pipelineRuns.workflowId],
    references: [workflows.id],
  }),
  taskRuns: many(taskRuns),
  deployments: many(deployments),
}));

export const taskRunRelations = relations(taskRuns, ({ one }) => ({
  pipelineRun: one(pipelineRuns, {
    fields: [taskRuns.pipelineRunId],
    references: [pipelineRuns.id],
  }),
}));

export const deploymentRelations = relations(deployments, ({ one }) => ({
  pipelineRun: one(pipelineRuns, {
    fields: [deployments.pipelineRunId],
    references: [pipelineRuns.id],
  }),
  environment: one(environments, {
    fields: [deployments.environmentId],
    references: [environments.id],
  }),
  project: one(projects, {
    fields: [deployments.projectId],
    references: [projects.id],
  }),
  approver: one(users, {
    fields: [deployments.approvedBy],
    references: [users.id],
  }),
}));

export const environmentRelations = relations(environments, ({ one, many }) => ({
  project: one(projects, {
    fields: [environments.projectId],
    references: [projects.id],
  }),
  deployments: many(deployments),
}));

export const aiConversationRelations = relations(aiConversations, ({ one, many }) => ({
  user: one(users, {
    fields: [aiConversations.userId],
    references: [users.id],
  }),
  project: one(projects, {
    fields: [aiConversations.projectId],
    references: [projects.id],
  }),
  messages: many(aiMessages),
}));

export const aiMessageRelations = relations(aiMessages, ({ one }) => ({
  conversation: one(aiConversations, {
    fields: [aiMessages.conversationId],
    references: [aiConversations.id],
  }),
}));
