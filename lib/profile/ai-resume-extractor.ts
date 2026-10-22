import { deepseekChat } from "@/services/ai-service";

export interface AiExtractedResumeData {
  targetRole?: string;
  githubUsername?: string;
  leetcodeUsername?: string;
  linkedinUrl?: string;
  skills: string[];
  projects: Array<{
    title: string;
    description: string;
    techStack: string[];
    repoUrl?: string;
    liveUrl?: string;
  }>;
  achievements: Array<{
    title: string;
    category: "hackathon" | "certification" | "club" | "award" | "other";
    description?: string;
    date?: string;
  }>;
}

/**
 * Sends parsed resume text to the configured AI engine (OpenRouter/DeepSeek/Groq)
 * to automatically extract Technical Skills Cloud, Highlighted Projects, and Achievements.
 */
export async function extractResumeDataWithAi(
  resumeText: string
): Promise<AiExtractedResumeData | null> {
  if (!resumeText || resumeText.trim().length < 40) {
    return null;
  }

  // Cap text to avoid overflowing free model token context
  const trimmedText = resumeText.slice(0, 12000);

  const prompt = `You are an expert technical recruiter and resume intelligence parser.
Analyze this resume text and extract structured technical details for a coding placement interview profile.

Resume Text:
"""
${trimmedText}
"""

Extract and return a strictly valid, parseable JSON object with this exact structure:
{
  "targetRole": "Candidate's target or current title (e.g., Full Stack Engineer, Frontend Developer, Backend Engineer, Data Scientist)",
  "githubUsername": "Extracted GitHub handle without URL (e.g., 'octocat') or null",
  "leetcodeUsername": "Extracted LeetCode username or null",
  "linkedinUrl": "Full LinkedIn profile URL or null",
  "skills": [
    "JavaScript", "TypeScript", "React", "Node.js", "PostgreSQL", "Docker", "AWS"
  ],
  "projects": [
    {
      "title": "Project Name",
      "description": "2-3 sentences explaining what this project does, architecture, key features, and performance impact for technical interviewers.",
      "techStack": ["Next.js", "TailwindCSS", "PostgreSQL"],
      "repoUrl": "GitHub repo URL if mentioned, else null",
      "liveUrl": "Live demo/deployed URL if mentioned, else null"
    }
  ],
  "achievements": [
    {
      "title": "Title of certification, hackathon, competition, or leadership role",
      "category": "hackathon", // Must be one of: "hackathon", "certification", "club", "award", or "other"
      "description": "Brief description of the accomplishment or credential",
      "date": "Year or date if found (e.g. '2024') or null"
    }
  ]
}

Instructions:
1. "skills" must include all technical skills, programming languages, databases, web frameworks, libraries, DevOps tools, and cloud platforms found in the resume.
2. "projects" must capture all academic, personal, or professional projects mentioned in the resume. Write clear, interview-ready descriptions highlighting system architecture.
3. "achievements" must capture hackathons, certifications (AWS, GCP, Coursera, etc.), club positions, or competitive programming rank.
4. Return ONLY valid raw JSON. Do not wrap in markdown quotes, backticks, or write conversational text.`;

  try {
    const rawResponse = await deepseekChat(
      [
        {
          role: "system",
          content:
            "You are a strict JSON data extractor. You only reply with raw, valid JSON. Never output markdown formatting or conversational commentary.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      {
        temperature: 0.1,
        maxTokens: 2500,
      }
    );

    if (!rawResponse || !rawResponse.trim()) {
      return null;
    }

    // Clean JSON response (strip markdown fences if present)
    let cleaned = rawResponse.trim();
    if (cleaned.startsWith("```json")) {
      cleaned = cleaned.replace(/^```json\s*/i, "").replace(/\s*```$/i, "");
    } else if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```\s*/, "").replace(/\s*```$/, "");
    }

    // In case the AI still output text around the JSON, locate the outermost { }
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      cleaned = cleaned.substring(firstBrace, lastBrace + 1);
    }

    const parsed = JSON.parse(cleaned);

    const validCategories = ["hackathon", "certification", "club", "award", "other"] as const;

    const sanitizedProjects = Array.isArray(parsed.projects)
      ? parsed.projects
          .filter((p: any) => p && typeof p.title === "string" && p.title.trim().length > 0)
          .map((p: any) => ({
            title: p.title.trim(),
            description: typeof p.description === "string" ? p.description.trim() : "",
            techStack: Array.isArray(p.techStack)
              ? p.techStack.filter((t: any) => typeof t === "string" && t.trim().length > 0)
              : [],
            repoUrl: typeof p.repoUrl === "string" && p.repoUrl.startsWith("http") ? p.repoUrl.trim() : undefined,
            liveUrl: typeof p.liveUrl === "string" && p.liveUrl.startsWith("http") ? p.liveUrl.trim() : undefined,
          }))
      : [];

    const sanitizedAchievements = Array.isArray(parsed.achievements)
      ? parsed.achievements
          .filter((a: any) => a && typeof a.title === "string" && a.title.trim().length > 0)
          .map((a: any) => {
            const rawCat = (typeof a.category === "string" ? a.category.toLowerCase() : "other") as any;
            const category = validCategories.includes(rawCat) ? rawCat : "other";
            return {
              title: a.title.trim(),
              category,
              description: typeof a.description === "string" ? a.description.trim() : undefined,
              date: typeof a.date === "string" ? a.date.trim() : undefined,
            };
          })
      : [];

    const sanitizedSkills: string[] = Array.isArray(parsed.skills)
      ? Array.from(
          new Set<string>(
            parsed.skills
              .filter((s: any) => typeof s === "string" && s.trim().length > 0)
              .map((s: string) => s.trim())
          )
        )
      : [];

    return {
      targetRole: typeof parsed.targetRole === "string" && parsed.targetRole.trim() ? parsed.targetRole.trim() : undefined,
      githubUsername: typeof parsed.githubUsername === "string" && parsed.githubUsername.trim() ? parsed.githubUsername.trim().replace(/^@/, "") : undefined,
      leetcodeUsername: typeof parsed.leetcodeUsername === "string" && parsed.leetcodeUsername.trim() ? parsed.leetcodeUsername.trim().replace(/^@/, "") : undefined,
      linkedinUrl: typeof parsed.linkedinUrl === "string" && parsed.linkedinUrl.startsWith("http") ? parsed.linkedinUrl.trim() : undefined,
      skills: sanitizedSkills,
      projects: sanitizedProjects,
      achievements: sanitizedAchievements,
    };
  } catch (error) {
    console.error("AI resume parsing failed, continuing with regex fallback:", error);
    return null;
  }
}
