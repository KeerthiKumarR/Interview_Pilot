import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth-user";
import { prisma } from "@/lib/prisma";
import { calculateJobMatch } from "@/lib/jobs/matcher";
import { buildBooleanSearchQuery } from "@/lib/jobs/boolean-search";
import { matchLiveOnlineJobs, LiveJobItem } from "@/services/live-jobs-service";

export const dynamic = "force-dynamic";

/**
 * GET /api/interviews/[id]/matched-jobs
 * Evaluates the candidate's specific interview performance, demonstrated viva skills,
 * and resume profile to return REAL-TIME LIVE online job openings from hiring platforms.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: interviewId } = await params;

    // 1. Fetch the interview with report and jobRole
    const interview = await prisma.interview.findUnique({
      where: { id: interviewId },
      include: {
        report: true,
        jobRole: true,
      },
    });

    if (!interview) {
      return NextResponse.json({ error: "Interview not found" }, { status: 404 });
    }

    // 2. Fetch the candidate's profile and parsed resume
    const profile = await prisma.studentProfile.findUnique({
      where: { userId: user.id },
      include: {
        readinessScore: true,
      },
    });

    const studentSkills: string[] = Array.isArray(profile?.skills)
      ? (profile.skills as string[])
      : [];

    const targetRole =
      interview.jobRole?.title ||
      profile?.targetRole ||
      "Software Engineer";

    const interviewScore = interview.report?.overallScore || 70;
    const readinessScore = profile?.readinessScore?.overallScore || interviewScore;

    // Extract demonstrated skills from the report's skillScores or jobRole target skills
    const interviewSkillKeys: string[] = [];
    if (interview.report?.skillScores && typeof interview.report.skillScores === "object") {
      interviewSkillKeys.push(...Object.keys(interview.report.skillScores));
    }
    if (interview.jobRole?.targetSkills) {
      interviewSkillKeys.push(
        ...interview.jobRole.targetSkills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      );
    }

    // 3. Generate dynamic Boolean search query tailored to demonstrated skills
    const combinedSkills = Array.from(new Set([...studentSkills, ...interviewSkillKeys]));
    const booleanOutput = buildBooleanSearchQuery(combinedSkills, targetRole);

    // 4. Fetch 100% REAL LIVE online tech jobs dynamically from web APIs
    const liveOnlineJobs = await matchLiveOnlineJobs({
      studentSkills,
      interviewSkills: interviewSkillKeys,
      candidateReadinessScore: readinessScore,
      interviewScore,
      targetRole,
      limit: 8,
    });

    // 5. Fetch student's existing applications
    const userApplications = await prisma.jobApplication.findMany({
      where: { userId: user.id },
    });
    const appMap = new Map(userApplications.map((a) => [a.jobId, a]));

    // Check application status for each live job
    const finalJobs: LiveJobItem[] = liveOnlineJobs.map((job) => {
      const userApp = appMap.get(job.id);
      return {
        ...job,
        applicationStatus: userApp?.status || "None",
      };
    });

    return NextResponse.json({
      interviewId,
      interviewScore,
      targetRole,
      demonstratedSkills: interviewSkillKeys,
      booleanQuery: booleanOutput.query,
      platformUrls: booleanOutput.externalPlatformUrls,
      source: "live_online_feeds",
      jobs: finalJobs,
    });
  } catch (error: any) {
    console.error("Error in GET /api/interviews/[id]/matched-jobs:", error);
    return NextResponse.json(
      { error: "Failed to evaluate matched jobs." },
      { status: 500 }
    );
  }
}
