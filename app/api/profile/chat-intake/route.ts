import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth-user";
import { deepseekChat } from "@/services/ai-service";

/**
 * POST /api/profile/chat-intake
 * Module 1: "The student talks to the app like a chat assistant and adds their details in any order."
 * Extracts profile details (skills, projects, handles, achievements) from natural language.
 */
export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { message, history } = await req.json();

    if (!message || !message.trim()) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const systemPrompt = `You are the Placement Readiness Copilot AI Intake Assistant for MSOT students.
Your goal is to converse with the student and extract all placement-relevant information they share in any order:
1. Target job role (e.g. Frontend Engineer, Full Stack Developer, ML Engineer)
2. GitHub handle or profile link
3. LeetCode / competitive programming handle and stats (problems solved, easy/medium/hard split, contest rating)
4. LinkedIn URL or summary/headline
5. Projects (title, tech stack, what it does, live URL, GitHub repo URL)
6. Technical skills (languages, frameworks, databases, cloud tools)
7. Co-curricular achievements (hackathons, certifications, club leadership)

You MUST respond strictly with a valid JSON object in this exact format:
{
  "reply": "Conversational friendly reply to the student. Acknowledge what was extracted, and gently ask for any missing key elements needed for placement readiness.",
  "extracted": {
    "targetRole": string | null,
    "githubUsername": string | null,
    "leetcodeUsername": string | null,
    "linkedinUrl": string | null,
    "linkedinAbout": string | null,
    "skills": string[] | null,
    "projects": Array<{
      "title": string,
      "techStack": string[],
      "liveUrl": string | null,
      "repoUrl": string | null,
      "description": string | null
    }> | null,
    "achievements": Array<{
      "title": string,
      "category": "hackathon" | "certification" | "club" | "award",
      "description": string | null
    }> | null
  }
}
Do not enclose in markdown blocks. Return only parseable JSON.`;

    const chatMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: systemPrompt },
    ];

    if (Array.isArray(history)) {
      for (const h of history.slice(-6)) {
        if (h.role === "user" || h.role === "assistant") {
          chatMessages.push({ role: h.role, content: h.content });
        }
      }
    }

    chatMessages.push({ role: "user", content: message.trim() });

    const rawResponse = await deepseekChat(chatMessages, {
      temperature: 0.3,
      maxTokens: 1200,
    });

    // Parse JSON safely
    let cleaned = rawResponse.trim();
    if (cleaned.startsWith("```json")) {
      cleaned = cleaned.replace(/^```json\s*/, "").replace(/\s*```$/, "");
    } else if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```\s*/, "").replace(/\s*```$/, "");
    }

    try {
      const parsed = JSON.parse(cleaned);
      return NextResponse.json({
        success: true,
        reply: parsed.reply || "Got it! I have recorded your details.",
        extracted: parsed.extracted || {},
      });
    } catch {
      return NextResponse.json({
        success: true,
        reply: rawResponse,
        extracted: {},
      });
    }
  } catch (error: any) {
    console.error("Chat intake error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process chat intake" },
      { status: 500 }
    );
  }
}
