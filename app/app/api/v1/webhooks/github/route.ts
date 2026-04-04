/**
 * GitHub Webhook Handler
 * 
 * POST /api/v1/webhooks/github
 * 
 * Receives push/pull_request events from GitHub,
 * matches them against stored repositories, and triggers pipeline runs.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { repositories, workflows, pipelineRuns, taskRuns } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

function verifyGitHubSignature(payload: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;
  const hmac = crypto.createHmac("sha256", secret);
  const digest = "sha256=" + hmac.update(payload).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const event = request.headers.get("x-github-event");
    const signature = request.headers.get("x-hub-signature-256");
    const deliveryId = request.headers.get("x-github-delivery");

    // Verify webhook signature if secret is configured
    const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;
    if (webhookSecret && !verifyGitHubSignature(body, signature, webhookSecret)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const payload = JSON.parse(body);

    // Only handle push events for now
    if (event !== "push") {
      return NextResponse.json({ message: `Event '${event}' acknowledged but not processed` }, { status: 200 });
    }

    const repoUrl = payload.repository?.html_url || payload.repository?.clone_url;
    const branch = payload.ref?.replace("refs/heads/", "");
    const commitHash = payload.after;
    const commitMessage = payload.head_commit?.message || "";
    const pusher = payload.pusher?.email || payload.sender?.login || "webhook";

    if (!repoUrl || !branch || !commitHash) {
      return NextResponse.json({ error: "Missing required payload fields" }, { status: 400 });
    }

    // Find matching repository
    const repo = await db.query.repositories.findFirst({
      where: eq(repositories.url, repoUrl),
      with: {
        workflows: {
          where: eq(workflows.isActive, true),
        },
      },
    });

    if (!repo) {
      return NextResponse.json({ message: "No matching repository found" }, { status: 200 });
    }

    // Trigger pipeline runs for each active workflow
    const triggeredRuns = [];

    for (const workflow of repo.workflows) {
      // Create pipeline run
      const [run] = await db.insert(pipelineRuns).values({
        workflowId: workflow.id,
        commitHash,
        commitMessage,
        triggeredBy: pusher,
        status: "QUEUED",
      }).returning();

      // Parse the workflow DAG metadata and create task runs
      const dag = (workflow.metadata as { steps?: Array<{ id: string; type: string; name: string; command: string; dependsOn: string[] }> })?.steps || [];
      
      for (const step of dag) {
        await db.insert(taskRuns).values({
          pipelineRunId: run.id,
          name: step.name || step.id,
          type: step.type,
          command: step.command,
          dependsOn: step.dependsOn || [],
          status: "PENDING",
        });
      }

      triggeredRuns.push({
        pipelineRunId: run.id,
        workflowId: workflow.id,
        workflowName: workflow.name,
      });
    }

    return NextResponse.json({
      message: `Triggered ${triggeredRuns.length} pipeline run(s)`,
      deliveryId,
      commit: commitHash,
      runs: triggeredRuns,
    }, { status: 201 });

  } catch (error) {
    console.error("[Webhook Error]", error);
    return NextResponse.json(
      { error: "Internal server error processing webhook" },
      { status: 500 }
    );
  }
}
