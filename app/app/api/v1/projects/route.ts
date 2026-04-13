/**
 * Projects API
 * 
 * GET  /api/v1/projects — List user's projects
 * POST /api/v1/projects — Create a new project
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects, environments } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { getApiAuth } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getApiAuth();
    if (!user || !user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userProjects = await db.query.projects.findMany({
      with: {
        repositories: true,
        environments: true,
      },
      orderBy: [desc(projects.createdAt)],
    });

    return NextResponse.json({ projects: userProjects });
  } catch (error) {
    console.error("[Projects GET Error]", error);
    return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getApiAuth();
    if (!user || !user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, organizationId, provider = "GITHUB", repositoryUrl } = body;

    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    // Create project
    const [project] = await db.insert(projects).values({
      name,
      description,
      organizationId,
      createdById: user.id,
    }).onConflictDoUpdate({
      target: [projects.name],
      set: { updatedAt: new Date() }
    }).returning();

    // Create default environments
    const defaultEnvs = ["Development", "Staging", "Production"];
    for (const envName of defaultEnvs) {
      await db.insert(environments).values({
        projectId: project.id,
        name: envName,
        isActive: true,
      });
    }

    return NextResponse.json({
      project,
      message: "Project created with default environments (Development, Staging, Production)",
    }, { status: 201 });
  } catch (error: any) {
    console.error("[Projects POST Error]", error);
    return NextResponse.json({ error: error.message || "Failed to create project" }, { status: 500 });
  }
}
