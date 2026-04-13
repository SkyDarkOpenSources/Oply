/**
 * Pipelines API
 * 
 * GET  /api/v1/pipelines — List pipeline runs with workflow info
 * POST /api/v1/pipelines — Trigger a new pipeline run manually
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { pipelineRuns, workflows, taskRuns } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { getApiAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const user = await getApiAuth();
    if (!user || !user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const workflowId = searchParams.get("workflowId");
    const limit = parseInt(searchParams.get("limit") || "20");
    const status = searchParams.get("status");

    let query = db.query.pipelineRuns.findMany({
      with: {
        workflow: true,
        taskRuns: true,
      },
      orderBy: [desc(pipelineRuns.createdAt)],
      limit,
      ...(workflowId ? { where: eq(pipelineRuns.workflowId, workflowId) } : {}),
    });

    const runs = await query;

    return NextResponse.json({
      runs,
      total: runs.length,
    });
  } catch (error) {
    console.error("[Pipelines GET Error]", error);
    return NextResponse.json({ error: "Failed to fetch pipelines" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getApiAuth();
    if (!user || !user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { workflowId, commitHash, commitMessage } = body;

    if (!workflowId) {
      return NextResponse.json({ error: "workflowId is required" }, { status: 400 });
    }

    // Verify workflow exists
    const workflow = await db.query.workflows.findFirst({
      where: eq(workflows.id, workflowId),
    });

    if (!workflow) {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
    }

    // Create pipeline run
    const [run] = await db.insert(pipelineRuns).values({
      workflowId,
      commitHash: commitHash || "manual",
      commitMessage: commitMessage || "Manual trigger",
      triggeredBy: user.email || "manual",
      status: "QUEUED",
    }).returning();

    // Create task runs from workflow DAG
    const dag = (workflow.metadata as { steps?: Array<{ id: string; type: string; name: string; command: string; dependsOn: string[] }> })?.steps || [];
    
    const tasks = [];
    for (const step of dag) {
      const [task] = await db.insert(taskRuns).values({
        pipelineRunId: run.id,
        name: step.name || step.id,
        type: step.type,
        command: step.command,
        dependsOn: step.dependsOn || [],
        status: "PENDING",
      }).returning();
      tasks.push(task);
    }

    return NextResponse.json({
      run,
      tasks,
      message: "Pipeline run triggered successfully",
    }, { status: 201 });
  } catch (error) {
    console.error("[Pipelines POST Error]", error);
    return NextResponse.json({ error: "Failed to trigger pipeline" }, { status: 500 });
  }
}
