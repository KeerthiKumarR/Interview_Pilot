import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth-user";
import { prisma } from "@/lib/prisma";
import { buildBooleanSearchQuery } from "@/lib/jobs/boolean-search";
import { calculateJobMatch, formatVerdictLabel } from "@/lib/jobs/matcher";
import { matchLiveOnlineJobs } from "@/services/live-jobs-service";

export const dynamic = "force-dynamic";

/**
 * GET /api/jobs
 * Retrieves real-time live tech jobs aggregated from online hiring feeds,
 * matched dynamically against candidate's verified resume and viva interview scores.
 */
export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Fetch student profile, readiness score, projects, and completed interviews
    const [profile, userInterviews] = await Promise.all([
      prisma.studentProfile.findUnique({
        where: { userId: user.id },
        include: {
          readinessScore: true,
          projects: { orderBy: { order: "asc" } },
        },
      }),
      prisma.interview.findMany({
        where: { userId: user.id, report: { isNot: null } },
        include: { report: true, jobRole: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

    const studentSkills = Array.isArray(profile?.skills)
      ? (profile.skills as string[])
      : [];
    const targetRole = profile?.targetRole || "Software Engineer";
    const profileReadiness = profile?.readinessScore?.overallScore || 0;

    // Collect skills demonstrated during live viva / interviews
    const interviewSkills: string[] = [];
    let bestInterviewScore = 0;
    userInterviews.forEach((i) => {
      const score = i.report?.overallScore || 0;
      if (score > bestInterviewScore) bestInterviewScore = score;
      if (i.jobRole?.targetSkills) {
        interviewSkills.push(
          ...i.jobRole.targetSkills.split(",").map((s) => s.trim())
        );
      }
      if (i.report?.skillScores && typeof i.report.skillScores === "object") {
        interviewSkills.push(...Object.keys(i.report.skillScores));
      }
    });

    const latestInterview = userInterviews[0] || null;
    const readinessScore = Math.max(profileReadiness, bestInterviewScore);
    const combinedSkills = Array.from(new Set([...studentSkills, ...interviewSkills]));

    // 2. Generate Boolean search queries and external platform links
    const booleanOutput = buildBooleanSearchQuery(combinedSkills, targetRole);

    // 3. Fetch active campus drives and live online web jobs concurrently
    const [rawJobs, liveOnlineJobs, userApplications] = await Promise.all([
      prisma.jobPosting.findMany({
        orderBy: [
          { isMSOTInternal: "desc" },
          { createdAt: "desc" },
        ],
      }),
      matchLiveOnlineJobs({
        studentSkills,
        interviewSkills,
        candidateReadinessScore: readinessScore,
        interviewScore: bestInterviewScore,
        targetRole,
        limit: 20,
      }),
      prisma.jobApplication.findMany({
        where: { userId: user.id },
      }),
    ]);

    const appMap = new Map(userApplications.map((a) => [a.jobId, a]));

    // 4. Score and rank internal DB jobs
    const rankedDbJobs = rawJobs.map((job) => {
      const required = Array.isArray(job.requiredSkills)
        ? (job.requiredSkills as string[])
        : [];
      const match = calculateJobMatch({
        studentSkills,
        interviewSkills,
        candidateReadinessScore: readinessScore,
        interviewScore: bestInterviewScore,
        targetRole,
        minReadinessScore: job.minReadinessScore,
        isMSOTInternal: job.isMSOTInternal,
        jobTitle: job.title,
      });
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
        createdAt: job.createdAt.toISOString(),
        fitPercentage: match.fitPercentage,
        matchedSkills: match.matchedSkills,
        missingSkills: match.missingSkills,
        isEligible: match.isEligible,
        matchReason: match.matchReason,
        applicationStatus: userApp?.status || "None",
        appliedAt: userApp?.appliedAt ? userApp.appliedAt.toISOString() : null,
        reminderDate: userApp?.reminderDate ? userApp.reminderDate.toISOString() : null,
        notes: userApp?.notes || null,
      };
    });

    // Merge DB campus drives with live online tech jobs
    const allRankedJobs = [
      ...rankedDbJobs,
      ...liveOnlineJobs.map((j) => {
        const userApp = appMap.get(j.id);
        return {
          ...j,
          createdAt: j.postedAt || new Date().toISOString(),
          applicationStatus: userApp?.status || "None",
          appliedAt: userApp?.appliedAt ? userApp.appliedAt.toISOString() : null,
          reminderDate: userApp?.reminderDate ? userApp.reminderDate.toISOString() : null,
          notes: userApp?.notes || null,
        };
      }),
    ];

    // Sort: Campus drives first, then by match fit percentage descending
    allRankedJobs.sort((a, b) => {
      if (a.isMSOTInternal && !b.isMSOTInternal) return -1;
      if (!a.isMSOTInternal && b.isMSOTInternal) return 1;
      return b.fitPercentage - a.fitPercentage;
    });

    const onlineJobsCount = allRankedJobs.filter((j) => !j.isMSOTInternal).length;
    const campusJobsCount = allRankedJobs.filter((j) => j.isMSOTInternal).length;
    const highMatchCount = allRankedJobs.filter((j) => j.fitPercentage >= 70).length;

    return NextResponse.json(
      {
        candidateSummary: {
          name: user.name,
          email: user.email,
          imageUrl: user.imageUrl,
          targetRole,
          skillsCount: combinedSkills.length,
          skills: combinedSkills.slice(0, 8),
          projectsCount: profile?.projects?.length || 0,
          hasResume: Boolean(profile?.resumeText),
          readinessScore,
          latestInterview: latestInterview && latestInterview.report
            ? {
                id: latestInterview.id,
                overallScore: latestInterview.report.overallScore || 0,
                technicalScore: latestInterview.report.technicalScore || latestInterview.report.overallScore || 0,
                communicationScore: latestInterview.report.communicationScore || latestInterview.report.overallScore || 0,
                problemSolvingScore: latestInterview.report.problemSolvingScore || latestInterview.report.overallScore || 0,
                verdict: formatVerdictLabel(latestInterview.report.recruiterVerdict),
              }
            : null,
        },
        stats: {
          totalJobs: allRankedJobs.length,
          onlineJobsCount,
          campusJobsCount,
          highMatchCount,
        },
        booleanQuery: booleanOutput.query,
        platformUrls: booleanOutput.externalPlatformUrls,
        studentTargetRole: targetRole,
        candidateReadinessScore: readinessScore,
        totalJobs: allRankedJobs.length,
        jobs: allRankedJobs,
      },
      {
        headers: {
          "Cache-Control": "private, max-age=15, stale-while-revalidate=60",
        },
      }
    );
  } catch (error: any) {
    console.error("Error in GET /api/jobs:", error);
    return NextResponse.json(
      { error: "Failed to load matched jobs." },
      { status: 500 }
    );
  }
}
