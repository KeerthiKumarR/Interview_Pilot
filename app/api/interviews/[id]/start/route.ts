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
    const isTamil = spokenLanguage.startsWith("ta");
    const isTelugu = spokenLanguage.startsWith("te");
    const isMarathi = spokenLanguage.startsWith("mr");
    const isBengali = spokenLanguage.startsWith("bn");
    const isGujarati = spokenLanguage.startsWith("gu");
    const isMalayalam = spokenLanguage.startsWith("ml");

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
      openingPrompt = `ಅಭ್ಯರ್ಥಿಯು ಇಂಟರ್ವ್ಯೂ ರೂಮ್‌ಗೆ ಸೇರಿದ್ದಾರೆ. ನೀವು ಕನ್ನಡದಲ್ಲಿ ಮಾತನಾಡಬೇಕು (ಕನ್ನಡ ಲಿಪಿ ಬಳಸಿ). ನಿಮ್ಮ ಹೆಸರು ${interviewerName} ಎಂದು ಪರಿಚಯಿಸಿಕೊಳ್ಳಿ.`;
      if (targetCompany) {
        openingPrompt += ` ${targetCompany} ಕಂಪನಿಯ ${targetRole} ಹುದ್ದೆಯ ತಾಂತ್ರಿಕ ಸಂದರ್ಶನಕ್ಕೆ ಸ್ವಾಗತಿಸಿ. 2-3 ವಾಕ್ಯಗಳಲ್ಲಿ ಸ್ವಾಗತಿಸಿ ಮತ್ತು ತಮ್ಮ ಪರಿಚಯ ನೀಡಲು ಕೇಳಿ.`;
      } else {
        openingPrompt += ` 2-3 ವಾಕ್ಯಗಳಲ್ಲಿ ಸ್ವಾಗತಿಸಿ ಮತ್ತು ತಮ್ಮ ಪರಿಚಯ ನೀಡಲು ಕೇಳಿ.`;
      }
    } else if (isTamil) {
      openingPrompt = `நேர்காணல் அறைக்கு வந்துள்ள வேட்பாளரை வரவேற்கவும். நீங்கள் உரையாடலை முழுமையாக தமிழ் மொழியில் (தமிழ் எழுத்துகளில்) நடத்த வேண்டும். உங்கள் பெயர் ${interviewerName} என்று அறிமுகம் செய்து கொள்ளவும்.`;
      if (targetCompany) {
        openingPrompt += ` ${targetCompany} நிறுவனத்தின் ${targetRole} பணிக்கான தொழில்நுட்ப நேர்காணலுக்கு வரவேற்கவும். நிலை 1-ஐ தொடங்க அவர்களின் அறிமுகத்தை சுருக்கமாக கேட்கவும்.`;
      } else {
        openingPrompt += ` 2-3 வாக்கியங்களில் வரவேற்று அவர்களை அறிமுகப்படுத்திக் கொள்ள கேட்கவும்.`;
      }
    } else if (isTelugu) {
      openingPrompt = `అభ్యర్థి ఇంటర్వ్యూ రూమ్‌లో చేరారు. మీరు సంభాషణను పూర్తిగా తెలుగులో (తెలుగు లిపిలో) నిర్వహించాలి. మీ పేరు ${interviewerName} అని పరిచయం చేసుకోండి.`;
      if (targetCompany) {
        openingPrompt += ` ${targetCompany} కంపెనీలో ${targetRole} పోస్ట్ కోసం సాంకేతిక ఇంటర్వ్యూకు స్వాగతం పలకండి. దశ 1ని ప్రారంభించడానికి వారి పరిచయాన్ని అడగండి.`;
      } else {
        openingPrompt += ` 2-3 వాక్యాలలో స్వాగతించి తమను పరిచయం చేసుకోవాలని కోరండి.`;
      }
    } else if (isMarathi) {
      openingPrompt = `उमेदवार मुलाखत कक्षात उपस्थित झाले आहेत. तुम्हाला संपूर्ण संवाद मराठीत (देवनागरी लिपीत) करायचा आहे. स्वतःची ओळख ${interviewerName} म्हणून द्या.`;
      if (targetCompany) {
        openingPrompt += ` ${targetCompany} मधील ${targetRole} पदासाठी तांत्रिक मुलाखतीत त्यांचे स्वागत करा. टप्पा 1 सुरू करण्यासाठी त्यांची थोडक्यात ओळख विचारून घ्या.`;
      } else {
        openingPrompt += ` 2-3 वाक्यांत स्वागत करा आणि स्वतःची ओळख देण्यास सांगा.`;
      }
    } else if (isBengali) {
      openingPrompt = `প্রার্থী ইন্টারভিউ রুমে যোগ দিয়েছেন। আপনাকে সম্পূর্ণ কথোপকথন বাংলায় (বাংলা লিপিতে) পরিচালনা করতে হবে। আপনার নাম ${interviewerName} হিসেবে পরিচয় দিন।`;
      if (targetCompany) {
        openingPrompt += ` ${targetCompany}-এ ${targetRole} পদের প্রযুক্তিগত সাক্ষাৎকারে তাদের স্বাগত জানান। প্রথম পর্যায় শুরু করতে তাদের সংক্ষিপ্ত পরিচয় দিতে বলুন।`;
      } else {
        openingPrompt += ` 2-3টি বাক্যে স্বাগত জানান এবং নিজের পরিচয় দিতে অনুরোধ করুন।`;
      }
    } else if (isGujarati) {
      openingPrompt = `ઉમેદવાર ઇન્ટરવ્યુ રૂમમાં જોડાયા છે. તમારે વાતચીત સંપૂર્ણપણે ગુજરાતીમાં (ગુજરાતી લિપિમાં) કરવાની રહેશે. તમારી ઓળખ ${interviewerName} તરીકે આપો.`;
      if (targetCompany) {
        openingPrompt += ` ${targetCompany} માં ${targetRole} હોદ્દા માટે ટેકનિકલ ઇન્ટરવ્યુમાં તેમનું સ્વાગત કરો. તબક્કો 1 શરૂ કરવા માટે તેમનો ટૂંકો પરિચય પૂછો.`;
      } else {
        openingPrompt += ` 2-3 વાક્યોમાં સ્વાગત કરો અને પરિચય આપવા કહો.`;
      }
    } else if (isMalayalam) {
      openingPrompt = `ഉദ്യോഗാർത്ഥി അഭിമുഖ മുറിയിൽ ചേർന്നു. നിങ്ങൾ സംഭാഷണം പൂർണ്ണമായും മലയാളത്തിൽ (മലയാള ലിപിയിൽ) നടത്തണം. നിങ്ങളുടെ പേര് ${interviewerName} എന്ന് പരിചയപ്പെടുത്തുക.`;
      if (targetCompany) {
        openingPrompt += ` ${targetCompany}-ലെ ${targetRole} തസ്തികയിലേക്കുള്ള സാങ്കേതിക അഭിമുഖത്തിലേക്ക് സ്വാഗതം ചെയ്യുക. ഘട്ടം 1 ആരംഭിക്കാൻ അവരുടെ ലഘുവായ ആമുഖം ചോദിക്കുക.`;
      } else {
        openingPrompt += ` 2-3 വാക്യങ്ങളിൽ സ്വാഗതം ചെയ്ത് സ്വയം പരിചയപ്പെടുത്താൻ ആവശ്യപ്പെടുക.`;
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
        } else if (isTamil) {
          openingMessage = `வணக்கம்! நான் ${interviewerName}, இன்று ${targetCompany} நிறுவனத்தின் ${targetRole} பணிக்கான நேர்காணலை நடத்த உள்ளேன். நிலை 1-ஐ தொடங்க, தயவுசெய்து உங்களை அறிமுகப்படுத்துங்கள்.`;
        } else if (isTelugu) {
          openingMessage = `నమస్కారం! నేను ${interviewerName}, ఈ రోజు ${targetCompany} కంపెనీలో ${targetRole} పోస్ట్ కోసం మీ ఇంటర్వ్యూ నిర్వహించబోతున్నాను. మొదటి దశను ప్రారంభించడానికి, దయచేసి మీ పరిచయం ఇవ్వండి.`;
        } else if (isMarathi) {
          openingMessage = `नमस्कार! मी ${interviewerName}, आज मी ${targetCompany} मधील ${targetRole} पदासाठी तुमची मुलाखत घेणार आहे. स्टेज 1 सुरू करण्यासाठी, कृपया तुमची ओळख करून द्या.`;
        } else if (isBengali) {
          openingMessage = `নমস্কার! আমি ${interviewerName}, আজ আমি ${targetCompany}-এ ${targetRole} পদের জন্য আপনার সাক্ষাৎকার গ্রহণ করব। প্রথম পর্যায় শুরু করতে, দয়া করে আপনার পরিচয় দিন।`;
        } else if (isGujarati) {
          openingMessage = `નમસ્તે! હું ${interviewerName} છું, અને આજે હું ${targetCompany} માં ${targetRole} માટે તમારો ઇન્ટરવ્યુ લઈશ. તબક્કો 1 શરૂ કરવા માટે, કૃપા કરીને તમારો પરિચય આપો.`;
        } else if (isMalayalam) {
          openingMessage = `നമസ്കാരം! ഞാൻ ${interviewerName}, ഇന്ന് ${targetCompany}-ലെ ${targetRole} തസ്തികയിലേക്കുള്ള അഭിമുഖം നടത്തുന്നു. ഘട്ടം 1 ആരംഭിക്കാൻ, ദയവായി സ്വയം പരിചയപ്പെടുത്തുക.`;
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
        } else if (isTamil) {
          openingMessage = `வணக்கம்! நான் ${interviewerName}, இன்று உங்கள் ${role} பிளேஸ்மென்ட் வைவா நேர்காணலை நடத்த உள்ளேன். உங்கள் விவரக்குறிப்பு மற்றும் திட்டங்களை மதிப்பாய்வு செய்துள்ளேன். நிலை 1-ஐ தொடங்க, தயவுசெய்து உங்களை அறிமுகப்படுத்துங்கள்.`;
        } else if (isTelugu) {
          openingMessage = `నమస్కారం! నేను ${interviewerName}, ఈ రోజు మీ ${role} ప్లేస్‌మెంట్ వైవా ఇంటర్వ్యూ నిర్వహించబోతున్నాను. మీ ప్రొఫైల్ మరియు ప్రాజెక్ట్‌లను పరిశీలించాను. మొదటి దశను ప్రారంభించడానికి, దయచేసి మిమ్మల్ని పరిచయం చేసుకోండి.`;
        } else if (isMarathi) {
          openingMessage = `नमस्कार! मी ${interviewerName}, आज मी तुमची ${role} प्लेसमेंट व्हायव्हा मुलाखत घेणार आहे. मी तुमचे प्रोफाइल आणि प्रकल्प तपासले आहेत. स्टेज 1 सुरू करण्यासाठी, कृपया तुमची ओळख करून द्या.`;
        } else if (isBengali) {
          openingMessage = `নমস্কার! আমি ${interviewerName}, আজ আমি আপনার ${role} প্লেসমেন্ট ভাইভা সাক্ষাৎকার গ্রহণ করব। আমি আপনার প্রোফাইল এবং প্রকল্পগুলি পর্যালোচনা করেছি। প্রথম পর্যায় শুরু করতে, দয়া করে আপনার পরিচয় দিন।`;
        } else if (isGujarati) {
          openingMessage = `નમસ્તે! હું ${interviewerName} છું, અને આજે હું તમારો ${role} પ્લેસમેન્ટ વાઇવા ઇન્ટરવ્યુ લઈશ. મેં તમારી પ્રોફાઇલ અને પ્રોજેક્ટ્સની સમીક્ષા કરી છે. તબક્કો 1 શરૂ કરવા માટે, કૃપા કરીને તમારો પરિચય આપો.`;
        } else if (isMalayalam) {
          openingMessage = `നമസ്കാരം! ഞാൻ ${interviewerName}, ഇന്ന് നിങ്ങളുടെ ${role} പ്ലേസ്‌മെന്റ് വൈവ ഇന്റർവ്യൂ നടത്താൻ പോകുന്നു. നിങ്ങളുടെ പ്രൊഫൈലും പ്രോജക്റ്റുകളും ഞാൻ അവലോകനം ചെയ്തു. സ്റ്റേജ് 1 ആരംഭിക്കാൻ, ദയവായി സ്വയം പരിചയപ്പെടുത്തുക.`;
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
        } else if (isTamil) {
          openingMessage = `வணக்கம், நான் ${interviewerName}, இன்று உங்கள் தொழில்நுட்ப நேர்காணலை நடத்த உள்ளேன். நீங்கள் தயாராக இருக்கும் போது, தயவுசெய்து உங்கள் அறிமுகத்தை கூறுங்கள்.`;
        } else if (isTelugu) {
          openingMessage = `నమస్కారం, నేను ${interviewerName}, ఈ రోజు మీ సాంకేతిక ఇంటర్వ్యూ నిర్వహించబోతున్నాను. మీరు సిద్ధంగా ఉన్నప్పుడు, దయచేసి మీ పరిచయాన్ని పంచుకోండి.`;
        } else if (isMarathi) {
          openingMessage = `नमस्कार, मी ${interviewerName}, आज तुमची तांत्रिक मुलाखत घेणार आहे. तुम्ही तयार असाल तेव्हा, कृपया तुमची ओळख करून द्या.`;
        } else if (isBengali) {
          openingMessage = `নমস্কার, আমি ${interviewerName}, আজ আপনার প্রযুক্তিগত সাক্ষাৎকার গ্রহণ করব। আপনি প্রস্তুত হলে, দয়া করে আপনার সংক্ষিপ্ত পরিচয় দিন।`;
        } else if (isGujarati) {
          openingMessage = `નમસ્તે, હું ${interviewerName} છું, અને આજે તમારો ટેકનિકલ ઇન્ટરવ્યુ લઈશ. જ્યારે તમે તૈયાર હોવ, ત્યારે કૃપા કરીને તમારો પરિચય આપો.`;
        } else if (isMalayalam) {
          openingMessage = `നമസ്കാരം, ഞാൻ ${interviewerName}, ഇന്ന് നിങ്ങളുടെ സാങ്കേതിക അഭിമുഖം നടത്തുന്നു. നിങ്ങൾ തയ്യാറാകുമ്പോൾ, ദയവായി നിങ്ങളുടെ ആമുഖം പങ്കിടുക.`;
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
