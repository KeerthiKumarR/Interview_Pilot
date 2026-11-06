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
      include: {
        jobRole: true,
      },
    });

    if (!interview) {
      return NextResponse.json(
        { error: "Interview not found" },
        { status: 404 }
      );
    }

    // Get voiceId, interviewStyle, and spokenLanguage from request body if available
    let voiceId: string | undefined = undefined;
    let interviewStyle: string = "Standard";
    let spokenLanguage: string = "en-IN";
    try {
      const body = await req.json();
      voiceId = body.voiceId;
      if (body.interviewStyle) {
        interviewStyle = body.interviewStyle;
      }
      if (body.spokenLanguage) {
        spokenLanguage = body.spokenLanguage;
      }
    } catch {
      // Empty or invalid JSON body is fine (e.g. initial request doesn't send voiceId)
    }

    // Check if an assistant greeting was already pre-seeded on creation for 0ms instant launch
    const existingStartMsg = await prisma.message.findFirst({
      where: { interviewId: id, role: "assistant" },
      orderBy: { createdAt: "asc" },
    });

    if (existingStartMsg && existingStartMsg.content) {
      await prisma.interview.update({
        where: { id },
        data: {
          status: "in_progress",
          startedAt: new Date(),
          style: interviewStyle,
        },
      });

      const openLower = existingStartMsg.content.toLowerCase();
      const isMale = openLower.includes("i'm arun") || openLower.includes("i am arun");
      const isPooja = openLower.includes("i'm pooja") || openLower.includes("i am pooja");
      const retName = isMale ? "Arun" : isPooja ? "Pooja" : "Nalini";
      const retVoice = isMale ? "gnani_arun" : isPooja ? "gnani_pooja" : "gnani_nalini";

      return NextResponse.json({
        message: existingStartMsg.content,
        interviewerName: retName,
        voiceId: retVoice,
        gender: isMale ? "male" : "female",
      });
    }

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
      gnani_nalini: "Nalini",
      gnani_pooja: "Pooja",
      gnani_arun: "Arun",
      nalini: "Nalini",
      pooja: "Pooja",
      arun: "Arun",
      local_female: "Nalini",
      local_male: "Arun",
      am_adam: "Arun",
      am_michael: "Rohan",
      am_fenrir: "Vikram",
      am_puck: "Kabir",
      am_echo: "Aditya",
      af_heart: "Nalini",
      af_bella: "Diya",
      af_sarah: "Isha",
      af_nicole: "Kavya",
      af_sky: "Meera",
      if_sara: "Priya",
      minimax_male_presenter: "Arun",
      minimax_female_shaonv: "Pooja",
      minimax_female_yujie: "Nalini",
      gemini_alloy: "Arun",
      gemini_echo: "Arun",
      gemini_onyx: "Arun",
      gemini_nova: "Pooja",
      gemini_shimmer: "Nalini",
    };

    const isFemale = voiceId
      ? voiceId.includes("nalini") ||
        voiceId.includes("pooja") ||
        voiceId.startsWith("af_") ||
        voiceId.startsWith("if_") ||
        voiceId.startsWith("bf_") ||
        voiceId.includes("female") ||
        voiceId === "gemini_nova" ||
        voiceId === "gemini_shimmer" ||
        voiceId === "local_female"
      : true; // Default to female voice (Nalini)
    const mappedName = voiceId ? INDIAN_VOICE_NAME_MAP[voiceId] : undefined;
    const interviewerName = mappedName || (isFemale ? "Nalini" : "Arun");

    // Load student profile & resume context
    const studentProfile = await prisma.studentProfile.findUnique({
      where: { userId: user.id },
      include: {
        projects: { orderBy: { order: "asc" } },
        achievements: true,
      },
    });

    // 1. Parse target company, role, and stack from jobRole or problemDescription/Title
    let targetCompany = "";
    let targetRole = studentProfile?.targetRole || "Software Engineer";
    let targetStackStr = "";

    if (interview.problemDescription) {
      const roleMatch = interview.problemDescription.match(/\-\s*\*\*Role Focus\*\*:\s*([^\n\r]+)/i);
      if (roleMatch && roleMatch[1]?.trim()) targetRole = roleMatch[1].trim();
      const compMatch = interview.problemDescription.match(/\-\s*\*\*Target Company\*\*:\s*([^\n\r]+)/i);
      if (compMatch && compMatch[1]?.trim()) targetCompany = compMatch[1].trim();
      const stackMatch = interview.problemDescription.match(/\-\s*\*\*(?:Required Stack|Verified Tech Stack)\*\*:\s*([^\n\r]+)/i);
      if (stackMatch && stackMatch[1]?.trim()) targetStackStr = stackMatch[1].trim();
    }

    if (interview.jobRole?.title) {
      targetRole = interview.jobRole.title;
    }
    if (interview.jobRole?.targetSkills) {
      targetStackStr = interview.jobRole.targetSkills;
    }

    if (!targetCompany && interview.problemTitle) {
      if (interview.problemTitle.includes("Technical Viva:")) {
        const parts = interview.problemTitle.split("Technical Viva:");
        targetCompany = parts[0]?.trim();
        if (!targetRole && parts[1]?.trim()) targetRole = parts[1].trim();
      } else if (interview.problemTitle.includes(":")) {
        const parts = interview.problemTitle.split(":");
        targetCompany = parts[0]?.trim();
        if (!targetRole && parts[1]?.trim()) targetRole = parts[1].trim();
      }
    }

    const { buildProfileInterviewDirective } = await import("@/lib/interview/profile-context");
    const profileDirective = buildProfileInterviewDirective(studentProfile ? {
      targetRole: targetRole,
      skills: Array.isArray(studentProfile.skills) ? (studentProfile.skills as string[]) : [],
      projects: studentProfile.projects,
      achievements: studentProfile.achievements,
    } : null);

    const isViva =
      !interview.jobRoleId ||
      interview.problemTitle?.toLowerCase().includes("viva") ||
      interview.problemTitle?.toLowerCase().includes("placement") ||
      interview.problemTitle?.toLowerCase().includes("project");

    const jobSpecificDirective = `
======================================================================
ACTIVE INTERVIEW ROLE & COMPANY CONTEXT
======================================================================
TARGET ROLE: ${targetRole}
${targetCompany ? `TARGET COMPANY: ${targetCompany}` : ""}
${targetStackStr ? `REQUIRED TECH STACK: ${targetStackStr}` : ""}

CRITICAL INSTRUCTIONS:
- You are interviewing the candidate specifically for the role of "${targetRole}"${targetCompany ? ` at ${targetCompany}` : ""}.
- Focus all 4 interview stages on the technical depth, architectural patterns, and engineering trade-offs required for "${targetRole}".
======================================================================
`;

    // Generate AI's opening message
    const baseSystemPrompt = buildInterviewerSystemPrompt({
      problemTitle: interview.problemTitle,
      problemDescription: interview.problemDescription,
      language: interview.language,
      difficulty: interview.difficulty,
      style: interviewStyle,
      duration: interview.duration,
      voiceId: voiceId || "gnani_nalini",
      isViva,
      spokenLanguage,
    });

    const systemPrompt = `${baseSystemPrompt}${jobSpecificDirective}${profileDirective}`;

    const isHindi = spokenLanguage.startsWith("hi");
    const isKannada = spokenLanguage.startsWith("kn");

    let openingPrompt = "";
    if (isHindi) {
      openingPrompt = `उम्मीदवार इंटरव्यू रूम में शामिल हो गए हैं। आपको बातचीत पूरी तरह हिंदी (देवनागरी लिपि) में करनी है। अपने आपको ${interviewerName} के रूप में पेश करें।`;
      if (isViva && targetCompany) {
        openingPrompt += ` उम्मीदवार का ${targetCompany} में ${targetRole} पद के लिए टेक्निकल प्लेसमेंट वायवा में स्वागत करें। उन्हें बताएं कि आज हम कोर आर्किटेक्चर, सिस्टम डिजाइन और उनके प्रोजेक्ट्स पर चर्चा करेंगे। स्टेज 1 (इंट्रोडक्शन और रोल अलाइनमेंट) शुरू करने के लिए, उनसे कहें कि वे अपना संक्षिप्त परिचय दें। 2-3 वाक्यों में बोलें ताकि ऑडियो सुनना आसान रहे।`;
      } else if (isViva && studentProfile) {
        const role = studentProfile.targetRole || "Software Engineer";
        const firstProject = studentProfile.projects?.[0]?.title?.trim();
        openingPrompt += ` उम्मीदवार का ${role} प्लेसमेंट वायवा में स्वागत करें। उनके मुख्य प्रोजेक्ट "${firstProject || "फुल स्टैक प्रोजेक्ट"}" का उल्लेख करें। स्टेज 1 (इंट्रोडक्शन और रोल अलाइनमेंट) शुरू करने के लिए, उनसे कहें कि वे अपना संक्षिप्त परिचय दें और सॉफ्टवेयर इंजीनियरिंग में अपनी यात्रा के बारे में बताएं। 2-3 वाक्यों में बोलें ताकि ऑडियो सुनना आसान रहे।`;
      } else {
        openingPrompt += ` उम्मीदवार का टेक्निकल इंटरव्यू में स्वागत करें और उनसे अपना परिचय देने का अनुरोध करें। 2-3 वाक्यों में संक्षिप्त रखें।`;
      }
    } else if (isKannada) {
      openingPrompt = `ಅಭ್ಯರ್ಥಿಯು ಇಂಟರ್ವ್ಯೂ ರೂಮ್‌ಗೆ ಸೇರಿದ್ದಾರೆ. ನೀವು ಕನ್ನಡದಲ್ಲಿ ಮಾತನಾಡಬೇಕು. ನಿಮ್ಮ ಹೆಸರು ${interviewerName} ಎಂದು ಪರಿಚಯಿಸಿಕೊಳ್ಳಿ.`;
      if (targetCompany) {
        openingPrompt += ` ${targetCompany} ಕಂಪನಿಯ ${targetRole} ಹುದ್ದೆಯ ತಾಂತ್ರಿಕ ಸಂದರ್ಶನಕ್ಕೆ ಸ್ವಾಗತಿಸಿ. 2-3 ವಾಕ್ಯಗಳಲ್ಲಿ ಸ್ವಾಗತಿಸಿ ಮತ್ತು ತಮ್ಮ ಪರಿಚಯ ನೀಡಲು ಕೇಳಿ.`;
      } else {
        openingPrompt += ` 2-3 ವಾಕ್ಯಗಳಲ್ಲಿ ಸ್ವಾಗತಿಸಿ ಮತ್ತು ತಮ್ಮ ಪರಿಚಯ ನೀಡಲು ಕೇಳಿ.`;
      }
    } else {
      openingPrompt = `The candidate has just joined the interview room. Introduce yourself warmly as ${interviewerName}, their senior technical interviewer for this placement viva.`;
      if (isViva && targetCompany) {
        openingPrompt += ` Welcome them warmly to their technical viva for the ${targetRole} position at ${targetCompany}. State that you will be exploring their architectural reasoning and engineering experience for this role. To begin Stage 1 (Introduction & Role Fit), invite them to briefly introduce themselves and what excites them about engineering scalable systems for ${targetCompany}. Keep it warm, natural, and under 3 sentences so it's easy to listen to over audio.`;
      } else if (isViva && studentProfile) {
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
      if (isViva && targetCompany) {
        if (isHindi) {
          openingMessage = `नमस्ते! मैं ${interviewerName} हूँ, और आज मैं ${targetCompany} में ${targetRole} पद के लिए आपका प्लेसमेंट वायवा इंटरव्यू लूँगी। स्टेज 1 शुरू करने के लिए, कृपया अपना परिचय दें और बताएं कि आप इस भूमिका के लिए क्यों उत्साहित हैं।`;
        } else if (isKannada) {
          openingMessage = `ನಮಸ್ಕಾರ! ನಾನು ${interviewerName}, ಮತ್ತು ಇಂದು ${targetCompany} ಕಂಪನಿಯ ${targetRole} ಹುದ್ದೆಗೆ ನಿಮ್ಮ ಸಂದರ್ಶನ ನಡೆಸಲಿದ್ದೇನೆ. ದಯವಿಟ್ಟು ನಿಮ್ಮ ಪರಿಚಯವನ್ನು ನೀಡಿ.`;
        } else {
          openingMessage = `Hi! I'm ${interviewerName}, and I'll be conducting your technical viva for the ${targetRole} position at ${targetCompany} today. To kick things off with Stage 1, please introduce yourself and tell me what excites you about this role.`;
        }
      } else if (isViva && studentProfile) {
        const role = studentProfile.targetRole || "Software Engineer";
        const firstProject = studentProfile.projects?.[0]?.title?.trim();
        const topSkills = Array.isArray(studentProfile.skills) && studentProfile.skills.length > 0
          ? (studentProfile.skills as string[]).slice(0, 3).join(", ")
          : "";
        if (isHindi) {
          openingMessage = `नमस्ते! मैं ${interviewerName} हूँ, और आज मैं आपका ${role} प्लेसमेंट वायवा इंटरव्यू लूँगी। मैंने आपकी प्रोफाइल और आपके मुख्य प्रोजेक्ट "${firstProject || "प्रोजेक्ट"}" को देखा है। स्टेज 1 शुरू करने के लिए, कृपया अपना परिचय दें और सॉफ्टवेयर इंजीनियरिंग में अपनी यात्रा के बारे में संक्षेप में बताएं।`;
        } else if (isKannada) {
          openingMessage = `ನಮಸ್ಕಾರ! ನಾನು ${interviewerName}, ಮತ್ತು ಇಂದು ನಾನು ನಿಮ್ಮ ${role} ಪ್ಲೇಸ್‌ಮೆಂಟ್ ವೈವಾ ಇಂಟರ್ವ್ಯೂ ನಡೆಸಲಿದ್ದೇನೆ. ನಿಮ್ಮ ಪ್ರೊಫೈಲ್ ಮತ್ತು ಪ್ರಾಜೆಕ್ಟ್ ಅನ್ನು ಪರಿಶೀಲಿಸಿದ್ದೇನೆ. ದಯವಿಟ್ಟು ನಿಮ್ಮ ಪರಿಚಯವನ್ನು ನೀಡಿ ಮತ್ತು ನಿಮ್ಮ ತಾಂತ್ರಿಕ ಪ್ರಯಾಣದ ಬಗ್ಗೆ ತಿಳಿಸಿ.`;
        } else {
          const skillsPhrase = topSkills ? ` in ${topSkills}` : "";
          const projectPhrase = firstProject ? ` and your featured project, ${firstProject}` : "";
          openingMessage = `Hi! I'm ${interviewerName}, and I'll be conducting your ${role} Placement Viva today. I was reviewing your background${skillsPhrase}${projectPhrase}. To kick things off with Stage 1, please introduce yourself and tell me a bit about your journey into ${role}.`;
        }
      } else {
        if (isHindi) {
          openingMessage = `नमस्ते, मैं ${interviewerName} हूँ, और आज आपका टेक्निकल इंटरव्यू लूँगी। हमारे पास इस सेशन के लिए ${interview.duration} मिनट हैं। जब आप तैयार हों, कृपया अपना संक्षिप्त परिचय दें।`;
        } else if (isKannada) {
          openingMessage = `ನಮಸ್ಕಾರ, ನಾನು ${interviewerName}, ಮತ್ತು ಇಂದು ನಿಮ್ಮ ತಾಂತ್ರಿಕ ಸಂದರ್ಶನವನ್ನು ನಡೆಸಲಿದ್ದೇನೆ. ದಯವಿಟ್ಟು ನಿಮ್ಮ ಪರಿಚಯವನ್ನು ಹಂಚಿಕೊಳ್ಳಿ.`;
        } else {
          const skillNote = studentProfile?.skills && (studentProfile.skills as string[]).length > 0
            ? ` with your background in ${(studentProfile.skills as string[]).slice(0, 2).join(" & ")}`
            : "";
          openingMessage = `Hi, I'm ${interviewerName}, and I'll be conducting your technical interview today${skillNote}. We have ${interview.duration} minutes for this session. Take a moment to review the workspace, and when you're ready, walk me through your initial thoughts.`;
        }
      }
    }

    // Check if an opening message already exists for this interview
    const targetAssistantMsg = await prisma.message.findFirst({
      where: { interviewId: id, role: "assistant" },
      orderBy: { createdAt: "asc" },
    });

    if (targetAssistantMsg) {
      await prisma.message.update({
        where: { id: targetAssistantMsg.id },
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

    return NextResponse.json({
      message: openingMessage,
      interviewerName,
      voiceId: voiceId || (isFemale ? "gnani_nalini" : "gnani_arun"),
      gender: isFemale ? "female" : "male",
    });
  } catch (error) {
    console.error("Interview start error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
