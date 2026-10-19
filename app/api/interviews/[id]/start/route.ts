import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import {
  deepseekChat,
  buildInterviewerSystemPrompt,
} from "@/services/ai-service";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

/**
 * POST /api/interviews/[id]/start
 * Starts the interview — sets status to in_progress and generates
 * the AI interviewer's opening message.
 */
export async function POST(req: Request, context: RouteContext) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    const user = await prisma.user.findUnique({
      where: { clerkId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const interview = await prisma.interview.findUnique({
      where: { id, userId: user.id },
    });

    if (!interview) {
      return NextResponse.json(
        { error: "Interview not found" },
        { status: 404 }
      );
    }

    // Get voiceId and interviewStyle from request body if available
    let voiceId: string | undefined = undefined;
    let interviewStyle: string = "Standard";
    try {
      const body = await req.json();
      voiceId = body.voiceId;
      if (body.interviewStyle) {
        interviewStyle = body.interviewStyle;
      }
    } catch {
      // Empty or invalid JSON body is fine (e.g. initial request doesn't send voiceId)
    }

    // Update interview status and style
    await prisma.interview.update({
      where: { id },
      data: {
        status: "in_progress",
        startedAt: new Date(),
        style: interviewStyle,
      },
    });

    // Log the start event
    await prisma.eventLog.create({
      data: {
        eventType: "INTERVIEW_STARTED",
        interviewId: id,
        userId: user.id,
        details: { style: interviewStyle, duration: interview.duration }
      }
    });

    const INDIAN_VOICE_NAME_MAP: Record<string, string> = {
      local_female: "Ananya",
      local_male: "Aarav",
      am_adam: "Aarav",
      am_michael: "Rohan",
      am_fenrir: "Vikram",
      am_puck: "Kabir",
      am_echo: "Aditya",
      af_heart: "Ananya",
      af_bella: "Diya",
      af_sarah: "Isha",
      af_nicole: "Kavya",
      af_sky: "Meera",
      if_sara: "Priya",
      minimax_male_presenter: "Dev",
      minimax_female_shaonv: "Riya",
      minimax_female_yujie: "Sanya",
      gemini_alloy: "Neer",
      gemini_echo: "Siddharth",
      gemini_onyx: "Varun",
      gemini_nova: "Tara",
      gemini_shimmer: "Neha",
    };

    const isFemale = voiceId
      ? voiceId.startsWith("af_") || voiceId.startsWith("if_") || voiceId.startsWith("bf_") || voiceId.includes("female") || voiceId === "gemini_nova" || voiceId === "gemini_shimmer"
      : true; // Default to female voice (Ananya)
    const mappedName = voiceId ? INDIAN_VOICE_NAME_MAP[voiceId] : undefined;
    const interviewerName = mappedName || (isFemale ? "Ananya" : "Aarav");

    // Load student profile & resume context
    const studentProfile = await prisma.studentProfile.findUnique({
      where: { userId: user.id },
      include: {
        projects: { orderBy: { order: "asc" } },
        achievements: true,
      },
    });

    const { buildProfileInterviewDirective } = await import("@/lib/interview/profile-context");
    const profileDirective = buildProfileInterviewDirective(studentProfile ? {
      targetRole: studentProfile.targetRole,
      skills: Array.isArray(studentProfile.skills) ? (studentProfile.skills as string[]) : [],
      projects: studentProfile.projects,
      achievements: studentProfile.achievements,
    } : null);

    const isViva =
      !interview.jobRoleId ||
      interview.problemTitle?.toLowerCase().includes("viva") ||
      interview.problemTitle?.toLowerCase().includes("placement") ||
      interview.problemTitle?.toLowerCase().includes("project");

    // Generate AI's opening message
    const baseSystemPrompt = buildInterviewerSystemPrompt({
      problemTitle: interview.problemTitle,
      problemDescription: interview.problemDescription,
      language: interview.language,
      difficulty: interview.difficulty,
      style: interviewStyle,
      duration: interview.duration,
      voiceId: voiceId || "local_female",
      isViva,
    });

    const systemPrompt = `${baseSystemPrompt}${profileDirective}`;

    let openingPrompt = `The candidate has just joined the interview room. Introduce yourself warmly as ${interviewerName}, their senior technical interviewer for this placement viva.`;
    if (isViva && studentProfile) {
      const role = studentProfile.targetRole || "Software Engineer";
      const topSkills = Array.isArray(studentProfile.skills) && studentProfile.skills.length > 0
        ? (studentProfile.skills as string[]).slice(0, 3).join(", ")
        : "";
      const firstProject = studentProfile.projects?.[0]?.title?.trim();
      openingPrompt += ` Welcome them to their ${role} Placement Viva.`;
      if (topSkills) {
        openingPrompt += ` Acknowledge their skills in ${topSkills}.`;
      }
      if (firstProject) {
        openingPrompt += ` Reference their featured project "${firstProject}".`;
      }
      openingPrompt += ` To begin Stage 1 (Introduction & Role Fit), invite them to briefly introduce themselves and what inspired their technical journey into ${role}. Keep it warm, natural, and under 3 sentences so it's easy to listen to.`;
    } else {
      openingPrompt += ` Welcome them to the technical interview session and invite them to introduce themselves and their technical background. Keep it concise to 2-3 sentences.`;
    }

    let openingMessage: string;
    try {
      openingMessage = await deepseekChat(
        [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: openingPrompt,
          },
        ],
        { temperature: 0.8, maxTokens: 256 }
      );
      if (!openingMessage || !openingMessage.trim()) {
        throw new Error("Empty opening message from model");
      }
    } catch {
      // Fallback if AI provider is slow/unavailable
      if (isViva && studentProfile) {
        const role = studentProfile.targetRole || "Software Engineer";
        const topSkills = Array.isArray(studentProfile.skills) && studentProfile.skills.length > 0
          ? (studentProfile.skills as string[]).slice(0, 3).join(", ")
          : "";
        const firstProject = studentProfile.projects?.[0]?.title?.trim();
        const skillsPhrase = topSkills ? ` in ${topSkills}` : "";
        const projectPhrase = firstProject ? ` and your featured project, ${firstProject}` : "";
        openingMessage = `Hi! I'm ${interviewerName}, and I'll be conducting your ${role} Placement Viva today. I was reviewing your background${skillsPhrase}${projectPhrase}. To kick things off with Stage 1, please introduce yourself and tell me a bit about your journey into ${role}.`;
      } else {
        const skillNote = studentProfile?.skills && (studentProfile.skills as string[]).length > 0
          ? ` with your background in ${(studentProfile.skills as string[]).slice(0, 2).join(" & ")}`
          : "";
        openingMessage = `Hi, I'm ${interviewerName}, and I'll be conducting your technical interview today${skillNote}. We have ${interview.duration} minutes for this session. Take a moment to review the workspace, and when you're ready, walk me through your initial thoughts.`;
      }
    }

    // Check if an opening message already exists for this interview
    const existingStartMsg = await prisma.message.findFirst({
      where: { interviewId: id, role: "assistant" },
      orderBy: { createdAt: "asc" },
    });

    if (existingStartMsg) {
      await prisma.message.update({
        where: { id: existingStartMsg.id },
        data: { content: openingMessage },
      });
    } else {
      await prisma.message.create({
        data: {
          interviewId: id,
          role: "assistant",
          content: openingMessage,
        },
      });
    }

    return NextResponse.json({ message: openingMessage });
  } catch (error) {
    console.error("Interview start error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
