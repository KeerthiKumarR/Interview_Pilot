import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth-user";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/jobs/applications
 * Returns the student's complete application pipeline.
 */
export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const applications = await prisma.jobApplication.findMany({
      where: { userId: user.id },
      include: {
        job: true,
      },
      orderBy: { updatedAt: "desc" },
    });

    // Summary counts
    const counts = {
      Saved: 0,
      Applied: 0,
      Shortlisted: 0,
      Interview: 0,
      Offer: 0,
      Rejected: 0,
    };

    applications.forEach((a) => {
      const s = a.status as keyof typeof counts;
      if (counts[s] !== undefined) counts[s]++;
    });

    return NextResponse.json({
      total: applications.length,
      counts,
      applications: applications.map((a) => ({
        id: a.id,
        status: a.status,
        appliedAt: a.appliedAt,
        reminderDate: a.reminderDate,
        notes: a.notes,
        createdAt: a.createdAt,
        updatedAt: a.updatedAt,
        job: {
          id: a.job.id,
          title: a.job.title,
          company: a.job.company,
          location: a.job.location,
          isRemote: a.job.isRemote,
          jobType: a.job.jobType,
          applyUrl: a.job.applyUrl,
          isMSOTInternal: a.job.isMSOTInternal,
          stipendOrSalary: a.job.stipendOrSalary,
        },
      })),
    });
  } catch (error: any) {
    console.error("Error fetching job applications:", error);
    return NextResponse.json(
      { error: "Failed to retrieve job applications." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/jobs/applications
 * Saves, applies, or updates status on a job posting.
 */
export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { jobId, status = "Saved", notes, reminderDate } = body;

    if (!jobId) {
      return NextResponse.json(
        { error: "jobId is required." },
        { status: 400 }
      );
    }

    const validStatuses = [
      "Saved",
      "Applied",
      "Shortlisted",
      "Interview",
      "Offer",
      "Rejected",
    ];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` },
        { status: 400 }
      );
    }

    const appliedAt = status === "Applied" ? new Date() : undefined;

    const application = await prisma.jobApplication.upsert({
      where: {
        userId_jobId: {
          userId: user.id,
          jobId,
        },
      },
      update: {
        status,
        notes: notes !== undefined ? notes : undefined,
        reminderDate: reminderDate ? new Date(reminderDate) : undefined,
        appliedAt: appliedAt || undefined,
      },
      create: {
        userId: user.id,
        jobId,
        status,
        notes: notes || null,
        reminderDate: reminderDate ? new Date(reminderDate) : null,
        appliedAt: status === "Applied" ? new Date() : null,
      },
      include: {
        job: true,
      },
    });

    return NextResponse.json({
      success: true,
      application,
    });
  } catch (error: any) {
    console.error("Error updating job application:", error);
    return NextResponse.json(
      { error: "Failed to update job application." },
      { status: 500 }
    );
  }
}
