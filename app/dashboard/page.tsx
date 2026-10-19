import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { InterviewList, Interview } from "@/features/interview/components/interview-list";
import { StartInterviewButton } from "@/features/interview/components/start-interview-button";
import { ProgressChart } from "@/features/dashboard/components/progress-chart";

export default async function DashboardPage() {
  const { userId: clerkId } = await auth();

  if (!clerkId) redirect("/sign-in");

  let initialInterviews: Interview[] = [];
  let chartInterviews: Array<{
    id: string;
    createdAt: Date;
    report: { overallScore: number } | null;
  }> = [];
  let totalInterviews = 0;

  try {
    const user = await prisma.user.findUnique({
      where: { clerkId },
      select: { id: true },
    });

    if (user) {
      // Fetch historical completed interviews with reports for the performance trend
      const [historyInterviews, recentInterviews, totalCount] = await Promise.all([
        prisma.interview.findMany({
          where: {
            userId: user.id,
            report: { isNot: null },
          },
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            createdAt: true,
            report: {
              select: { overallScore: true },
            },
          },
          take: 100,
        }),
        prisma.interview.findMany({
          where: { userId: user.id },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            language: true,
            difficulty: true,
            duration: true,
            status: true,
            problemTitle: true,
            startedAt: true,
            endedAt: true,
            createdAt: true,
            report: {
              select: { overallScore: true },
            },
          },
          take: 20,
        }),
        prisma.interview.count({
          where: { userId: user.id },
        }),
      ]);

      chartInterviews = historyInterviews;
      initialInterviews = recentInterviews;
      totalInterviews = totalCount;
    }
  } catch {
    // Database not connected or loading error — fallback to empty state
    console.log("Database not available — showing empty state");
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-10 space-y-8">
      {/* Welcome + CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Placement Readiness Copilot</h1>
            <span className="inline-flex items-center rounded-md border border-primary/20 bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
              MSOT
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Complete your profile, run the benchmark review, practice your 15–20 min AI viva, and track job applications.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <StartInterviewButton />
        </div>
      </div>

      {/* 5-Module Placement Flow Navigation */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Link
          href="/dashboard/profile-intake"
          className="group rounded-xl border border-border bg-card p-3.5 hover:border-primary/40 hover:bg-muted/40 transition-all flex flex-col justify-between"
        >
          <span className="text-[10px] font-semibold text-primary uppercase tracking-wider block mb-1">
            Module 1
          </span>
          <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors block">
            Profile Intake
          </span>
          <span className="text-[11px] text-muted-foreground mt-1 block">
            Resume, GitHub, LeetCode
          </span>
        </Link>

        <Link
          href="/dashboard/review"
          className="group rounded-xl border border-border bg-card p-3.5 hover:border-primary/40 hover:bg-muted/40 transition-all flex flex-col justify-between"
        >
          <span className="text-[10px] font-semibold text-blue-500 uppercase tracking-wider block mb-1">
            Module 2
          </span>
          <span className="text-xs font-semibold text-foreground group-hover:text-blue-500 transition-colors block">
            Review Engine
          </span>
          <span className="text-[11px] text-muted-foreground mt-1 block">
            Benchmarks & Rewrites
          </span>
        </Link>

        <div
          className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3.5 flex flex-col justify-between"
        >
          <span className="text-[10px] font-semibold text-amber-500 uppercase tracking-wider block mb-1">
            Module 3
          </span>
          <span className="text-xs font-semibold text-foreground block">
            Mock Interview
          </span>
          <span className="text-[11px] text-muted-foreground mt-1 block">
            15–20 Min Speech Viva
          </span>
        </div>

        <Link
          href="/dashboard/readiness"
          className="group rounded-xl border border-border bg-card p-3.5 hover:border-primary/40 hover:bg-muted/40 transition-all flex flex-col justify-between"
        >
          <span className="text-[10px] font-semibold text-emerald-500 uppercase tracking-wider block mb-1">
            Module 4
          </span>
          <span className="text-xs font-semibold text-foreground group-hover:text-emerald-500 transition-colors block">
            Readiness Score
          </span>
          <span className="text-[11px] text-muted-foreground mt-1 block">
            0–100 & Top 5 Fixes
          </span>
        </Link>

        <Link
          href="/dashboard/jobs"
          className="group rounded-xl border border-border bg-card p-3.5 hover:border-primary/40 hover:bg-muted/40 transition-all flex flex-col justify-between col-span-2 sm:col-span-1"
        >
          <span className="text-[10px] font-semibold text-purple-500 uppercase tracking-wider block mb-1">
            Module 5
          </span>
          <span className="text-xs font-semibold text-foreground group-hover:text-purple-500 transition-colors block">
            Jobs & Drives
          </span>
          <span className="text-[11px] text-muted-foreground mt-1 block">
            Boolean Search & Board
          </span>
        </Link>
      </div>

      {/* Performance Trend (Horizontally scrollable if > 10 interviews) */}
      <ProgressChart interviews={chartInterviews} />

      {/* Previous Interviews (Max 20 visible per page, with clean async Next page fetching) */}
      <section>
        <h2 className="text-sm font-medium text-muted-foreground">
          Previous Interviews
        </h2>
        <div className="mt-4">
          <InterviewList
            initialInterviews={initialInterviews}
            totalCount={totalInterviews}
            pageSize={20}
          />
        </div>
      </section>
    </div>
  );
}
