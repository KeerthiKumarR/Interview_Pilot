import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth-user";
import { prisma } from "@/lib/prisma";
import { SaveProfilePayload } from "@/types/profile";
import { executeAndPersistProfileAudit } from "@/lib/review/run-profile-audit";

export const dynamic = "force-dynamic";

interface CachedProfileResponse {
  profile: any;
  expiresAt: number;
}

const profileMemoryCache = new Map<string, CachedProfileResponse>();

export function invalidateProfileCache(userId?: string) {
  if (userId) {
    profileMemoryCache.delete(userId);
  } else {
    profileMemoryCache.clear();
  }
}

/**
 * GET /api/profile
 * Retrieves the authenticated student's profile, projects, and achievements.
 */
export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = Date.now();
    const cached = profileMemoryCache.get(user.id);
    if (cached && cached.expiresAt > now) {
      return NextResponse.json(
        { profile: cached.profile },
        {
          headers: {
            "Cache-Control": "private, max-age=30, stale-while-revalidate=60",
          },
        }
      );
    }

    const profile = await prisma.studentProfile.findUnique({
      where: { userId: user.id },
      include: {
        projects: {
          orderBy: { order: "asc" },
        },
        achievements: {
          orderBy: { createdAt: "desc" },
        },
        readinessScore: true,
      },
    });

    profileMemoryCache.set(user.id, {
      profile,
      expiresAt: now + 30_000, // 30s cache
    });

    return NextResponse.json(
      { profile },
      {
        headers: {
          "Cache-Control": "private, max-age=30, stale-while-revalidate=60",
        },
      }
    );
  } catch (error: any) {
    console.error("Error fetching student profile:", error);
    return NextResponse.json(
      { error: "Failed to retrieve student profile" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/profile
 * Creates or updates the authenticated student's profile with projects and achievements.
 */
export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: SaveProfilePayload = await req.json();

    // Clean usernames from full URLs if candidate pasted URLs instead of usernames
    let cleanGithub = body.githubUsername?.trim() || null;
    if (cleanGithub && cleanGithub.includes("github.com/")) {
      const match = cleanGithub.match(/github\.com\/([a-zA-Z0-9_-]+)/);
      if (match) cleanGithub = match[1];
    }

    let cleanLeetcode = body.leetcodeUsername?.trim() || null;
    if (cleanLeetcode && cleanLeetcode.includes("leetcode.com/")) {
      const match = cleanLeetcode.match(/leetcode\.com\/(?:u\/)?([a-zA-Z0-9_-]+)/);
      if (match) cleanLeetcode = match[1];
    }

    // Execute atomic transaction to save profile, projects, and achievements
    const result = await prisma.$transaction(async (tx) => {
      // 1. Upsert base profile
      const profile = await tx.studentProfile.upsert({
        where: { userId: user.id },
        update: {
          targetRole: body.targetRole || "Full Stack Developer",
          resumeFileName: body.resumeFileName || undefined,
          resumeText: body.resumeText || undefined,
          resumePageCount: body.resumePageCount !== undefined ? body.resumePageCount : undefined,
          linkedinUrl: body.linkedinUrl || null,
          linkedinAbout: body.linkedinAbout || null,
          githubUsername: cleanGithub,
          leetcodeUsername: cleanLeetcode,
          skills: body.skills ? body.skills : undefined,
        },
        create: {
          userId: user.id,
          targetRole: body.targetRole || "Full Stack Developer",
          resumeFileName: body.resumeFileName || null,
          resumeText: body.resumeText || null,
          resumePageCount: body.resumePageCount || 1,
          linkedinUrl: body.linkedinUrl || null,
          linkedinAbout: body.linkedinAbout || null,
          githubUsername: cleanGithub,
          leetcodeUsername: cleanLeetcode,
          skills: body.skills || [],
        },
      });

      // 2. Sync projects if provided
      if (body.projects && Array.isArray(body.projects)) {
        // Remove existing projects for this profile
        await tx.studentProject.deleteMany({
          where: { profileId: profile.id },
        });

        // Insert fresh project records
        if (body.projects.length > 0) {
          await tx.studentProject.createMany({
            data: body.projects.map((p, idx) => ({
              profileId: profile.id,
              title: p.title.trim() || `Project ${idx + 1}`,
              description: p.description?.trim() || null,
              repoUrl: p.repoUrl?.trim() || null,
              liveUrl: p.liveUrl?.trim() || null,
              techStack: p.techStack || [],
              order: p.order ?? idx + 1,
            })),
          });
        }
      }

      // 3. Sync achievements if provided
      if (body.achievements && Array.isArray(body.achievements)) {
        await tx.studentAchievement.deleteMany({
          where: { profileId: profile.id },
        });

        if (body.achievements.length > 0) {
          await tx.studentAchievement.createMany({
            data: body.achievements.map((a) => ({
              profileId: profile.id,
              title: a.title.trim(),
              category: a.category || "hackathon",
              description: a.description?.trim() || null,
              date: a.date?.trim() || null,
            })),
          });
        }
      }

      // Return refreshed full profile
      return await tx.studentProfile.findUnique({
        where: { id: profile.id },
        include: {
          projects: { orderBy: { order: "asc" } },
          achievements: { orderBy: { createdAt: "desc" } },
          readinessScore: true,
        },
      });
    });

    invalidateProfileCache(user.id);

    // Auto-trigger benchmark audit & readiness score recalculation in the background
    // whenever profile details or resume text are updated
    void executeAndPersistProfileAudit(user.id).catch((err) => {
      console.warn("Background profile audit error:", err);
    });

    return NextResponse.json({
      success: true,
      profile: result,
    });
  } catch (error: any) {
    console.error("Error saving student profile:", error);
    return NextResponse.json(
      { error: error.message || "Failed to save student profile" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/profile
 * Deletes all stored data about the student (Module 1 privacy requirement:
 * "The student can see, edit and delete everything stored about them").
 */
export async function DELETE() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.$transaction(async (tx) => {
      const existing = await tx.studentProfile.findUnique({
        where: { userId: user.id },
        select: { id: true },
      });

      if (existing) {
        await tx.studentProject.deleteMany({ where: { profileId: existing.id } });
        await tx.studentAchievement.deleteMany({ where: { profileId: existing.id } });
        await tx.profileReview.deleteMany({ where: { profileId: existing.id } });
        await tx.readinessScore.deleteMany({ where: { profileId: existing.id } });
        await tx.studentProfile.delete({ where: { id: existing.id } });
      }
    });

    return NextResponse.json({
      success: true,
      message: "All stored profile data has been deleted securely.",
    });
  } catch (error: any) {
    console.error("Error deleting student profile:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete student profile" },
      { status: 500 }
    );
  }
}

