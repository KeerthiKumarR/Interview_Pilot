import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth-user";
import { prisma } from "@/lib/prisma";
import { calculateReadinessMetrics } from "@/lib/scoring/readiness";

export const dynamic = "force-dynamic";

/**
 * POST /api/readiness/recalculate
 * Forces a real-time recalculation of the student's placement readiness score.
 */
export async function POST() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await prisma.studentProfile.findUnique({
      where: { userId: user.id },
      include: {
        projects: { orderBy: { order: "asc" } },
        achievements: true,
        readinessScore: true,
        reviewReports: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });

    if (!profile) {
      return NextResponse.json(
        { error: "No profile found to recalculate." },
        { status: 400 }
      );
    }

    // Pull scores from latest review if available
    let latestResumeScore = profile.readinessScore?.resumeScore;
    let latestProjectsScore = profile.readinessScore?.projectsScore;
    let latestGithubScore = profile.readinessScore?.githubScore;
    let latestLinkedinScore = profile.readinessScore?.linkedinScore;

    const latestReview = profile.reviewReports[0];
    if (latestReview) {
      const resumeJson = latestReview.resumeCheck as any;
      if (resumeJson?.score) latestResumeScore = resumeJson.score;
      const codebaseJson = latestReview.codebaseCheck as any;
      if (codebaseJson?.score) latestGithubScore = codebaseJson.score;
      const linkedinJson = latestReview.linkedinCheck as any;
      if (linkedinJson?.score) latestLinkedinScore = linkedinJson.score;
      const liveJson = latestReview.liveLinkCheck as any;
      if (liveJson?.score) latestProjectsScore = liveJson.score;
    }

    const report = calculateReadinessMetrics(profile as any, {
      resumeScore: latestResumeScore,
      projectsScore: latestProjectsScore,
      interviewScore: profile.readinessScore?.interviewScore || 0,
      githubScore: latestGithubScore,
      leetcodeScore: profile.leetcodeUsername ? 80 : 20,
      linkedinScore: latestLinkedinScore,
      achievementsScore: profile.achievements.length >= 2 ? 85 : profile.achievements.length === 1 ? 60 : 25,
    });

    const updated = await prisma.readinessScore.upsert({
      where: { profileId: profile.id },
      update: {
        overallScore: report.overallScore,
        tier: report.tier,
        resumeScore: report.components.find((c) => c.category === "resume")?.score || 0,
        projectsScore: report.components.find((c) => c.category === "projects")?.score || 0,
        interviewScore: report.components.find((c) => c.category === "interview")?.score || 0,
        githubScore: report.components.find((c) => c.category === "github")?.score || 0,
        leetcodeScore: report.components.find((c) => c.category === "leetcode")?.score || 0,
        linkedinScore: report.components.find((c) => c.category === "linkedin")?.score || 0,
        achievementsScore: report.components.find((c) => c.category === "achievements")?.score || 0,
        topFixes: report.topFixes.map((f) => f.action) as any,
      },
      create: {
        profileId: profile.id,
        overallScore: report.overallScore,
        tier: report.tier,
        resumeScore: report.components.find((c) => c.category === "resume")?.score || 0,
        projectsScore: report.components.find((c) => c.category === "projects")?.score || 0,
        interviewScore: report.components.find((c) => c.category === "interview")?.score || 0,
        githubScore: report.components.find((c) => c.category === "github")?.score || 0,
        leetcodeScore: report.components.find((c) => c.category === "leetcode")?.score || 0,
        linkedinScore: report.components.find((c) => c.category === "linkedin")?.score || 0,
        achievementsScore: report.components.find((c) => c.category === "achievements")?.score || 0,
        topFixes: report.topFixes.map((f) => f.action) as any,
      },
    });

    return NextResponse.json({
      success: true,
      readinessScore: updated,
      report,
    });
  } catch (error: any) {
    console.error("Recalculate error:", error);
    return NextResponse.json(
      { error: "Failed to recalculate score" },
      { status: 500 }
    );
  }
}
