import { ReviewCheckItem } from "./resume-auditor";
import { deepseekChat } from "@/services/ai-service";

export interface LinkedinAuditResult {
  score: number; // 0 to 100
  checks: ReviewCheckItem[];
  readyToPasteHeadline: string;
  readyToPasteAbout: string;
  actionableFixes: string[];
  summary: string;
}

/**
 * Audits a student's LinkedIn presence and generates ready-to-paste rewrites
 * for Headline and About sections tailored to their target role.
 */
export async function auditLinkedin(
  linkedinUrl: string | null | undefined,
  aboutText: string | null | undefined,
  targetRole: string = "Full Stack Developer",
  skills: string[] = [],
  projects: Array<{ title: string; techStack?: any }> = []
): Promise<LinkedinAuditResult> {
  const checks: ReviewCheckItem[] = [];
  const actionableFixes: string[] = [];

  const hasUrl = !!linkedinUrl && linkedinUrl.trim().startsWith("http");
  const hasAbout = !!aboutText && aboutText.trim().length > 30;

  checks.push({
    id: "linkedin_url_present",
    name: "LinkedIn Profile URL Connected",
    passed: hasUrl,
    score: hasUrl ? 35 : 0,
    message: hasUrl
      ? "LinkedIn profile link connected to placement profile."
      : "No LinkedIn profile link provided.",
    fix: hasUrl
      ? undefined
      : "Add your LinkedIn profile URL in the Profile Intake tab.",
  });
  if (!hasUrl) {
    actionableFixes.push("Connect your public LinkedIn profile link.");
  }

  checks.push({
    id: "linkedin_about_section",
    name: "About / Summary Section Provided",
    passed: hasAbout,
    score: hasAbout ? 35 : 10,
    message: hasAbout
      ? `About summary provided (${aboutText?.length} characters).`
      : "About section is empty or too short. Recruiters look for narrative and career vision.",
    fix: hasAbout
      ? undefined
      : "Paste your LinkedIn About summary (or export from LinkedIn PDF) to get tailored rewrites.",
  });
  if (!hasAbout) {
    actionableFixes.push("Paste your LinkedIn About section to receive AI rewrites.");
  }

  const primarySkills = (skills || []).slice(0, 5).join(", ") || "React, TypeScript, Node.js, SQL";
  const primaryProject = projects[0]?.title || "Full Stack Web Application";

  checks.push({
    id: "role_alignment",
    name: "Skills Aligned with Target Role",
    passed: skills.length >= 3,
    score: skills.length >= 3 ? 30 : 12,
    message:
      skills.length >= 3
        ? `Target role (${targetRole}) supported by ${skills.length} verified technical skills.`
        : "Add at least 3-5 core technical skills to demonstrate role alignment.",
    fix:
      skills.length >= 3
        ? undefined
        : "List your top technical skills in Profile Intake to optimize keyword discoverability.",
  });

  // Calculate base score
  const totalEarned = checks.reduce((sum, c) => sum + c.score, 0);
  const score = Math.min(100, Math.round(totalEarned));

  // Generate ready-to-paste Headline and About rewrites using LLM (temp 0.1 for consistency)
  let readyToPasteHeadline = `${targetRole} | ${primarySkills} | Building Scalable Systems`;
  let readyToPasteAbout = `I am an ambitious ${targetRole} passionate about building scalable, high-performance web products. 

Recently built "${primaryProject}" using ${primarySkills}, focusing on performance, modular code structure, and intuitive user experiences.

Core Stack: ${skills.join(", ") || primarySkills}.
Always excited to collaborate on impactful engineering projects—feel free to connect!`;

  try {
    const prompt = `You are an elite tech career coach.
Candidate Target Role: ${targetRole}
Existing About Text: "${aboutText || "None provided"}"
Skills: ${skills.join(", ") || primarySkills}
Key Projects: ${projects.map((p) => p.title).join(", ") || primaryProject}

Task:
1. Write a punchy, recruiter-optimized 1-line LinkedIn Headline that gets inbound recruiter views (Format: [Role] | [Top 3-4 Skills] | [Project/Achievement Hook]).
2. Write a 3-paragraph ready-to-paste About Section:
   - Paragraph 1: High-energy opening hook and passion for software engineering.
   - Paragraph 2: Concrete technical accomplishments and key projects built.
   - Paragraph 3: Core tech stack list and invitation to connect.

Return ONLY a strict JSON object:
{
  "headline": "...",
  "about": "..."
}`;

    const aiRes = await deepseekChat(
      [
        { role: "system", content: "You are a senior tech career coach. Return valid JSON only." },
        { role: "user", content: prompt },
      ],
      { temperature: 0.1, maxTokens: 900 }
    );

    const cleaned = aiRes.replace(/```json\n?|\n?```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    if (parsed.headline) readyToPasteHeadline = parsed.headline;
    if (parsed.about) readyToPasteAbout = parsed.about;
  } catch (err) {
    console.warn("LinkedIn rewrite generation fallback:", err);
  }

  return {
    score,
    checks,
    readyToPasteHeadline,
    readyToPasteAbout,
    actionableFixes: actionableFixes.slice(0, 5),
    summary: hasUrl
      ? `LinkedIn profile analyzed for ${targetRole} targeting.`
      : "LinkedIn URL is missing. Add your profile link to receive customized profile rewrites.",
  };
}
