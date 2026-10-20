import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth-user";
import { executeAndPersistProfileAudit } from "@/lib/review/run-profile-audit";

export const maxDuration = 60; // 60s for full audit runner

export async function POST() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await executeAndPersistProfileAudit(user.id);
    if (!result) {
      return NextResponse.json({ error: "Student profile not found." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      review: result.review,
      readinessScore: result.readinessScore,
    });
  } catch (error: unknown) {
    console.error("Error running full profile review:", error);
    const msg = error instanceof Error ? error.message : "Failed to run review.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

