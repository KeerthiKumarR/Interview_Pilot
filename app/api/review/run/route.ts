import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getAuthenticatedUser } from "@/lib/auth-user";
import { prisma } from "@/lib/prisma";
import { runFullAudit } from "@/lib/review/full-auditor";

export const maxDuration = 60; // 60s for full audit runner

export async function POST() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Retrieve full profile with projects and achievements
    let profile = await prisma.studentProfile.findUnique({
      where: { userId: user.id },
      include: {
        projects: { orderBy: { order: "asc" } },
        achievements: true,
      },
    });

    if (!profile) {
      // Create empty profile if not yet initiated
      profile = await prisma.studentProfile.create({
        data: {
          userId: user.id,
          targetRole: "Full Stack Developer",
        },
        include: {
          projects: true,
          achievements: true,
        },
      });
    }

    // Run the multi-step audit
    const auditReport = await runFullAudit({
      id: profile.id,
      userId: profile.userId,
      resumeFileName: profile.resumeFileName,
      resumeText: profile.resumeText,
      resumePageCount: profile.resumePageCount,
      targetRole: profile.targetRole,
      linkedinUrl: profile.linkedinUrl,
      linkedinAbout: profile.linkedinAbout,
      githubUsername: profile.githubUsername,
      leetcodeUsername: profile.leetcodeUsername,
      skills: Array.isArray(profile.skills) ? (profile.skills as string[]) : undefined,
      projects: profile.projects.map((p) => ({
        id: p.id,
        title: p.title,
        description: p.description || undefined,
        repoUrl: p.repoUrl || undefined,
        liveUrl: p.liveUrl || undefined,
        techStack: Array.isArray(p.techStack) ? (p.techStack as string[]) : undefined,
        order: p.order,
      })),
      achievements: profile.achievements.map((a) => ({
        id: a.id,
        title: a.title,
        category: a.category as "hackathon" | "certification" | "club" | "award" | "other",
        description: a.description || undefined,
        date: a.date || undefined,
      })),
    });

    // Save profile review record
    const savedReview = await prisma.profileReview.create({
      data: {
        profileId: profile.id,
        resumeCheck: auditReport.resumeCheck as unknown as Prisma.InputJsonValue,
        codebaseCheck: auditReport.codebaseCheck as unknown as Prisma.InputJsonValue,
        liveLinkCheck: auditReport.liveLinkCheck as unknown as Prisma.InputJsonValue,
        linkedinCheck: auditReport.linkedinCheck as unknown as Prisma.InputJsonValue,
        overallReview: auditReport.overallReview,
      },
    });

    // Determine tier based on overall score
    const score = auditReport.overallScore;
    const tier =
      score >= 75
        ? "Placement ready"
        : score >= 50
        ? "Almost ready"
        : "Not ready";

    // Upsert ReadinessScore
    const readinessScore = await prisma.readinessScore.upsert({
      where: { profileId: profile.id },
      update: {
        overallScore: score,
        tier,
        resumeScore: auditReport.resumeCheck.score,
        projectsScore: auditReport.liveLinkCheck.score,
        githubScore: auditReport.codebaseCheck.score,
        linkedinScore: auditReport.linkedinCheck.score,
        topFixes: auditReport.resumeCheck.actionableFixes as unknown as Prisma.InputJsonValue,
      },
      create: {
        profileId: profile.id,
        overallScore: score,
        tier,
        resumeScore: auditReport.resumeCheck.score,
        projectsScore: auditReport.liveLinkCheck.score,
        githubScore: auditReport.codebaseCheck.score,
        linkedinScore: auditReport.linkedinCheck.score,
        topFixes: auditReport.resumeCheck.actionableFixes as unknown as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({
      success: true,
      review: savedReview,
      readinessScore,
    });
  } catch (error: unknown) {
    console.error("Error running full profile review:", error);
    const msg = error instanceof Error ? error.message : "Failed to run review.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
