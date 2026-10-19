export interface ReadinessActionItem {
  id: string;
  action: string;
  category: "resume" | "projects" | "interview" | "github" | "leetcode" | "linkedin" | "achievements";
  impactPoints: number;
  targetUrl: string;
  description: string;
}

export interface ComponentBreakdown {
  name: string;
  category: "resume" | "projects" | "interview" | "github" | "leetcode" | "linkedin" | "achievements";
  weight: number; // e.g. 25 for 25%
  score: number;  // 0 - 100
  weightedScore: number; // Contribution to 100
  status: "strong" | "moderate" | "needs_work";
}

export interface UnifiedReadinessReport {
  overallScore: number;
  tier: "Not ready" | "Almost ready" | "Placement ready";
  components: ComponentBreakdown[];
  topFixes: ReadinessActionItem[];
  summary: string;
}

export interface StudentProfileFull {
  id: string;
  targetRole?: string | null;
  resumeFileName?: string | null;
  resumeText?: string | null;
  resumePageCount?: number | null;
  githubUsername?: string | null;
  leetcodeUsername?: string | null;
  linkedinUrl?: string | null;
  skills?: any;
  projects?: Array<{
    id: string;
    title: string;
    liveUrl?: string | null;
    repoUrl?: string | null;
    techStack?: any;
    description?: string | null;
  }>;
  achievements?: Array<{
    id: string;
    title: string;
    category?: string | null;
  }>;
}

/**
 * Calculates the authoritative Placement Readiness Score out of 100
 * strictly following the competition weights:
 * - Resume Quality: 25%
 * - Projects: 25%
 * - Mock Interview: 20%
 * - GitHub Activity: 10%
 * - LeetCode Practice: 10%
 * - LinkedIn Profile: 5%
 * - Co-curricular Achievements: 5%
 */
export function calculateReadinessMetrics(
  profile: StudentProfileFull | null,
  cachedScores?: {
    resumeScore?: number;
    projectsScore?: number;
    interviewScore?: number;
    githubScore?: number;
    leetcodeScore?: number;
    linkedinScore?: number;
    achievementsScore?: number;
  }
): UnifiedReadinessReport {
  const potentialActions: ReadinessActionItem[] = [];

  // 1. Resume Quality (Weight 25%)
  let resumeScore = cachedScores?.resumeScore ?? 0;
  if (!cachedScores?.resumeScore) {
    if (!profile?.resumeText) {
      resumeScore = 10;
      potentialActions.push({
        id: "upload_resume",
        action: "Upload your PDF resume",
        category: "resume",
        impactPoints: 18,
        targetUrl: "/dashboard/profile-intake",
        description: "Upload a clean 1-page PDF resume to trigger full ATS and metric checks.",
      });
    } else {
      const pageCount = profile.resumePageCount || 1;
      resumeScore = pageCount === 1 ? 75 : 50;
      if (pageCount > 1) {
        potentialActions.push({
          id: "trim_resume",
          action: "Trim resume to strictly 1 page",
          category: "resume",
          impactPoints: 8,
          targetUrl: "/dashboard/review",
          description: "Recruiters penalize multi-page resumes for campus candidates.",
        });
      }
    }
  }

  // 2. Projects (Weight 25%)
  let projectsScore = cachedScores?.projectsScore ?? 0;
  const projects = profile?.projects || [];
  if (!cachedScores?.projectsScore) {
    if (projects.length === 0) {
      projectsScore = 10;
      potentialActions.push({
        id: "add_project",
        action: "Add at least one portfolio project",
        category: "projects",
        impactPoints: 15,
        targetUrl: "/dashboard/profile-intake",
        description: "Showcase complete software projects with live deployment URLs.",
      });
    } else {
      const liveCount = projects.filter((p) => p.liveUrl && p.liveUrl.startsWith("http")).length;
      projectsScore = liveCount > 0 ? 80 : 45;
      if (liveCount === 0) {
        potentialActions.push({
          id: "deploy_project",
          action: "Deploy a live demo for your project",
          category: "projects",
          impactPoints: 10,
          targetUrl: "/dashboard/profile-intake",
          description: "Deploy free on Vercel or Render. Recruiters test live URLs first.",
        });
      }
    }
  }

  // 3. Mock Interview Performance (Weight 20%)
  const interviewScore = cachedScores?.interviewScore ?? 0;
  if (interviewScore === 0) {
    potentialActions.push({
      id: "take_interview",
      action: "Complete a 15-minute AI mock interview",
      category: "interview",
      impactPoints: 16,
      targetUrl: "/dashboard",
      description: "Test your live technical communication and problem-solving skills.",
    });
  } else if (interviewScore < 70) {
    potentialActions.push({
      id: "retry_interview",
      action: "Improve mock interview score above 75",
      category: "interview",
      impactPoints: 6,
      targetUrl: "/dashboard",
      description: "Practice explaining your thought process out loud before coding.",
    });
  }

  // 4. GitHub Profile & Activity (Weight 10%)
  let githubScore = cachedScores?.githubScore ?? 0;
  if (!cachedScores?.githubScore) {
    if (!profile?.githubUsername) {
      githubScore = 15;
      potentialActions.push({
        id: "connect_github",
        action: "Connect your GitHub profile",
        category: "github",
        impactPoints: 8,
        targetUrl: "/dashboard/profile-intake",
        description: "Link GitHub so recruiters can inspect commit activity and README quality.",
      });
    } else {
      githubScore = 75;
    }
  }

  // 5. Coding Practice / LeetCode (Weight 10%)
  let leetcodeScore = cachedScores?.leetcodeScore ?? 0;
  if (!cachedScores?.leetcodeScore) {
    if (!profile?.leetcodeUsername) {
      leetcodeScore = 20;
      potentialActions.push({
        id: "connect_leetcode",
        action: "Add your LeetCode profile handle",
        category: "leetcode",
        impactPoints: 7,
        targetUrl: "/dashboard/profile-intake",
        description: "Demonstrate consistency in data structures and algorithmic problem solving.",
      });
    } else {
      leetcodeScore = 80;
    }
  }

  // 6. LinkedIn Profile (Weight 5%)
  let linkedinScore = cachedScores?.linkedinScore ?? 0;
  if (!cachedScores?.linkedinScore) {
    if (!profile?.linkedinUrl) {
      linkedinScore = 15;
      potentialActions.push({
        id: "connect_linkedin",
        action: "Connect your LinkedIn profile link",
        category: "linkedin",
        impactPoints: 4,
        targetUrl: "/dashboard/profile-intake",
        description: "Receive ready-to-paste headline and About section rewrites.",
      });
    } else {
      linkedinScore = 80;
    }
  }

  // 7. Co-curricular Achievements (Weight 5%)
  let achievementsScore = cachedScores?.achievementsScore ?? 0;
  const achievements = profile?.achievements || [];
  if (!cachedScores?.achievementsScore) {
    if (achievements.length === 0) {
      achievementsScore = 20;
      potentialActions.push({
        id: "add_achievement",
        action: "Add hackathons or technical certifications",
        category: "achievements",
        impactPoints: 4,
        targetUrl: "/dashboard/profile-intake",
        description: "List extracurricular wins, club leadership, or cloud certifications.",
      });
    } else {
      achievementsScore = achievements.length >= 2 ? 90 : 65;
    }
  }

  // Calculate Weighted Total Score (0 - 100)
  const weightedTotal = Math.min(
    100,
    Math.round(
      resumeScore * 0.25 +
      projectsScore * 0.25 +
      interviewScore * 0.20 +
      githubScore * 0.10 +
      leetcodeScore * 0.10 +
      linkedinScore * 0.05 +
      achievementsScore * 0.05
    )
  );

  // Suggested challenge tiers
  let tier: "Not ready" | "Almost ready" | "Placement ready" = "Not ready";
  if (weightedTotal >= 75) {
    tier = "Placement ready";
  } else if (weightedTotal >= 50) {
    tier = "Almost ready";
  }

  // Sort potential actions by impactPoints descending and take Top 5
  potentialActions.sort((a, b) => b.impactPoints - a.impactPoints);
  const topFixes = potentialActions.slice(0, 5);

  const getStatus = (score: number): "strong" | "moderate" | "needs_work" => {
    if (score >= 75) return "strong";
    if (score >= 50) return "moderate";
    return "needs_work";
  };

  const components: ComponentBreakdown[] = [
    {
      name: "Resume Quality",
      category: "resume",
      weight: 25,
      score: resumeScore,
      weightedScore: Number((resumeScore * 0.25).toFixed(1)),
      status: getStatus(resumeScore),
    },
    {
      name: "Projects (Live & Documented)",
      category: "projects",
      weight: 25,
      score: projectsScore,
      weightedScore: Number((projectsScore * 0.25).toFixed(1)),
      status: getStatus(projectsScore),
    },
    {
      name: "Mock Interview Performance",
      category: "interview",
      weight: 20,
      score: interviewScore,
      weightedScore: Number((interviewScore * 0.20).toFixed(1)),
      status: getStatus(interviewScore),
    },
    {
      name: "GitHub Profile & Activity",
      category: "github",
      weight: 10,
      score: githubScore,
      weightedScore: Number((githubScore * 0.10).toFixed(1)),
      status: getStatus(githubScore),
    },
    {
      name: "Coding Practice (LeetCode)",
      category: "leetcode",
      weight: 10,
      score: leetcodeScore,
      weightedScore: Number((leetcodeScore * 0.10).toFixed(1)),
      status: getStatus(leetcodeScore),
    },
    {
      name: "LinkedIn Profile",
      category: "linkedin",
      weight: 5,
      score: linkedinScore,
      weightedScore: Number((linkedinScore * 0.05).toFixed(1)),
      status: getStatus(linkedinScore),
    },
    {
      name: "Co-curricular Achievements",
      category: "achievements",
      weight: 5,
      score: achievementsScore,
      weightedScore: Number((achievementsScore * 0.05).toFixed(1)),
      status: getStatus(achievementsScore),
    },
  ];

  let summary = "";
  if (tier === "Placement ready") {
    summary = `Excellent profile (${weightedTotal}/100). You meet benchmark standards across resume, live deployments, and technical skills. You are qualified to apply directly to MSOT and partner openings.`;
  } else if (tier === "Almost ready") {
    summary = `Solid progress (${weightedTotal}/100). Completing the top recommendations below will push your placement readiness score over the 75-point benchmark.`;
  } else {
    summary = `Foundational phase (${weightedTotal}/100). Focus on completing profile intake, deploying at least one live project demo, and taking your first AI mock interview.`;
  }

  return {
    overallScore: weightedTotal,
    tier,
    components,
    topFixes,
    summary,
  };
}
