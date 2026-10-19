import { auth, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { InterviewClient } from "@/features/interview/components/interview-client";

interface InterviewPageProps {
  params: Promise<{ id: string }>;
}

/**
 * Interview page — Server Component that fetches interview data
 * and passes it to the client-side interview UI.
 */
export default async function InterviewPage({ params }: InterviewPageProps) {
  const { userId: clerkId } = await auth();
  if (!clerkId) redirect("/sign-in");

  const { id } = await params;

  // Fetch or auto-sync user data
  let user = await prisma.user.findUnique({
    where: { clerkId },
    select: { id: true },
  });

  if (!user) {
    try {
      const clerk = await clerkClient();
      const cu = await clerk.users.getUser(clerkId);
      const email = cu.emailAddresses[0]?.emailAddress || `${clerkId}@user.com`;
      const name = `${cu.firstName || ""} ${cu.lastName || ""}`.trim() || "Candidate";
      user = await prisma.user.upsert({
        where: { email },
        update: { clerkId, name },
        create: { clerkId, email, name },
        select: { id: true },
      });
    } catch {
      redirect("/dashboard");
    }
  }

  const interview = await prisma.interview.findUnique({
    where: { id, userId: user.id },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
      jobRole: {
        include: {
          questions: {
            where: { isActive: true },
            orderBy: { order: "asc" },
          },
        },
      },
    },
  });

  if (!interview) redirect("/dashboard");

  // If already completed, redirect to report
  if (interview.status === "completed") {
    redirect(`/report/${interview.id}`);
  }

  // Load questions for this role or fall back to default global questions
  let roleQuestions = interview.jobRole?.questions || [];
  if (roleQuestions.length === 0) {
    roleQuestions = await prisma.interviewQuestion.findMany({
      where: { jobRoleId: null, isActive: true },
      orderBy: { order: "asc" },
    });
  }

  return (
    <InterviewClient
      interview={{
        id: interview.id,
        language: interview.language,
        difficulty: interview.difficulty,
        duration: interview.duration,
        status: interview.status,
        problemTitle: interview.problemTitle,
        problemDescription: interview.problemDescription,
        code: interview.code,
        startedAt: interview.startedAt ? interview.startedAt.getTime() : null,
        jobRoleId: interview.jobRoleId,
        jobRole: interview.jobRole,
        questions: roleQuestions,
      }}
      existingMessages={interview.messages.map((m) => ({
        id: m.id,
        role: m.role as "assistant" | "user" | "system",
        content: (m as any).thinking ? `\n*Thinking...*\n${(m as any).thinking}\n\n---\n\n${m.content}` : m.content,
        timestamp: m.createdAt.getTime(),
      }))}
    />
  );
}
