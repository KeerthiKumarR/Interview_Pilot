import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth-user";
import { prisma } from "@/lib/prisma";
import { buildBooleanSearchQuery } from "@/lib/jobs/boolean-search";
import { calculateJobMatch } from "@/lib/jobs/matcher";

export const dynamic = "force-dynamic";

/**
 * GET /api/jobs
 * Retrieves jobs ranked by match with student's profile,
 * pinning MSOT internal campus postings at the top.
 */
export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Fetch student profile and readiness score
    const profile = await prisma.studentProfile.findUnique({
      where: { userId: user.id },
      include: {
        readinessScore: true,
      },
    });

    const studentSkills = Array.isArray(profile?.skills)
      ? (profile.skills as string[])
      : [];
    const targetRole = profile?.targetRole || "Software Engineer";
    const readinessScore = profile?.readinessScore?.overallScore || 0;

    // 2. Generate Boolean search queries and external platform links
    const booleanOutput = buildBooleanSearchQuery(studentSkills, targetRole);

    // 3. Fetch active job postings from database
    const rawJobs = await prisma.jobPosting.findMany({
      orderBy: [
        { isMSOTInternal: "desc" },
        { createdAt: "desc" },
      ],
    });

    // 4. Fetch student's existing applications
    const userApplications = await prisma.jobApplication.findMany({
      where: { userId: user.id },
    });
    const appMap = new Map(userApplications.map((a) => [a.jobId, a]));

    // 5. Score and rank jobs
    const rankedJobs = rawJobs.map((job) => {
      const required = Array.isArray(job.requiredSkills)
        ? (job.requiredSkills as string[])
        : [];
      const match = calculateJobMatch(
        studentSkills,
        required,
        readinessScore,
        job.minReadinessScore,
        job.isMSOTInternal
      );
      const userApp = appMap.get(job.id);

      return {
        id: job.id,
        title: job.title,
        company: job.company,
        description: job.description,
        location: job.location,
        isRemote: job.isRemote,
        jobType: job.jobType,
        applyUrl: job.applyUrl,
        requiredSkills: required,
        minReadinessScore: job.minReadinessScore,
        isMSOTInternal: job.isMSOTInternal,
        stipendOrSalary: job.stipendOrSalary,
        createdAt: job.createdAt,
        // Match metrics
        fitPercentage: match.fitPercentage,
        matchedSkills: match.matchedSkills,
        missingSkills: match.missingSkills,
        isEligible: match.isEligible,
        matchReason: match.matchReason,
        // Current application status
        applicationStatus: userApp?.status || "None",
        appliedAt: userApp?.appliedAt || null,
        reminderDate: userApp?.reminderDate || null,
        notes: userApp?.notes || null,
      };
    });

    // Sort: MSOT internal first, then by fit percentage descending
    rankedJobs.sort((a, b) => {
      if (a.isMSOTInternal && !b.isMSOTInternal) return -1;
      if (!a.isMSOTInternal && b.isMSOTInternal) return 1;
      return b.fitPercentage - a.fitPercentage;
    });

    return NextResponse.json({
      booleanQuery: booleanOutput.query,
      platformUrls: booleanOutput.externalPlatformUrls,
      studentTargetRole: targetRole,
      candidateReadinessScore: readinessScore,
      totalJobs: rankedJobs.length,
      jobs: rankedJobs,
    });
  } catch (error: any) {
    console.error("Error in GET /api/jobs:", error);
    return NextResponse.json(
      { error: "Failed to load matched jobs." },
      { status: 500 }
    );
  }
}
