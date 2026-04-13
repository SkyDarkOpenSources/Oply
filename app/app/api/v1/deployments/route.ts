/**
 * Deployments API
 * 
 * GET  /api/v1/deployments — List deployments
 * POST /api/v1/deployments — Create deployment (manual deploy or approve)
 * PATCH /api/v1/deployments — Rollback a deployment
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { deployments } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { getApiAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const user = await getApiAuth();
    if (!user || !user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get("projectId");
    const environmentId = searchParams.get("environmentId");
    const limit = parseInt(searchParams.get("limit") || "20");

    const deps = await db.query.deployments.findMany({
      with: {
        environment: true,
        pipelineRun: true,
        project: true,
        approver: true,
      },
      orderBy: [desc(deployments.createdAt)],
      limit,
      ...(projectId ? { where: eq(deployments.projectId, projectId) } : {}),
    });

    return NextResponse.json({ deployments: deps });
  } catch (error) {
    console.error("[Deployments GET Error]", error);
    return NextResponse.json({ error: "Failed to fetch deployments" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getApiAuth();
    if (!user || !user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      projectId,
      environmentId,
      pipelineRunId,
      version,
      imageTag,
      strategy = "ROLLING",
    } = body;

    if (!projectId || !environmentId) {
      return NextResponse.json(
        { error: "projectId and environmentId are required" },
        { status: 400 }
      );
    }

    const [deployment] = await db.insert(deployments).values({
      projectId,
      environmentId,
      pipelineRunId,
      version,
      imageTag,
      strategy,
      status: "PENDING",
      approvedBy: user.id,
      approvedAt: new Date(),
    }).returning();

    return NextResponse.json({
      deployment,
      message: "Deployment created successfully",
    }, { status: 201 });
  } catch (error) {
    console.error("[Deployments POST Error]", error);
    return NextResponse.json({ error: "Failed to create deployment" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getApiAuth();
    if (!user || !user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { deploymentId, action } = body;

    if (!deploymentId || !action) {
      return NextResponse.json(
        { error: "deploymentId and action are required" },
        { status: 400 }
      );
    }

    if (action === "rollback") {
      const [updated] = await db
        .update(deployments)
        .set({
          status: "ROLLED_BACK",
          rolledBackAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(deployments.id, deploymentId))
        .returning();

      return NextResponse.json({
        deployment: updated,
        message: "Deployment rolled back successfully",
      });
    }

    if (action === "approve") {
      const [updated] = await db
        .update(deployments)
        .set({
          status: "PROGRESSING",
          approvedBy: user.id,
          approvedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(deployments.id, deploymentId))
        .returning();

      return NextResponse.json({
        deployment: updated,
        message: "Deployment approved and progressing",
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("[Deployments PATCH Error]", error);
    return NextResponse.json({ error: "Failed to update deployment" }, { status: 500 });
  }
}
