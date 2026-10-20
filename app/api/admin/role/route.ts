import { NextResponse } from "next/server";
import { getCurrentUserRole } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/role
 * Returns the current authenticated user's role ("student" | "staff" | "admin" | null).
 */
export async function GET() {
  const role = await getCurrentUserRole();
  return NextResponse.json({
    role,
    isAdmin: role === "admin",
    isStaff: role === "staff" || role === "admin",
  });
}