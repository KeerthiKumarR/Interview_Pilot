import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth-user";
import { parseResumePdf } from "@/lib/profile/pdf-parser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30; // 30s timeout

/**
 * Ingests a PDF resume, parses its text, detects links and skills,
 * and returns the extracted information in memory.
 */
export async function POST(req: Request) {
  try {
    // Attempt authentication check without blocking client-side parsing
    const user = await getAuthenticatedUser().catch(() => null);

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file type
    const isPdf =
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      return NextResponse.json(
        {
          success: false,
          error: "Only PDF format is supported currently. Please upload a .pdf file.",
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
          error: "Resume file size exceeds the 5MB limit. Please upload a smaller PDF.",
        },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const parsed = await parseResumePdf(buffer);

    return NextResponse.json({
      success: true,
      fileName: file.name,
      fileSize: file.size,
      pageCount: parsed.pageCount,
      text: parsed.text,
      detectedSkills: parsed.detectedSkills,
      detectedLinks: parsed.detectedLinks,
      userId: user?.id || null,
    });
  } catch (error: any) {
    console.error("Error in /api/profile/upload-resume:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to parse PDF resume. Please ensure the file is not corrupted or password-protected.",
      },
      { status: 400 }
    );
  }
}
