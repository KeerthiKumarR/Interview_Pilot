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
  let studentProfile: {
    targetRole: string | null;
    resumeFileName: string | null;
    readinessScore: {
      overallScore: number;
      tier: string;
    } | null;
  } | null = null;

  try {
    // Run all database queries concurrently in a single network round-trip via user relation
    const [userWithProfile, historyInterviews, recentInterviews, totalCount] = await Promise.all([
      prisma.user.findUnique({
        where: { clerkId },
        select: {
          id: true,
          studentProfile: {
            select: {
              targetRole: true,
              resumeFileName: true,
              readinessScore: {
                select: { overallScore: true, tier: true },
              },
            },
          },
        },
      }),
      prisma.interview.findMany({
        where: {
          user: { clerkId },
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
        where: { user: { clerkId } },
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
        where: { user: { clerkId } },
      }),
    ]);

    chartInterviews = historyInterviews;
    initialInterviews = recentInterviews;
    totalInterviews = totalCount;
    studentProfile = userWithProfile?.studentProfile || null;
  } catch {
    console.log("Database not available — showing empty state");
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-10 space-y-8">
      {/* Welcome + CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Placement Mock Interview Hub</h1>
            <span className="inline-flex items-center rounded-md border border-primary/20 bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
              MSOT Module 3
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Practice realistic 15–20 min technical AI speech vivas, solve coding problems, and evaluate your readiness score.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <StartInterviewButton />
        </div>
      </div>

      {/* Profile & Benchmark Status Banner */}
      {studentProfile && studentProfile.resumeFileName ? (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl border border-primary/20 bg-primary/5 shadow-2xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-primary uppercase tracking-wider">
                Candidate Profile Synced
              </span>
              <span className="rounded-md border border-primary/20 bg-card px-2 py-0.5 text-xs font-semibold text-foreground">
                {studentProfile.targetRole}
              </span>
              {studentProfile.readinessScore && (
                <span className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  {studentProfile.readinessScore.overallScore}/100 · {studentProfile.readinessScore.tier}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Interviews are customized to your resume and coding stack. Benchmark review is active.
            </p>
          </div>
          <Link
            href="/dashboard/profile-intake"
            prefetch={true}
            className="text-xs font-semibold text-primary hover:underline shrink-0"
          >
            Profile & Review Hub &rarr;
          </Link>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 shadow-2xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                Setup Recommendation
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Upload your resume in Profile & Review once to get viva questions tailored to your actual tech stack and unlock automated ATS scoring.
            </p>
          </div>
          <Link
            href="/dashboard/profile-intake"
            prefetch={true}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors shrink-0"
          >
            <span>Complete Profile & Review</span>
          </Link>
        </div>
      )}

      {/* Placement Flow Navigation */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <Link
          href="/dashboard/profile-intake"
          prefetch={true}
          className="group rounded-xl border border-border bg-card p-3.5 hover:border-primary/40 hover:bg-muted/40 transition-all flex flex-col justify-between"
        >
          <span className="text-[10px] font-semibold text-primary uppercase tracking-wider block mb-1">
            Modules 1 & 2
          </span>
          <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors block">
            Profile & Review
          </span>
          <span className="text-[11px] text-muted-foreground mt-1 block">
            Resume, ATS & Benchmarks
          </span>
        </Link>

        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3.5 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider block mb-1">
              Module 3 (Current)
            </span>
            <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
          </div>
          <span className="text-xs font-semibold text-foreground block">
            Mock Interview
          </span>
          <span className="text-[11px] text-muted-foreground mt-1 block">
            15–20 Min Speech Viva & Code
          </span>
        </div>

        <Link
          href="/dashboard/readiness"
          prefetch={true}
          className="group rounded-xl border border-border bg-card p-3.5 hover:border-primary/40 hover:bg-muted/40 transition-all flex flex-col justify-between"
        >
          <span className="text-[10px] font-semibold text-emerald-500 uppercase tracking-wider block mb-1">
            Module 4
          </span>
          <span className="text-xs font-semibold text-foreground group-hover:text-emerald-500 transition-colors block">
            Readiness Score
          </span>
          <span className="text-[11px] text-muted-foreground mt-1 block">
            0–100 & Top 5 Priority Fixes
          </span>
        </Link>

        <Link
          href="/dashboard/jobs"
          prefetch={true}
          className="group rounded-xl border border-border bg-card p-3.5 hover:border-primary/40 hover:bg-muted/40 transition-all flex flex-col justify-between"
        >
          <span className="text-[10px] font-semibold text-purple-500 uppercase tracking-wider block mb-1">
            Module 5
          </span>
          <span className="text-xs font-semibold text-foreground group-hover:text-purple-500 transition-colors block">
            Jobs & Drives
          </span>
          <span className="text-[11px] text-muted-foreground mt-1 block">
            Student Board & Applications
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
