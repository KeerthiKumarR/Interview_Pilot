import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth-user";
import { InterviewList, Interview } from "@/features/interview/components/interview-list";
import { StartInterviewButton } from "@/features/interview/components/start-interview-button";
import { ProgressChart } from "@/features/dashboard/components/progress-chart";
import {
  FileText,
  Mic,
  Award,
  Briefcase,
  CheckCircle2,
  ArrowRight,
  ChevronRight,
  Layers,
  Terminal,
} from "lucide-react";

export default async function DashboardPage() {
  const user = await getAuthenticatedUser();

  if (!user) redirect("/sign-in");

  let initialInterviews: Interview[] = [];
  let chartInterviews: Array<{
    id: string;
    createdAt: Date;
    report: { overallScore: number } | null;
  }> = [];
  let totalInterviews = 0;
  let jobPostingsCount = 0;
  let studentProfile: {
    targetRole: string | null;
    resumeFileName: string | null;
    skills: any;
    projects: Array<{
      id: string;
      title: string;
      techStack: any;
      repoUrl: string | null;
      liveUrl: string | null;
    }>;
    readinessScore: {
      overallScore: number;
      tier: string;
    } | null;
  } | null = null;

  try {
    // Single indexed primary-key query for profile, projects, recent interviews, and total count
    const [userData, jobCount] = await Promise.all([
      prisma.user.findUnique({
        where: { id: user.id },
        select: {
          studentProfile: {
            select: {
              targetRole: true,
              resumeFileName: true,
              skills: true,
              projects: {
                orderBy: { order: "asc" },
                take: 3,
                select: {
                  id: true,
                  title: true,
                  techStack: true,
                  repoUrl: true,
                  liveUrl: true,
                },
              },
              readinessScore: {
                select: { overallScore: true, tier: true },
              },
            },
          },
          interviews: {
            orderBy: { createdAt: "desc" },
            take: 20,
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
          },
          _count: {
            select: { interviews: true },
          },
        },
      }),
      prisma.jobPosting.count().catch(() => 0),
    ]);

    if (userData) {
      studentProfile = userData.studentProfile;
      initialInterviews = userData.interviews;
      totalInterviews = userData._count.interviews;
      chartInterviews = userData.interviews
        .filter((i) => i.report !== null && typeof i.report?.overallScore === "number")
        .map((i) => ({
          id: i.id,
          createdAt: i.createdAt,
          report: i.report,
        }))
        .reverse();
    }
    jobPostingsCount = jobCount;
  } catch {
    console.log("Database not available — showing empty state");
  }

  const primaryProject = studentProfile?.projects?.[0];
  const isProfileCalibrated = Boolean(studentProfile?.resumeFileName);
  const readinessTier = studentProfile?.readinessScore?.tier || "Calibration In Progress";
  const readinessScoreVal = studentProfile?.readinessScore?.overallScore ?? 0;

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-12 space-y-8">
      {/* ─── 1. COMMAND HEADER STATION ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-2 border-b border-border/80">
        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
            Placement Viva{" "}
            <span className="inline-block bg-[#FF4D4D] text-white px-3 py-0.5 rounded-xl border-2 border-black dark:border-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.7)] rotate-[-1deg] mx-1">
              Chamber
            </span>
          </h1>

          <p className="text-xs sm:text-sm text-muted-foreground font-medium max-w-2xl leading-relaxed">
            Simulate realistic 15–20 min technical architecture vivas, defend your verified project code before an AI board, and benchmark placement readiness.
          </p>
        </div>

        {/* Quick Launch CTA Button */}
        <div className="flex items-center gap-3 shrink-0">
          <StartInterviewButton className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#FF4D4D] hover:bg-[#e03e3e] px-6 text-sm font-black text-white border-2 border-black dark:border-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.7)] hover:translate-x-0.5 hover:-translate-y-0.5 transition-all cursor-pointer">
            <Mic className="size-4" />
            <span>Launch Placement Viva</span>
          </StartInterviewButton>
        </div>
      </div>

      {/* ─── 2. CORE WORKSPACE: PREPARATION TRACK & TELEMETRY STATION ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT / PRIMARY SPINE: CANDIDATE ROADMAP (Col 1-7) */}
        <div className="lg:col-span-7 xl:col-span-7 space-y-4">
          <div className="flex items-center justify-between pb-1">
            <div className="flex items-center gap-2">
              <Layers className="size-4 text-primary" />
              <h2 className="text-sm font-black uppercase tracking-wider text-foreground">
                Placement Preparation Track
              </h2>
            </div>
            <span className="text-[11px] font-bold text-muted-foreground">
              Candidate Workflow
            </span>
          </div>

          {/* Connected Vertical Timeline Spine */}
          <div className="relative pl-6 sm:pl-8 space-y-5 before:absolute before:left-2.5 sm:before:left-3.5 before:top-4 before:bottom-4 before:w-0.5 before:bg-border/80">
            {/* ─── STAGE 1: PROFILE CALIBRATION & PROJECT AUDIT ─── */}
            <div className="relative group">
              {/* Timeline Node Badge */}
              <div
                className={`absolute -left-6 sm:-left-8 top-4 size-5 sm:size-7 rounded-full border-2 flex items-center justify-center z-10 ${
                  isProfileCalibrated
                    ? "bg-emerald-500 text-white border-black dark:border-white"
                    : "bg-card text-muted-foreground border-border"
                }`}
              >
                {isProfileCalibrated ? <CheckCircle2 className="size-3.5" /> : <FileText className="size-3 sm:size-3.5" />}
              </div>

              {/* Stage Card */}
              <div className="rounded-2xl border-2 border-border bg-card p-4 sm:p-5 neo-shadow hover:border-foreground/30 transition-all space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                          isProfileCalibrated
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                            : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                        }`}
                      >
                        {isProfileCalibrated ? "Verified & Calibrated" : "Calibration Required"}
                      </span>
                    </div>
                    <h3 className="text-base font-black text-foreground">
                      Profile Calibration &amp; Codebase Indexing
                    </h3>
                  </div>

                  <Link
                    href="/dashboard/profile-intake"
                    prefetch={true}
                    className="inline-flex items-center gap-1 text-xs font-black text-primary hover:underline shrink-0"
                  >
                    <span>{isProfileCalibrated ? "Edit Profile" : "Calibrate"}</span>
                    <ArrowRight className="size-3" />
                  </Link>
                </div>

                <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                  ATS resume analysis, GitHub project repository indexing, and skill verification that anchor your viva cross-examination.
                </p>

                <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-border/60">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Target Role</span>
                    <span className="font-black text-foreground truncate">
                      {studentProfile?.targetRole || "Software Engineer"}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Verified Projects</span>
                    <span className="font-black text-foreground truncate">
                      {primaryProject?.title ? primaryProject.title : "No projects added yet"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ─── STAGE 2: TECHNICAL VIVA CHAMBER (ACTIVE HERO STAGE) ─── */}
            <div className="relative group">
              {/* Timeline Node Badge - Glowing Coral Beacon */}
              <div className="absolute -left-6 sm:-left-8 top-5 size-5 sm:size-7 rounded-full border-2 border-black dark:border-white bg-[#FF4D4D] text-white flex items-center justify-center z-10 shadow-xs">
                <Mic className="size-3.5" />
              </div>

              {/* Stage Card - Elevated Active Centerpiece */}
              <div className="rounded-2xl border-2 border-foreground/30 bg-card p-5 sm:p-6 neo-shadow ring-2 ring-[#FF4D4D]/50 space-y-4 relative overflow-hidden">
                <div className="h-1.5 w-full bg-[#FF4D4D] absolute top-0 left-0" />

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                        <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Ready for Defense
                      </span>
                    </div>
                    <h3 className="text-lg font-black text-foreground">
                      Live Technical Architecture Defense
                    </h3>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                  Real-time 15–20 min oral technical viva. The AI board cross-examines your system design, concurrency handling, database indexing, and design trade-offs.
                </p>

                {/* Candidate Anchor Preview */}
                <div className="rounded-xl border border-border bg-muted/30 p-3.5 space-y-2 text-xs">
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                      <Terminal className="size-3 text-primary" />
                      Candidate Defense Anchor
                    </span>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                      Verified Stack Linked
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Target Position</span>
                      <strong className="text-foreground">{studentProfile?.targetRole || "Full Stack Developer"}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Anchor Project</span>
                      <strong className="text-foreground truncate block">
                        {primaryProject?.title || "Portfolio Architecture"}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Launch Viva CTA inside Stage */}
                <div className="pt-2">
                  <StartInterviewButton className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#FF4D4D] hover:bg-[#e03e3e] text-white px-6 py-3.5 text-sm font-black border-2 border-black dark:border-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.7)] hover:translate-x-0.5 hover:-translate-y-0.5 transition-all cursor-pointer">
                    <Mic className="size-4" />
                    <span>Enter Viva Chamber &amp; Launch Defense</span>
                    <ArrowRight className="size-4 ml-1" />
                  </StartInterviewButton>
                </div>
              </div>
            </div>

            {/* ─── STAGE 3: READINESS BENCHMARK & DIAGNOSTIC ─── */}
            <div className="relative group">
              {/* Timeline Node Badge */}
              <div className="absolute -left-6 sm:-left-8 top-4 size-5 sm:size-7 rounded-full border-2 border-border bg-card text-foreground flex items-center justify-center z-10">
                <Award className="size-3.5 text-emerald-600 dark:text-emerald-400" />
              </div>

              {/* Stage Card */}
              <div className="rounded-2xl border-2 border-border bg-card p-4 sm:p-5 neo-shadow hover:border-foreground/30 transition-all space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                        {studentProfile?.readinessScore ? `Score: ${readinessScoreVal}/100` : "Diagnostic Engine"}
                      </span>
                    </div>
                    <h3 className="text-base font-black text-foreground">
                      Placement Readiness Scorecard &amp; Diagnostic
                    </h3>
                  </div>

                  <Link
                    href="/dashboard/readiness"
                    prefetch={true}
                    className="inline-flex items-center gap-1 text-xs font-black text-primary hover:underline shrink-0"
                  >
                    <span>View Scorecard</span>
                    <ArrowRight className="size-3" />
                  </Link>
                </div>

                <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                  Composite diagnostic across your ATS resume, codebase hygiene, viva clarity, and system reasoning with top 5 prioritized fixes.
                </p>

                <div className="flex items-center justify-between pt-1 border-t border-border/60 text-xs">
                  <span className="text-muted-foreground font-medium">Readiness Tier:</span>
                  <span className="font-black text-foreground">{readinessTier}</span>
                </div>
              </div>
            </div>

            {/* ─── STAGE 4: MATCHED CAMPUS DRIVES & ROLES ─── */}
            <div className="relative group">
              {/* Timeline Node Badge */}
              <div className="absolute -left-6 sm:-left-8 top-4 size-5 sm:size-7 rounded-full border-2 border-border bg-card text-foreground flex items-center justify-center z-10">
                <Briefcase className="size-3.5 text-purple-600 dark:text-purple-400" />
              </div>

              {/* Stage Card */}
              <div className="rounded-2xl border-2 border-border bg-card p-4 sm:p-5 neo-shadow hover:border-foreground/30 transition-all space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/30">
                        {jobPostingsCount > 0 ? `${jobPostingsCount} Drives Matched` : "Verified Drives"}
                      </span>
                    </div>
                    <h3 className="text-base font-black text-foreground">
                      Verified Campus Placement Drives &amp; Openings
                    </h3>
                  </div>

                  <Link
                    href="/dashboard/jobs"
                    prefetch={true}
                    className="inline-flex items-center gap-1 text-xs font-black text-primary hover:underline shrink-0"
                  >
                    <span>Explore Drives</span>
                    <ArrowRight className="size-3" />
                  </Link>
                </div>

                <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                  Direct recruiter pipelines and verified campus placement openings filtered by your validated readiness benchmark.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: TELEMETRY & FLIGHT INTELLIGENCE (Col 8-12) */}
        <div className="lg:col-span-5 xl:col-span-5 space-y-5">
          {/* Candidate Command Snapshot */}
          <div className="rounded-2xl border-2 border-border bg-card p-5 neo-shadow space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-border/80">
              <div className="space-y-0.5">
                <span className="text-sm font-black text-foreground block">
                  {user?.name || "Candidate"}
                </span>
                <span className="text-[11px] text-muted-foreground font-medium block">
                  {user?.email}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-xl border border-border bg-secondary/50 p-2.5">
                <span className="text-[10px] font-bold text-muted-foreground uppercase block">
                  Total Vivas
                </span>
                <span className="text-lg font-black text-foreground mt-0.5 block">
                  {totalInterviews}
                </span>
              </div>
              <div className="rounded-xl border border-border bg-secondary/50 p-2.5">
                <span className="text-[10px] font-bold text-muted-foreground uppercase block">
                  Readiness Score
                </span>
                <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                  {readinessScoreVal}/100
                </span>
              </div>
            </div>

            <div className="pt-1">
              <Link
                href="/dashboard/profile-intake"
                prefetch={true}
                className="w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-xl border-2 border-border bg-secondary hover:bg-secondary/80 text-xs font-black text-foreground transition-all"
              >
                <span>Update Resume &amp; Repositories</span>
                <ChevronRight className="size-3.5" />
              </Link>
            </div>
          </div>

          {/* Performance Telemetry Widget (Discrete pillars, no slabs!) */}
          <ProgressChart interviews={chartInterviews} />
        </div>
      </div>

      {/* ─── 3. INTERVIEW HISTORY & SCORECARDS TABLE ─── */}
      <section className="space-y-4 pt-4 border-t border-border/80">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-black tracking-tight text-foreground">
              Technical Viva History &amp; Scorecards
            </h2>
            <span className="rounded-full bg-secondary border border-border px-2.5 py-0.5 text-[11px] font-black text-muted-foreground">
              {totalInterviews} recorded
            </span>
          </div>
        </div>

        <InterviewList
          initialInterviews={initialInterviews}
          totalCount={totalInterviews}
          pageSize={20}
        />
      </section>
    </div>
  );
}
