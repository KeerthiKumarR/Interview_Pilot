import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth-user";
import { parseResumePdf } from "@/lib/profile/pdf-parser";
import { parseResumeDocx } from "@/lib/profile/docx-parser";
import { extractResumeDataWithAi } from "@/lib/profile/ai-resume-extractor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60; // 60s timeout for AI analysis

/**
 * Ingests a PDF or DOCX resume, parses its text, detects links and skills,
 * runs AI-powered information extraction (OpenRouter/DeepSeek/Groq),
 * and returns structured data to auto-fill the candidate's profile.
 */
export async function POST(req: Request) {
  try {
    // Attempt authentication check without blocking parsing
    const user = await getAuthenticatedUser().catch(() => null);

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file provided" },
        { status: 400 }
      );
    }

    const lowerName = file.name.toLowerCase();
    const isPdf =
      file.type === "application/pdf" ||
      lowerName.endsWith(".pdf");
    const isDocx =
      file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      lowerName.endsWith(".docx") ||
      lowerName.endsWith(".doc");

    if (!isPdf && !isDocx) {
      return NextResponse.json(
        {
          success: false,
          error: "Only PDF (.pdf) and Word (.docx) formats are supported. Please upload a .pdf or .docx file.",
        },
        { status: 400 }
      );
    }

    // Limit size to 5MB
    const MAX_SIZE_BYTES = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        {
          success: false,
          error: "Resume file size exceeds the 5MB limit. Please upload a smaller file.",
        },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let parsed;
    if (isDocx) {
      parsed = await parseResumeDocx(buffer);
    } else {
      parsed = await parseResumePdf(buffer);
    }

    // Run AI-powered extraction for skills, projects, achievements, and profile handles
    let aiExtracted = null;
    if (parsed.text && parsed.text.length >= 40) {
      try {
        aiExtracted = await extractResumeDataWithAi(parsed.text);
      } catch (aiErr) {
        console.warn("AI extraction encountered an error, falling back to regex:", aiErr);
      }
    }

    // Merge regex detected skills with AI detected skills to avoid missing any
    const allSkillsSet = new Set<string>(parsed.detectedSkills || []);
    if (aiExtracted?.skills && Array.isArray(aiExtracted.skills)) {
      aiExtracted.skills.forEach((s) => allSkillsSet.add(s));
    }

    return NextResponse.json({
      success: true,
      fileName: file.name,
      fileSize: file.size,
      pageCount: parsed.pageCount,
      text: parsed.text,
      detectedSkills: Array.from(allSkillsSet),
      detectedLinks: parsed.detectedLinks,
      aiExtracted: aiExtracted || undefined,
      userId: user?.id || null,
    });
  } catch (error: any) {
    console.error("Error in /api/profile/upload-resume:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error.message ||
          "Failed to parse resume. Please ensure the file is not corrupted or password-protected.",
      },
      { status: 400 }
    );
  }
}
