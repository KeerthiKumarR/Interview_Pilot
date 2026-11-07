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

    const voiceId = (body.voiceId as string | undefined) || "gnani_nalini";
    const isMale = voiceId.includes("arun") || voiceId.includes("male");
    const examinerName = isMale ? "Arun" : "Nalini";

    const openingMessage = `Hi! I'm ${examinerName}, and I'll be conducting your technical viva for the ${jobTitle} position at ${company} today. To kick things off with Stage 1, please introduce yourself and tell me what excites you about this role.`;

    const interview = await prisma.interview.create({
      data: {
        userId: user.id,
        language: language.toLowerCase(),
        difficulty: "medium",
        duration: 20,
        status: "setup",
        style: "standard",
        problemTitle,
        problemDescription,
        code: starterCode,
        messages: {
          create: {
            role: "assistant",
            content: openingMessage,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      interviewId: interview.id,
      url: `/interview/${interview.id}?voice=${encodeURIComponent(voiceId)}`,
    });
  } catch (err: any) {
    console.error("Error creating job practice interview:", err);
    return NextResponse.json(
      { error: "Failed to create practice interview session." },
      { status: 500 }
    );
  }
}

