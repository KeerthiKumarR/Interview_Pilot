import { SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { InterviewPilotLogo } from "@/components/interview-pilot-logo";
import {
  Sparkles,
  FileText,
  Search,
  Mic,
  Award,
  Briefcase,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Code2,
  Layers,
  BarChart3,
  ExternalLink,
} from "lucide-react";

export default async function HomePage() {
  const { userId } = await auth();
  const isUserSignedIn = !!userId;

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 flex h-16 w-full items-center justify-between border-b border-border/80 bg-background/80 px-6 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <InterviewPilotLogo
            size={36}
            showText={true}
            textClassName="text-base font-bold tracking-tight text-foreground"
            subtitle="Placement Readiness Copilot · AI"
          />
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          {!isUserSignedIn ? (
            <>
              <SignInButton mode="modal">
                <button className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground cursor-pointer px-3 py-1.5">
                  Sign In
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground shadow-xs transition-colors hover:bg-primary/90 cursor-pointer">
                  Get Started Free
                </button>
              </SignUpButton>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard"
                className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground shadow-xs transition-colors hover:bg-primary/90"
              >
                Open Dashboard
              </Link>
              <UserButton />
            </div>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="relative overflow-hidden px-6 pt-16 pb-20 sm:pt-24 sm:pb-28 text-center max-w-5xl mx-auto">
          {/* Value Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-xs font-medium text-primary mb-6">
            <Sparkles className="size-3.5" />
            <span>Autonomous AI Placement Preparation</span>
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl text-balance">
            Know You&apos;re <span className="text-primary underline decoration-primary/40 underline-offset-8">Placement-Ready</span> Before Your Interviewers Do
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed text-balance">
            Upload your resume, LinkedIn, GitHub, and live projects. Get a rigorous scored placement benchmark review, take a 15–20 minute AI mock viva with speech, calculate your readiness score, and match with verified jobs.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            {isUserSignedIn ? (
              <Link
                href="/dashboard"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-8 text-sm font-semibold text-primary-foreground shadow-md transition-all hover:bg-primary/90 hover:scale-102"
              >
                Go to Student Dashboard
                <ArrowRight className="size-4" />
              </Link>
            ) : (
              <SignUpButton mode="modal">
                <button className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-8 text-sm font-semibold text-primary-foreground shadow-md transition-all hover:bg-primary/90 hover:scale-102 cursor-pointer">
                  Start Placement Prep Free
                  <ArrowRight className="size-4" />
                </button>
              </SignUpButton>
            )}

            <Link
              href="/dashboard/profile-intake"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-border bg-card px-6 text-sm font-medium hover:bg-muted transition-colors"
            >
              <FileText className="size-4 text-primary" />
              Explore Profile Intake
            </Link>
          </div>

          {/* Quick Metrics Bar */}
          <div className="mt-14 grid grid-cols-2 gap-4 sm:grid-cols-4 max-w-4xl mx-auto pt-8 border-t border-border/60 text-left">
            <div className="p-3 rounded-lg border border-border/60 bg-card/50">
              <span className="text-2xl font-bold block text-primary">25% + 25%</span>
              <span className="text-xs text-muted-foreground">Resume & Project Quality</span>
            </div>
            <div className="p-3 rounded-lg border border-border/60 bg-card/50">
              <span className="text-2xl font-bold block text-foreground">20% Viva</span>
              <span className="text-xs text-muted-foreground">15–20 Min Speech Interview</span>
            </div>
            <div className="p-3 rounded-lg border border-border/60 bg-card/50">
              <span className="text-2xl font-bold block text-emerald-500">75+ Tier</span>
              <span className="text-xs text-muted-foreground">Placement Ready Benchmark</span>
            </div>
            <div className="p-3 rounded-lg border border-border/60 bg-card/50">
              <span className="text-2xl font-bold block text-foreground">Campus Drives</span>
              <span className="text-xs text-muted-foreground">Staff Job Board & Tracking</span>
            </div>
          </div>
        </section>

        {/* How It Works Journey Section */}
        <section className="px-6 py-16 bg-muted/30 border-y border-border/60">
          <div className="max-w-6xl mx-auto space-y-12">
            <div className="text-center max-w-2xl mx-auto">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                How It Works
              </span>
              <h2 className="text-3xl font-bold tracking-tight mt-2">
                A Complete Journey From Preparation to Placement
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Build your candidate profile, clear automated screening audits, practice realistic voice vivas, and track top opportunities.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Step 1 */}
              <div className="p-6 rounded-xl border border-border bg-card shadow-xs flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      <FileText className="size-5" />
                    </div>
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Step 1</span>
                  </div>
                  <h3 className="text-lg font-bold">Smart Profile Hub</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Upload your resume, connect your GitHub and LinkedIn, and share your technical achievements via natural AI conversation or direct document upload.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-border/40 flex items-center justify-between text-xs font-medium text-primary">
                  <span>Chat & Document Intake</span>
                  <CheckCircle2 className="size-4" />
                </div>
              </div>

              {/* Step 2 */}
              <div className="p-6 rounded-xl border border-border bg-card shadow-xs flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="size-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
                      <ShieldCheck className="size-5" />
                    </div>
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Step 2</span>
                  </div>
                  <h3 className="text-lg font-bold">ATS & Benchmark Audit</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Instant automated screening across industry standards: 1-page format, strong impact metrics, active project links, and repository health with ready-to-use rewrites.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-border/40 flex items-center justify-between text-xs font-medium text-blue-500">
                  <span>Actionable Rewrites</span>
                  <CheckCircle2 className="size-4" />
                </div>
              </div>

              {/* Step 3 */}
              <div className="p-6 rounded-xl border border-border bg-card shadow-xs flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="size-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500">
                      <Mic className="size-5" />
                    </div>
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Step 3</span>
                  </div>
                  <h3 className="text-lg font-bold">Realistic AI Voice Viva</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Dynamic two-way voice interview powered by Gnani.ai natural Indic speech. The AI probes your actual architecture, code decisions, and problem-solving depth.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-border/40 flex items-center justify-between text-xs font-medium text-amber-500">
                  <span>Conversational Voice Viva</span>
                  <CheckCircle2 className="size-4" />
                </div>
              </div>

              {/* Step 4 */}
              <div className="p-6 rounded-xl border border-border bg-card shadow-xs flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="size-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                      <BarChart3 className="size-5" />
                    </div>
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Step 4</span>
                  </div>
                  <h3 className="text-lg font-bold">Placement Readiness Score</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Clear 0–100 placement benchmark across Resume, Code, Viva, and Problem Solving. Discover your tier and get top 5 priority fixes before the actual drive.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-border/40 flex items-center justify-between text-xs font-medium text-emerald-500">
                  <span>Scorecard & Top 5 Fixes</span>
                  <CheckCircle2 className="size-4" />
                </div>
              </div>

              {/* Step 5 */}
              <div className="p-6 rounded-xl border border-border bg-card shadow-xs flex flex-col justify-between md:col-span-2 lg:col-span-2">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="size-10 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-500">
                      <Briefcase className="size-5" />
                    </div>
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Step 5</span>
                  </div>
                  <h3 className="text-lg font-bold">Curated Drives & Opportunity Tracking</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Auto-matched roles and campus placement drives tailored to your verified skills. Track status across Applied, Interviewing, and Offered all in one place.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-border/40 flex items-center justify-between text-xs font-medium text-purple-500">
                  <span>Direct Campus Drives · One-Click Apply · Status Tracking</span>
                  <CheckCircle2 className="size-4" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Call to Action Banner */}
        <section className="px-6 py-20 text-center max-w-4xl mx-auto space-y-6">
          <h2 className="text-3xl font-extrabold sm:text-4xl tracking-tight">
            Ready to Check Your Placement Readiness?
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base max-w-xl mx-auto">
            Get instant feedback on your resume, live links, GitHub repos, and speak with the AI interviewer today.
          </p>
          <div className="pt-2">
            <Link
              href="/dashboard"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-8 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-all"
            >
              Launch Placement Copilot
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-border/60 py-6 text-center text-xs text-muted-foreground bg-background">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>
            © {new Date().getFullYear()} InterviewPilot. All rights reserved.
          </span>
          <div className="flex items-center gap-4 text-xs">
            <Link href="/dashboard/profile-intake" className="hover:underline">Profile Intake</Link>
            <Link href="/dashboard/review" className="hover:underline">Review Engine</Link>
            <Link href="/dashboard" className="hover:underline">Mock Interview</Link>
            <Link href="/dashboard/readiness" className="hover:underline">Readiness Score</Link>
            <Link href="/dashboard/jobs" className="hover:underline">Jobs & Tracking</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
