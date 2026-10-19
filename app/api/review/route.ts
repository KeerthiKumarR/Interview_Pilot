import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth-user";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await prisma.studentProfile.findUnique({
      where: { userId: user.id },
      include: {
        projects: { orderBy: { order: "asc" } },
        readinessScore: true,
      },
    });

    if (!profile) {
      return NextResponse.json({
        review: null,
        readinessScore: null,
        hasProfile: false,
      });
    }

    const latestReview = await prisma.profileReview.findFirst({
      where: { profileId: profile.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      review: latestReview,
      readinessScore: profile.readinessScore,
      hasProfile: true,
      targetRole: profile.targetRole,
      resumeFileName: profile.resumeFileName,
    });
  } catch (error: unknown) {
    console.error("Error fetching review results:", error);
    const msg = error instanceof Error ? error.message : "Failed to fetch review.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
