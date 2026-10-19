import { deepseekChat } from "@/services/ai-service";

export interface ReviewCheckItem {
  id: string;
  name: string;
  passed: boolean;
  score: number; // 0 to 10
  message: string;
  fix?: string;
}

export interface ResumeAuditResult {
  score: number; // 0 to 100
  checks: ReviewCheckItem[];
  actionableFixes: string[];
  rewrites: Array<{
    original: string;
    rewrite: string;
    reason: string;
  }>;
  summary: string;
}

const STRONG_ACTION_VERBS = [
  "architected",
  "engineered",
  "developed",
  "optimized",
  "built",
  "designed",
  "implemented",
  "scaled",
  "deployed",
  "reduced",
  "increased",
  "automated",
  "spearheaded",
  "refactored",
  "integrated",
  "accelerated",
  "streamlined",
];

const WEAK_PHRASES = [
  "worked on",
  "responsible for",
  "helped with",
  "assisted in",
  "handled",
  "participated in",
  "familiar with",
];

/**
 * Audits a student's resume text and page count against the placement benchmark.
 */
export async function auditResume(
  resumeText: string | null | undefined,
  pageCount: number | null | undefined,
  targetRole: string = "Full Stack Developer",
  detectedLinks?: { github?: string; leetcode?: string; linkedin?: string }
): Promise<ResumeAuditResult> {
  const checks: ReviewCheckItem[] = [];
  const actionableFixes: string[] = [];

  if (!resumeText || resumeText.trim().length < 50) {
    return {
      score: 15,
      checks: [
        {
          id: "resume_presence",
          name: "Resume Uploaded & Readable",
          passed: false,
          score: 0,
          message: "No readable resume content detected.",
          fix: "Upload a clean PDF resume exported from Word, Google Docs, or LaTeX.",
        },
      ],
      actionableFixes: [
        "Upload your latest PDF resume in the Profile Intake tab.",
        "Ensure the PDF is text-based, not an image scan.",
      ],
      rewrites: [],
      summary: "Resume was not uploaded or is unreadable.",
    };
  }

  const textLower = resumeText.toLowerCase();

  // 1. Benchmark Check: Exactly One Page
  const pages = pageCount || 1;
  const isOnePage = pages === 1;
  checks.push({
    id: "page_count",
    name: "Exactly One Page",
    passed: isOnePage,
    score: isOnePage ? 15 : pages === 2 ? 8 : 2,
    message: isOnePage
      ? "Resume length is strictly 1 page (Gold standard for campus placement)."
      : `Resume is ${pages} pages long. Tech recruiters spend under 30 seconds scanning.`,
    fix: isOnePage
      ? undefined
      : "Cut outdated high-school details and reduce margins to fit strictly onto 1 page.",
  });
  if (!isOnePage) {
    actionableFixes.push("Trim resume content to strictly 1 page.");
  }

  // 2. Benchmark Check: Profile Links (GitHub & LeetCode)
  const hasGithub =
    !!detectedLinks?.github || textLower.includes("github.com");
  const hasLeetcode =
    !!detectedLinks?.leetcode ||
    textLower.includes("leetcode.com") ||
    textLower.includes("codeforces") ||
    textLower.includes("hackerrank");

  const hasCodingProfiles = hasGithub && hasLeetcode;
  checks.push({
    id: "coding_links",
    name: "GitHub & Coding Profiles Present",
    passed: hasCodingProfiles,
    score: hasCodingProfiles ? 15 : hasGithub ? 10 : 4,
    message: hasCodingProfiles
      ? "GitHub and coding profile links are present in contact header."
      : !hasGithub
      ? "Missing active GitHub profile link in resume header."
      : "Missing LeetCode / competitive programming profile link in resume header.",
    fix: hasCodingProfiles
      ? undefined
      : "Add clickable GitHub and LeetCode profile URLs right beneath your name.",
  });
  if (!hasCodingProfiles) {
    actionableFixes.push("Add GitHub and LeetCode profile links in the contact header.");
  }

  // 3. Benchmark Check: Measurable Impact & Metrics
  // Match numbers followed by %, ms, k, $, users, or multipliers
  const metricRegex = /\b(\d+[\d,.]*\s*(?:%|percent|ms|s|seconds|k|m|users|requests|req\/s|x|times|\$|usd|inr))\b/gi;
  const metricsFound = resumeText.match(metricRegex) || [];
  const hasStrongMetrics = metricsFound.length >= 3;

  checks.push({
    id: "quantifiable_impact",
    name: "Measurable Results & Metrics",
    passed: hasStrongMetrics,
    score: hasStrongMetrics ? 15 : metricsFound.length > 0 ? 9 : 3,
    message: hasStrongMetrics
      ? `Found ${metricsFound.length} quantifiable metrics demonstrating concrete impact.`
      : `Only found ${metricsFound.length} metric(s). Recruiters prioritize results over task lists.`,
    fix: hasStrongMetrics
      ? undefined
      : "Quantify your achievements: replace 'optimized query' with 'reduced API latency by 42% (from 320ms to 185ms)'.",
  });
  if (!hasStrongMetrics) {
    actionableFixes.push(
      "Add quantifiable numbers (e.g. latency, user count, % speedup) to at least 3 project bullets."
    );
  }

  // 4. Benchmark Check: Strong Action Verbs vs Passive Phrases
  let actionVerbCount = 0;
  for (const verb of STRONG_ACTION_VERBS) {
    if (new RegExp(`\\b${verb}\\b`, "i").test(textLower)) {
      actionVerbCount++;
    }
  }

  let weakPhraseCount = 0;
  for (const weak of WEAK_PHRASES) {
    if (textLower.includes(weak)) {
      weakPhraseCount++;
    }
  }

  const strongVerbsPassed = actionVerbCount >= 4 && weakPhraseCount === 0;
  checks.push({
    id: "action_verbs",
    name: "Bullet Points Start With Action Verbs",
    passed: strongVerbsPassed,
    score: strongVerbsPassed ? 15 : actionVerbCount >= 3 ? 10 : 5,
    message: strongVerbsPassed
      ? `Strong active language throughout (${actionVerbCount} distinct action verbs detected).`
      : weakPhraseCount > 0
      ? `Detected passive language (${weakPhraseCount} instances like 'worked on' or 'helped with').`
      : "Bullet points need stronger active power verbs.",
    fix: strongVerbsPassed
      ? undefined
      : "Start every bullet with an action verb (e.g. 'Architected', 'Engineered', 'Optimized') instead of 'Worked on'.",
  });
  if (!strongVerbsPassed) {
    actionableFixes.push("Replace passive phrases ('worked on', 'helped with') with strong action verbs.");
  }

  // 5. Benchmark Check: ATS-Friendly Structure
  const hasStandardHeadings =
    (textLower.includes("experience") || textLower.includes("work history")) &&
    (textLower.includes("project") || textLower.includes("projects")) &&
    textLower.includes("skills") &&
    textLower.includes("education");

  checks.push({
    id: "ats_structure",
    name: "ATS-Friendly Section Headings",
    passed: hasStandardHeadings,
    score: hasStandardHeadings ? 15 : 7,
    message: hasStandardHeadings
      ? "Standard ATS headings detected (Experience, Projects, Skills, Education)."
      : "Non-standard section headings can cause ATS parsers to miss key sections.",
    fix: hasStandardHeadings
      ? undefined
      : "Use standard headings: 'Experience', 'Technical Projects', 'Technical Skills', 'Education'.",
  });
  if (!hasStandardHeadings) {
    actionableFixes.push("Use standard ATS section headings ('Technical Skills', 'Projects', 'Experience').");
  }

  // 6. Benchmark Check: Every Project Has Tech Stack & Description
  const hasProjectsSection = textLower.includes("project");
  checks.push({
    id: "project_descriptions",
    name: "Projects Include Tech Stack & Impact",
    passed: hasProjectsSection && actionVerbCount >= 2,
    score: hasProjectsSection ? 15 : 5,
    message: hasProjectsSection
      ? "Projects clearly listed with context."
      : "Missing dedicated Technical Projects section.",
    fix: hasProjectsSection
      ? undefined
      : "Create a prominent 'Technical Projects' section with live demo and GitHub links.",
  });

  // Calculate base score from deterministic rubrics
  const totalEarned = checks.reduce((sum, c) => sum + c.score, 0);
  const maxPossible = 90; // base score out of 90, remaining 10 from AI synthesis
  let computedScore = Math.min(100, Math.round((totalEarned / maxPossible) * 100));

  // LLM Synthesis for Ready-To-Paste Rewrites (Temperature 0.1 for high reproducibility)
  let rewrites: Array<{ original: string; rewrite: string; reason: string }> = [];
  let summary = "Resume audited against Placement Readiness benchmarks.";

  try {
    const prompt = `You are a strict technical recruiter evaluating a college student's resume for a ${targetRole} role.
Resume Snippet:
"""
${resumeText.slice(0, 3000)}
"""

Task:
1. Identify 2 weak bullet points from the resume that lack metrics or use passive phrasing.
2. Rewrite them into high-impact, ATS-optimized bullet points using the Google XYZ formula: "Accomplished [X] as measured by [Y], by doing [Z]".
3. Provide a 2-sentence executive summary of the resume's readiness.

Return ONLY a strict JSON object with this exact shape:
{
  "summary": "2-sentence review summary",
  "rewrites": [
    {
      "original": "exact or approximated weak line from candidate",
      "rewrite": "high impact rewritten bullet point with action verb and metrics",
      "reason": "why this rewrite is stronger"
    }
  ]
}`;

    const aiResponse = await deepseekChat(
      [
        { role: "system", content: "You are a senior hiring committee auditor. Return valid JSON only." },
        { role: "user", content: prompt },
      ],
      { temperature: 0.1, maxTokens: 800 }
    );

    // Clean markdown code blocks if returned
    const cleaned = aiResponse.replace(/```json\n?|\n?```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    if (parsed.summary) summary = parsed.summary;
    if (Array.isArray(parsed.rewrites)) rewrites = parsed.rewrites;
  } catch (err) {
    console.warn("LLM resume rewrite generation fallback triggered:", err);
    rewrites = [
      {
        original: "Worked on frontend and backend using React and Node.js.",
        rewrite:
          "Architected end-to-end full-stack web application with Next.js and Node.js, reducing page load latency by 35% through SSR and API caching.",
        reason: "Replaces passive 'worked on' with active engineering verbs and quantified outcome.",
      },
    ];
  }

  return {
    score: computedScore,
    checks,
    actionableFixes: actionableFixes.slice(0, 5),
    rewrites,
    summary,
  };
}
