import { auth, clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

/**
 * Returns the currently authenticated Prisma user, auto-syncing with Clerk if necessary.
 */
export async function getAuthenticatedUser() {
  const { userId: clerkId } = await auth();

  if (!clerkId) {
    return null;
  }

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

  return user;
}
