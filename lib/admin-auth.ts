import { cache } from "react";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth-user";

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
    const user = await getAuthenticatedUser();
    if (!user) return false;

    if (user.role === "staff" || user.role === "admin") return true;
    if (BOOTSTRAP_ADMIN_EMAILS.includes(user.email.toLowerCase())) {
      if (user.role !== "admin") {
        prisma.user.update({ where: { id: user.id }, data: { role: "admin" } }).catch(() => {});
      }
      return true;
    }

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
    const user = await getAuthenticatedUser();
    if (!user) return false;

    if (user.role === "admin") return true;
    if (BOOTSTRAP_ADMIN_EMAILS.includes(user.email.toLowerCase())) {
      if (user.role !== "admin") {
        prisma.user.update({ where: { id: user.id }, data: { role: "admin" } }).catch(() => {});
      }
      return true;
    }

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
    const user = await getAuthenticatedUser();
    if (!user) return null;

    if (BOOTSTRAP_ADMIN_EMAILS.includes(user.email.toLowerCase())) {
      if (user.role !== "admin") {
        prisma.user.update({ where: { id: user.id }, data: { role: "admin" } }).catch(() => {});
      }
      return "admin";
    }

    return (user.role as "student" | "staff" | "admin") || "student";
  } catch {
    return null;
  }
});
