import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth-user";
import { prisma } from "@/lib/prisma";
import { getVivaStarterCode } from "@/lib/interview/starter-code";

export const dynamic = "force-dynamic";

/**
 * POST /api/jobs/practice
 * Creates a dedicated Placement Viva mock interview tailored
 * to a specific matched job opportunity (online or campus).
 */
export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      jobTitle = "Software Engineer",
      company = "Tech Company",
      requiredSkills = ["React", "TypeScript", "Node.js"],
      language = "javascript",
    } = body;

    const skillsStr = Array.isArray(requiredSkills) && requiredSkills.length > 0
      ? requiredSkills.slice(0, 6).join(", ")
      : "Full Stack Development";

    const problemTitle = `${company} Technical Viva: ${jobTitle}`;
    const problemDescription = `# ${company} Placement Technical Viva
- **Target Company**: ${company}
- **Role Focus**: ${jobTitle}
- **Required Stack**: ${skillsStr}
- **Format**: Live 15–20 Min Spoken Technical Viva with Staff Technical Architect

### Interview Objectives & Rubric:
1. **Core Language & Framework Mastery**: In-depth reasoning on ${skillsStr}.
2. **System Architecture & Production Trade-offs**: API design, state flow, caching, and database queries.
3. **Problem Solving & Live Coding Defense**: Code modularity, edge cases, and time/space complexity.
4. **Communication & Engineering Ownership**: Clear articulation using real project examples.

Speak naturally into your microphone when the interviewer introduces themselves. You can write code or notes on the scratchpad when asked.`;

    const starterCode = getVivaStarterCode(language, `${company} - ${jobTitle}`, "System Architecture", skillsStr);

    // Upsert or locate a dedicated JobRole for this company and position
    const cleanCompany = company.trim();
    const cleanTitle = jobTitle.trim();
    const roleSlug = `job-${cleanCompany}-${cleanTitle}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60);

    let jobRole = null;
    try {
      jobRole = await prisma.jobRole.upsert({
        where: { slug: roleSlug },
        update: {
          title: cleanTitle,
          targetSkills: skillsStr,
          description: `${cleanCompany} Technical Placement Viva focusing on ${skillsStr}`,
        },
        create: {
          slug: roleSlug,
          title: cleanTitle,
          targetSkills: skillsStr,
          description: `${cleanCompany} Technical Placement Viva focusing on ${skillsStr}`,
          department: "Engineering",
          level: "Mid-Level",
        },
      });
    } catch (roleErr) {
      console.warn("Could not upsert JobRole, continuing with problemTitle:", roleErr);
    }

    const interview = await prisma.interview.create({
      data: {
        userId: user.id,
        language: language.toLowerCase(),
        difficulty: "medium",
        duration: 20,
        status: "setup",
        style: "standard",
        jobRoleId: jobRole?.id || null,
        problemTitle,
        problemDescription,
        code: starterCode,
      },
    });

    return NextResponse.json({
      success: true,
      interviewId: interview.id,
      url: `/interview/${interview.id}`,
    });
  } catch (err: any) {
    console.error("Error creating job practice interview:", err);
    return NextResponse.json(
      { error: "Failed to create practice interview session." },
      { status: 500 }
    );
  }
}

