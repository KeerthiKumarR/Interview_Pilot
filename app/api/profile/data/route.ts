import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth-user";
import { prisma } from "@/lib/prisma";

/**
 * DELETE /api/profile/data
 * Allows the student to completely purge their stored profile, projects,
 * achievements, and review scores (Right to be forgotten / Privacy compliance).
 */
export async function DELETE() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const existingProfile = await prisma.studentProfile.findUnique({
      where: { userId: user.id },
    });

    if (!existingProfile) {
      return NextResponse.json({
        success: true,
        message: "No profile data exists for this user.",
      });
    }

    // Cascade delete handles projects, achievements, reviews, and readiness scores
    await prisma.studentProfile.delete({
      where: { id: existingProfile.id },
    });

    return NextResponse.json({
      success: true,
      message: "All student profile data has been deleted securely.",
    });
  } catch (error: any) {
    console.error("Error deleting student profile data:", error);
    return NextResponse.json(
      { error: "Failed to delete student profile data." },
      { status: 500 }
    );
  }
}
