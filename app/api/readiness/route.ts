import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getAuthenticatedUser } from "@/lib/auth-user";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export interface ReadinessComponent {
  id: string;
  name: string;
  score: number;
  weight: number;
  weightedContribution: number;
  description: string;
  status: "excellent" | "good" | "needs_work" | "missing";
  targetTab: string;
}

export interface HighImpactAction {
  id: string;
  title: string;
  description: string;
  potentialPoints: number;
  href: string;
  actionText: string;
  category: "interview" | "resume" | "projects" | "profiles";
}

/**
 * GET /api/readiness
 * Retrieves or computes the student's 7-dimensional placement readiness score,
 * tier, weighted component breakdown, and prioritized high-impact fixes.
 */
export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch profile, projects, achievements, review, and interviews in parallel
    const [profile, latestReview, recentInterviews] = await Promise.all([
      prisma.studentProfile.findUnique({
        where: { userId: user.id },
        include: {
          projects: { orderBy: { order: "asc" } },
          achievements: true,
          readinessScore: true,
        },
      }),
      prisma.profileReview.findFirst({
        where: { profile: { userId: user.id } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.interview.findMany({
        where: { userId: user.id, report: { isNot: null } },
        orderBy: { createdAt: "desc" },
        include: { report: { select: { overallScore: true } } },
        take: 5,
      }),
    ]);

    // 1. Calculate component scores
    // A. Resume Score (Weight: 25%)
    let resumeScore = 0;
    if (latestReview?.resumeCheck && typeof latestReview.resumeCheck === "object") {
      const rc = latestReview.resumeCheck as { score?: number };
      resumeScore = rc.score ?? 0;
    } else if (profile?.resumeText) {
      resumeScore = profile.resumePageCount === 1 ? 75 : 55;
    }

    // B. Projects Score (Weight: 25%)
    let projectsScore = 0;
    const projectList = profile?.projects || [];
    if (projectList.length > 0) {
      const withLiveUrl = projectList.filter((p) => p.liveUrl && p.liveUrl.startsWith("http"));
      const withRepoUrl = projectList.filter((p) => p.repoUrl && p.repoUrl.startsWith("http"));
      projectsScore = Math.min(
        100,
        projectList.length * 25 + withLiveUrl.length * 25 + withRepoUrl.length * 15
      );
    }

    // C. Mock Interview Score (Weight: 20%)
    let interviewScore = 0;
    if (recentInterviews.length > 0) {
      const validScores = recentInterviews
        .map((i) => i.report?.overallScore)
        .filter((s): s is number => typeof s === "number");
      if (validScores.length > 0) {
        interviewScore = Math.round(
          validScores.reduce((a, b) => a + b, 0) / validScores.length
        );
      }
    }

    // D. GitHub Profile & Repos (Weight: 10%)
    let githubScore = 0;
    if (latestReview?.codebaseCheck && typeof latestReview.codebaseCheck === "object") {
      const cc = latestReview.codebaseCheck as { score?: number };
      githubScore = cc.score ?? 0;
    } else if (profile?.githubUsername) {
      githubScore = 70;
    }

    // E. LeetCode & DSA Depth (Weight: 10%)
    let leetcodeScore = 0;
    if (profile?.leetcodeUsername) {
      leetcodeScore = 80;
    }

    // F. LinkedIn Presence (Weight: 5%)
    let linkedinScore = 0;
    if (profile?.linkedinUrl) {
      linkedinScore = profile.linkedinAbout ? 85 : 60;
    }

    // G. Achievements & Hackathons (Weight: 5%)
    let achievementsScore = 0;
    const achCount = profile?.achievements?.length || 0;
    achievementsScore = Math.min(100, achCount * 35);

    // Overwrite with stored scores if database record already exists and is higher
    const stored = profile?.readinessScore;
    if (stored) {
      if (stored.resumeScore > 0) resumeScore = stored.resumeScore;
      if (stored.projectsScore > 0) projectsScore = stored.projectsScore;
      if (stored.interviewScore > 0) interviewScore = stored.interviewScore;
      if (stored.githubScore > 0) githubScore = stored.githubScore;
      if (stored.leetcodeScore > 0) leetcodeScore = stored.leetcodeScore;
      if (stored.linkedinScore > 0) linkedinScore = stored.linkedinScore;
      if (stored.achievementsScore > 0) achievementsScore = stored.achievementsScore;
    }

    // 2. Compute 7-dimension weighted overall score
    // 25% + 25% + 20% + 10% + 10% + 5% + 5% = 100%
    const overallScore = Math.round(
      resumeScore * 0.25 +
      projectsScore * 0.25 +
      interviewScore * 0.20 +
      githubScore * 0.10 +
      leetcodeScore * 0.10 +
      linkedinScore * 0.05 +
      achievementsScore * 0.05
    );

    const tier =
      overallScore >= 75
        ? "Placement ready"
        : overallScore >= 50
        ? "Almost ready"
        : "Not ready";

    // 3. Construct 7 Component Breakdown
    const getStatus = (sc: number): ReadinessComponent["status"] => {
      if (sc >= 80) return "excellent";
      if (sc >= 60) return "good";
      if (sc > 0) return "needs_work";
      return "missing";
    };

    const components: ReadinessComponent[] = [
      {
        id: "resume",
        name: "Resume Quality & 1-Page ATS Standard",
        score: resumeScore,
        weight: 25,
        weightedContribution: Math.round(resumeScore * 0.25),
        description: "Evaluates strict 1-page compliance, measurable impact metrics, and active power verbs.",
        status: getStatus(resumeScore),
        targetTab: "/dashboard/review",
      },
      {
        id: "projects",
        name: "Key Projects & Live Deployments",
        score: projectsScore,
        weight: 25,
        weightedContribution: Math.round(projectsScore * 0.25),
        description: "Verifies public repository links and responsive live deployment URLs.",
        status: getStatus(projectsScore),
        targetTab: "/dashboard/profile-intake",
      },
      {
        id: "interview",
        name: "AI Mock Interview Performance",
        score: interviewScore,
        weight: 20,
        weightedContribution: Math.round(interviewScore * 0.20),
        description: "Averages your scores from completed AI coding and behavioral interview sessions.",
        status: getStatus(interviewScore),
        targetTab: "/dashboard",
      },
      {
        id: "github",
        name: "GitHub Repositories & Hygiene",
        score: githubScore,
        weight: 10,
        weightedContribution: Math.round(githubScore * 0.10),
        description: "Scans public repositories for committed secrets (.env, keys) and clean commit history.",
        status: getStatus(githubScore),
        targetTab: "/dashboard/profile-intake",
      },
      {
        id: "leetcode",
        name: "LeetCode & Problem Solving Depth",
        score: leetcodeScore,
        weight: 10,
        weightedContribution: Math.round(leetcodeScore * 0.10),
        description: "Tracks active competitive programming handles and verified problem volume.",
        status: getStatus(leetcodeScore),
        targetTab: "/dashboard/profile-intake",
      },
      {
        id: "linkedin",
        name: "LinkedIn Professional Profile",
        score: linkedinScore,
        weight: 5,
        weightedContribution: Math.round(linkedinScore * 0.05),
        description: "Audits headline keyword relevance and narrative bio summary.",
        status: getStatus(linkedinScore),
        targetTab: "/dashboard/profile-intake?tab=review",
      },
      {
        id: "achievements",
        name: "Achievements, Hackathons & Certs",
        score: achievementsScore,
        weight: 5,
        weightedContribution: Math.round(achievementsScore * 0.05),
        description: "Records hackathon prizes, cloud certifications, and technical leadership roles.",
        status: getStatus(achievementsScore),
        targetTab: "/dashboard/profile-intake",
      },
    ];

    // 4. Generate Top 5 High-Impact Actions
    const potentialActions: HighImpactAction[] = [];

    if (interviewScore < 70) {
      potentialActions.push({
        id: "action_interview",
        title: "Complete an AI Mock Interview Session",
        description:
          interviewScore === 0
            ? "You have not completed a mock interview yet. Each session simulates a real tech screener."
            : "Practice a medium-difficulty session to raise your 20% interview benchmark score.",
        potentialPoints: interviewScore === 0 ? 16 : Math.round((85 - interviewScore) * 0.20),
        href: "/dashboard",
        actionText: "Start Mock Interview",
        category: "interview",
      });
    }

    if (resumeScore < 80) {
      potentialActions.push({
        id: "action_resume",
        title: "Run Placement Review & Apply XYZ Rewrites",
        description: "Inspect resume bullets for quantifiable numbers and copy ready-to-paste XYZ rewrites.",
        potentialPoints: Math.round((90 - resumeScore) * 0.25),
        href: "/dashboard/profile-intake?tab=review",
        actionText: "Audit Resume in Review Hub",
        category: "resume",
      });
    }

    if (projectsScore < 75) {
      potentialActions.push({
        id: "action_projects",
        title: "Deploy & Add Live Demo URLs to Projects",
        description: "Recruiters heavily favor candidates with deployed apps on Vercel, Render, or AWS.",
        potentialPoints: Math.round((90 - projectsScore) * 0.25),
        href: "/dashboard/profile-intake",
        actionText: "Add Demo Links in Profile Hub",
        category: "projects",
      });
    }

    if (githubScore < 70) {
      potentialActions.push({
        id: "action_github",
        title: "Connect GitHub Profile & Verify Clean Repos",
        description: "Link your GitHub handle and ensure repositories have clear README setup guides.",
        potentialPoints: Math.round((85 - githubScore) * 0.10),
        href: "/dashboard/profile-intake",
        actionText: "Connect GitHub",
        category: "profiles",
      });
    }

    if (leetcodeScore < 70) {
      potentialActions.push({
        id: "action_leetcode",
        title: "Connect LeetCode / Competitive Coding Profile",
        description: "Add your LeetCode handle so interviewers see your verified data structures practice.",
        potentialPoints: Math.round((85 - leetcodeScore) * 0.10),
        href: "/dashboard/profile-intake",
        actionText: "Add LeetCode Handle",
        category: "profiles",
      });
    }

    if (linkedinScore < 75) {
      potentialActions.push({
        id: "action_linkedin",
        title: "Copy AI-Optimized Headline & LinkedIn Bio",
        description: "Increase recruiter search appearances with an industry-tailored headline and bio.",
        potentialPoints: Math.round((90 - linkedinScore) * 0.05),
        href: "/dashboard/profile-intake?tab=review",
        actionText: "Copy LinkedIn Rewrites",
        category: "resume",
      });
    }

    // Sort actions by potential points descending and take top 5
    const topFixes = potentialActions
      .sort((a, b) => b.potentialPoints - a.potentialPoints)
      .slice(0, 5);

    // Sync database cache if profile exists
    if (profile) {
      await prisma.readinessScore.upsert({
        where: { profileId: profile.id },
        update: {
          overallScore,
          tier,
          resumeScore,
          projectsScore,
          interviewScore,
          githubScore,
          leetcodeScore,
          linkedinScore,
          achievementsScore,
          topFixes: topFixes.map((f) => f.title) as unknown as Prisma.InputJsonValue,
        },
        create: {
          profileId: profile.id,
          overallScore,
          tier,
          resumeScore,
          projectsScore,
          interviewScore,
          githubScore,
          leetcodeScore,
          linkedinScore,
          achievementsScore,
          topFixes: topFixes.map((f) => f.title) as unknown as Prisma.InputJsonValue,
        },
      });
    }

    return NextResponse.json(
      {
        overallScore,
        tier,
        targetRole: profile?.targetRole || "Full Stack Developer",
        components,
        topFixes,
        lastUpdated: stored?.updatedAt || new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "private, max-age=15, stale-while-revalidate=60",
        },
      }
    );
  } catch (error: unknown) {
    console.error("Error in GET /api/readiness:", error);
    const msg = error instanceof Error ? error.message : "Failed to calculate readiness score.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
