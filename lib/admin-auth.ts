import { cache } from "react";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

const BOOTSTRAP_ADMIN_EMAILS = [
  "rvkeerthi99@gmail.com",
  ...(process.env.ADMIN_EMAIL ? process.env.ADMIN_EMAIL.split(",").map((e) => e.trim().toLowerCase()) : []),
  ...(process.env.ADMIN_EMAILS ? process.env.ADMIN_EMAILS.split(",").map((e) => e.trim().toLowerCase()) : []),
];

/**
 * Checks if the current user has Staff or Admin privileges.
 * Authenticated dynamically via PostgreSQL database role ("staff" | "admin"),
 * with bootstrap fallback to super-admin email.
 */
export const authorizeStaff = cache(async function authorizeStaff(): Promise<boolean> {
  if (!process.env.CLERK_SECRET_KEY && process.env.NODE_ENV === "development") {
    return true;
  }

  try {
    const { userId } = await auth();
    if (!userId) return false;

    // 1. Check dynamic role stored in database
    const dbUser = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { role: true, email: true },
    });

    if (dbUser) {
      if (dbUser.role === "staff" || dbUser.role === "admin") return true;
      if (BOOTSTRAP_ADMIN_EMAILS.includes(dbUser.email.toLowerCase())) {
        if (dbUser.role !== "admin") {
          prisma.user.update({ where: { clerkId: userId }, data: { role: "admin" } }).catch(() => {});
        }
        return true;
      }
    }

    // 2. Fallback to Clerk email for bootstrap super-admins
    const clerk = await clerkClient();
    const user = await clerk.users.getUser(userId);
    const email = user.emailAddresses[0]?.emailAddress?.toLowerCase();
    if (email && BOOTSTRAP_ADMIN_EMAILS.includes(email)) return true;

    return false;
  } catch (error) {
    console.warn("authorizeStaff warning:", error);
    return false;
  }
});

/**
 * Checks if current user is a Super Admin.
 */
export const authorizeAdmin = cache(async function authorizeAdmin(): Promise<boolean> {
  if (!process.env.CLERK_SECRET_KEY && process.env.NODE_ENV === "development") {
    return true;
  }

  try {
    const { userId } = await auth();
    if (!userId) return false;

    const dbUser = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { role: true, email: true },
    });

    if (dbUser) {
      if (dbUser.role === "admin") return true;
      if (BOOTSTRAP_ADMIN_EMAILS.includes(dbUser.email.toLowerCase())) {
        if (dbUser.role !== "admin") {
          prisma.user.update({ where: { clerkId: userId }, data: { role: "admin" } }).catch(() => {});
        }
        return true;
      }
    }

    const clerk = await clerkClient();
    const user = await clerk.users.getUser(userId);
    const email = user.emailAddresses[0]?.emailAddress?.toLowerCase();
    if (email && BOOTSTRAP_ADMIN_EMAILS.includes(email)) return true;

    return false;
  } catch (error) {
    console.warn("authorizeAdmin warning:", error);
    return false;
  }
});

/**
 * Returns current authenticated user's database role: "student" | "staff" | "admin" | null
 */
export const getCurrentUserRole = cache(async function getCurrentUserRole(): Promise<"student" | "staff" | "admin" | null> {
  try {
    const { userId } = await auth();
    if (!userId) return null;

    const dbUser = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { role: true, email: true },
    });

    if (dbUser) {
      if (BOOTSTRAP_ADMIN_EMAILS.includes(dbUser.email.toLowerCase()) && dbUser.role !== "admin") {
        prisma.user.update({ where: { clerkId: userId }, data: { role: "admin" } }).catch(() => {});
        return "admin";
      }
      return (dbUser.role as "student" | "staff" | "admin") || "student";
    }

    const clerk = await clerkClient();
    const user = await clerk.users.getUser(userId);
    const email = user.emailAddresses[0]?.emailAddress?.toLowerCase();
    if (email && BOOTSTRAP_ADMIN_EMAILS.includes(email)) return "admin";

    return "student";
  } catch {
    return null;
  }
});
