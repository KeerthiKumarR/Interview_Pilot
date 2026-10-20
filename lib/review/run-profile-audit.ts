import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { runFullAudit } from "@/lib/review/full-auditor";
import { invalidateReviewCache } from "@/app/api/review/route";

/**
 * Shared service to execute full candidate benchmark audit and persist review & readiness score.
 * Used upon profile save, resume upload, and manual on-demand review rerun.
 */
export async function executeAndPersistProfileAudit(userId: string) {
  const profile = await prisma.studentProfile.findUnique({
    where: { userId },
    include: {
      projects: { orderBy: { order: "asc" } },
      achievements: true,
    },
  });

  if (!profile) return null;

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

  const score = auditReport.overallScore;
  const tier =
    score >= 75
      ? "Placement ready"
      : score >= 50
      ? "Almost ready"
      : "Not ready";

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

  invalidateReviewCache(userId);

  return {
    review: savedReview,
    readinessScore,
    auditReport,
  };
}
