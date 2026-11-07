import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth-user";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface CachedReviewResponse {
  payload: {
    review: any;
    readinessScore: any;
    hasProfile: boolean;
    targetRole?: string | null;
    resumeFileName?: string | null;
  };
  expiresAt: number;
}

const reviewMemoryCache = new Map<string, CachedReviewResponse>();

export function invalidateReviewCache(userId?: string) {
  if (userId) {
    reviewMemoryCache.delete(userId);
  } else {
    reviewMemoryCache.clear();
  }
}

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = Date.now();
    const cached = reviewMemoryCache.get(user.id);
    if (cached && cached.expiresAt > now) {
      return NextResponse.json(cached.payload, {
        headers: {
          "Cache-Control": "private, max-age=30, stale-while-revalidate=60",
        },
      });
    }

    // Single unified query with reviewReports relation included (eliminates second round-trip)
    const profile = await prisma.studentProfile.findUnique({
      where: { userId: user.id },
      include: {
        readinessScore: true,
        reviewReports: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (!profile) {
      const emptyPayload = {
        review: null,
        readinessScore: null,
        hasProfile: false,
      };
      return NextResponse.json(emptyPayload);
    }

    const latestReview =
      profile.reviewReports && profile.reviewReports.length > 0
        ? profile.reviewReports[0]
        : null;

    const payload = {
      review: latestReview,
      readinessScore: profile.readinessScore,
      hasProfile: true,
      targetRole: profile.targetRole,
      resumeFileName: profile.resumeFileName,
    };

    reviewMemoryCache.set(user.id, {
      payload,
      expiresAt: now + 30_000, // 30s cache
    });

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "private, max-age=30, stale-while-revalidate=60",
      },
    });
  } catch (error: unknown) {
    console.error("Error fetching review results:", error);
    const msg = error instanceof Error ? error.message : "Failed to fetch review.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
