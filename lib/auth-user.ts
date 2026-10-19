import { auth, clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import type { User } from "@prisma/client";

interface CachedUser {
  user: User;
  expiresAt: number;
}

// In-memory user cache (2 minutes TTL) to prevent hammering remote DB on every concurrent API request
const userSessionCache = new Map<string, CachedUser>();
const inFlightUserQueries = new Map<string, Promise<User | null>>();

export function invalidateUserSessionCache(clerkId: string) {
  userSessionCache.delete(clerkId);
}

/**
 * Returns the currently authenticated Prisma user, auto-syncing with Clerk if necessary.
 * Features in-memory caching and in-flight deduplication to eliminate remote connection lag.
 */
export async function getAuthenticatedUser(): Promise<User | null> {
  const { userId: clerkId } = await auth();

  if (!clerkId) {
    return null;
  }

  // 1. Check in-memory cache
  const cached = userSessionCache.get(clerkId);
  const now = Date.now();
  if (cached && cached.expiresAt > now) {
    return cached.user;
  }

  // 2. Check if a database query for this clerkId is already in-flight
  const existingPromise = inFlightUserQueries.get(clerkId);
  if (existingPromise) {
    return existingPromise;
  }

  // 3. Launch deduplicated fetch
  const fetchPromise = (async () => {
    try {
      let user = await prisma.user.findUnique({
        where: { clerkId },
      });

      if (!user) {
        try {
          const clerk = await clerkClient();
          const cu = await clerk.users.getUser(clerkId);
          const email = cu.emailAddresses[0]?.emailAddress || `${clerkId}@user.com`;
          const name = `${cu.firstName || ""} ${cu.lastName || ""}`.trim() || "Candidate";
          const imageUrl = cu.imageUrl || null;

          user = await prisma.user.upsert({
            where: { email },
            update: { clerkId, name, imageUrl },
            create: { clerkId, email, name, imageUrl },
          });
        } catch (error) {
          console.error("Failed to auto-sync user with Clerk:", error);
          return null;
        }
      }

      if (user) {
        userSessionCache.set(clerkId, {
          user,
          expiresAt: Date.now() + 120_000, // 2 minutes
        });
      }

      return user;
    } finally {
      inFlightUserQueries.delete(clerkId);
    }
  })();

  inFlightUserQueries.set(clerkId, fetchPromise);
  return fetchPromise;
}
