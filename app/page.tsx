import { UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { MiraiLogo } from "@/components/mirai-logo";
import {
  Sparkles,
  FileText,
  Mic,
  Award,
  Briefcase,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Code2,
  Layers,
  BarChart3,
  Volume2,
  Laptop,
  Check,
  TrendingUp,
} from "lucide-react";

export default async function HomePage() {
  const { userId } = await auth();
  const isUserSignedIn = !!userId;

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground bg-dot-grid-subtle">
      {/* Top Google Tech 4-Color Accent Stripe (Inspired by Image 2) */}
      <div className="h-1.5 w-full grid grid-cols-4 shrink-0 border-b border-border/60">
        <div className="bg-[#4285F4]"></div>
        <div className="bg-[#EA4335]"></div>
        <div className="bg-[#FBBC05]"></div>
        <div className="bg-[#34A853]"></div>
      </div>

      {/* Top Navigation */}
      <header className="sticky top-0 z-50 flex h-16 w-full items-center justify-between border-b-2 border-border bg-card/85 px-6 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <MiraiLogo
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
              <Link
                href="/sign-in"
                className="text-sm font-bold text-muted-foreground transition-colors hover:text-foreground cursor-pointer px-3 py-1.5"
              >
                Sign In
              </Link>
              <Link
                href="/sign-up"
                className="inline-flex h-9 items-center justify-center rounded-xl bg-primary px-4 text-xs font-black text-primary-foreground border-2 border-primary/80 neo-shadow-sm transition-all hover:translate-x-0.5 hover:-translate-y-0.5 cursor-pointer"
              >
                Get Started Free
              </Link>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard"
                prefetch={true}
                className="inline-flex h-9 items-center justify-center rounded-xl bg-primary px-4 text-xs font-black text-primary-foreground border-2 border-primary/80 neo-shadow-sm transition-all hover:translate-x-0.5 hover:-translate-y-0.5"
              >
                Open Dashboard
              </Link>
              <UserButton />
            </div>
          )}
        </div>
      </header>

      {/* Main Experience */}
      <main className="flex-1 space-y-16 sm:space-y-24 pb-20">

        {/* ─── 1. CREATIVE HERO BANNER (Directly Inspired by Image 1 & 2) ─── */}
        <section className="px-4 sm:px-6 pt-10 sm:pt-14 max-w-6xl mx-auto">
          <div className="rounded-3xl border-2 border-border bg-gradient-to-br from-indigo-950 via-purple-950 to-stone-950 p-6 sm:p-12 text-white neo-shadow relative overflow-hidden">
            {/* Ambient Background Glow */}
            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-96 h-96 rounded-full bg-pink-500/15 blur-3xl pointer-events-none" />

            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              {/* Left Column: Headline & Action */}
              <div className="lg:col-span-7 space-y-6 text-left">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 backdrop-blur-md px-3.5 py-1 text-xs font-bold text-white">
                  <span className="size-2 rounded-full bg-[#FF4D4D] animate-ping" />
                  <span>Autonomous Placement Copilot</span>
                </div>

                <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-tight text-white">
                  Ace Your Next <br />
                  <span className="inline-block bg-[#FF4D4D] text-white px-3.5 py-0.5 rounded-xl border-2 border-white shadow-[3px_3px_0px_0px_rgba(255,255,255,0.9)] rotate-[-1deg] my-1">
                    Placement Viva
                  </span>{" "}
                  &amp; Interview
                </h1>

                <p className="text-base sm:text-lg text-stone-200 font-medium leading-relaxed max-w-xl">
                  Master your interviews with interactive AI speech vivas, scored benchmark audits, real-time code scratchpads, and verified 4-factor placement matching.
                </p>

                <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5">
                  {!isUserSignedIn ? (
                    <Link
                      href="/sign-up"
                      className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-white px-7 text-sm font-black text-stone-950 border-2 border-white neo-shadow hover:translate-x-0.5 hover:-translate-y-0.5 transition-all cursor-pointer shadow-lg"
                    >
                      Start Free Preparation
                      <ArrowRight className="size-4" />
                    </Link>
                  ) : (
                    <Link
                      href="/dashboard"
                      prefetch={true}
                      className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-white px-7 text-sm font-black text-stone-950 border-2 border-white neo-shadow hover:translate-x-0.5 hover:-translate-y-0.5 transition-all shadow-lg"
                    >
                      Open Student Dashboard
                      <ArrowRight className="size-4" />
                    </Link>
                  )}

                  <Link
                    href="/dashboard/profile-intake"
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border-2 border-white/30 bg-white/10 backdrop-blur-md px-6 text-sm font-bold text-white hover:bg-white/20 transition-all"
                  >
                    <FileText className="size-4 text-emerald-400" />
                    Explore Profile Intake
                  </Link>
                </div>
              </div>

              {/* Right Column: Visual Viva Preview Card (Image 1 Style) */}
              <div className="lg:col-span-5 flex justify-center">
                <div className="w-full max-w-sm rounded-2xl border-2 border-white/30 bg-stone-950/80 backdrop-blur-xl p-5 neo-shadow space-y-4 text-left shadow-2xl">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="size-3 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-xs font-black uppercase tracking-wider text-white">Live Viva Examiner</span>
                    </div>
                    <span className="text-[10px] font-bold bg-[#FFE4E6] text-stone-900 border border-black px-2 py-0.5 rounded-md">
                      Barge-in Active
                    </span>
                  </div>

                  {/* Examiner Audio Wave Box */}
                  <div className="rounded-xl border border-white/15 bg-white/5 p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                        <Volume2 className="size-3.5 text-indigo-400" />
                        Examiner Nalini Speaking
                      </span>
                      <div className="flex items-center gap-1 h-3">
                        <span className="w-1 h-2.5 bg-cyan-400 rounded-full animate-bounce" />
                        <span className="w-1 h-3.5 bg-emerald-400 rounded-full animate-bounce delay-75" />
                        <span className="w-1 h-2 bg-pink-400 rounded-full animate-bounce delay-150" />
                      </div>
                    </div>
                    <p className="text-xs text-stone-200 leading-snug font-medium italic">
                      &ldquo;Walk me through your database indexing strategy when handling concurrent write loads...&rdquo;
                    </p>
                  </div>

                  {/* Candidate Input Pill */}
                  <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 flex items-center justify-between text-xs">
                    <span className="text-emerald-300 font-semibold truncate mr-2">
                      🗣️ Candidate Spoken Answer...
                    </span>
                    <span className="shrink-0 bg-emerald-500 text-stone-950 px-2 py-0.5 rounded text-[10px] font-black uppercase">
                      Enter ↵
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 4-Stat Proof Counter Bar (Inspired by Image 1 & 2) */}
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="p-4 rounded-2xl border-2 border-border bg-card neo-shadow-sm text-center hover:translate-x-0.5 hover:-translate-y-0.5 transition-all">
              <span className="text-2xl sm:text-3xl font-black block text-indigo-600 dark:text-indigo-400">10,000+</span>
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Mock Vivas</span>
            </div>
            <div className="p-4 rounded-2xl border-2 border-border bg-card neo-shadow-sm text-center hover:translate-x-0.5 hover:-translate-y-0.5 transition-all">
              <span className="text-2xl sm:text-3xl font-black block text-[#FF4D4D]">96%</span>
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Readiness Jump</span>
            </div>
            <div className="p-4 rounded-2xl border-2 border-border bg-card neo-shadow-sm text-center hover:translate-x-0.5 hover:-translate-y-0.5 transition-all">
              <span className="text-2xl sm:text-3xl font-black block text-emerald-600 dark:text-emerald-400">500+</span>
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Partner Tech Drives</span>
            </div>
            <div className="p-4 rounded-2xl border-2 border-border bg-card neo-shadow-sm text-center hover:translate-x-0.5 hover:-translate-y-0.5 transition-all">
              <span className="text-2xl sm:text-3xl font-black block text-purple-600 dark:text-purple-400">24/7</span>
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Instant Feedback</span>
            </div>
          </div>
        </section>

        {/* ─── 2. "WHY CANDIDATES CHOOSE US" 4-CARD VALUE GRID (From Image 1) ─── */}
        <section className="px-4 sm:px-6 max-w-6xl mx-auto space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="bg-[#FF4D4D] text-white px-2.5 py-0.5 rounded-lg text-xs font-black uppercase tracking-wider shadow-xs">
              Why Candidates Choose Us
            </span>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
              End-to-End Placement Architecture
            </h2>
            <p className="text-sm text-muted-foreground font-medium">
              Everything required to pass technical vivas and land your target role.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1 */}
            <div className="rounded-2xl border-2 border-border bg-card p-5 neo-shadow-sm border-t-8 border-t-cyan-500 space-y-3 flex flex-col justify-between hover:translate-x-0.5 hover:-translate-y-0.5 transition-all">
              <div className="space-y-2">
                <div className="size-10 rounded-xl border-2 border-border bg-[#E0F2FE] flex items-center justify-center text-stone-900">
                  <Sparkles className="size-5 text-cyan-600" />
                </div>
                <h3 className="text-base font-black text-foreground">Role-Tailored Viva Questions</h3>
                <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                  Adaptive interview questions dynamically generated against your specific job title and verified project stack.
                </p>
              </div>
              <span className="text-xs font-bold text-cyan-600 flex items-center gap-1 pt-2 border-t border-border/40">
                Learn More <ArrowRight className="size-3" />
              </span>
            </div>

            {/* Card 2 */}
            <div className="rounded-2xl border-2 border-border bg-card p-5 neo-shadow-sm border-t-8 border-t-pink-500 space-y-3 flex flex-col justify-between hover:translate-x-0.5 hover:-translate-y-0.5 transition-all">
              <div className="space-y-2">
                <div className="size-10 rounded-xl border-2 border-border bg-[#FFE4E6] flex items-center justify-center text-stone-900">
                  <Mic className="size-5 text-pink-600" />
                </div>
                <h3 className="text-base font-black text-foreground">Two-Way Spoken Vivas</h3>
                <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                  Practice with realistic voice examiners in real-time. Features barge-in speech interruption and live captions.
                </p>
              </div>
              <span className="text-xs font-bold text-pink-600 flex items-center gap-1 pt-2 border-t border-border/40">
                Learn More <ArrowRight className="size-3" />
              </span>
            </div>

            {/* Card 3 */}
            <div className="rounded-2xl border-2 border-border bg-card p-5 neo-shadow-sm border-t-8 border-t-indigo-500 space-y-3 flex flex-col justify-between hover:translate-x-0.5 hover:-translate-y-0.5 transition-all">
              <div className="space-y-2">
                <div className="size-10 rounded-xl border-2 border-border bg-[#EDE9FE] flex items-center justify-center text-stone-900">
                  <ShieldCheck className="size-5 text-indigo-600" />
                </div>
                <h3 className="text-base font-black text-foreground">Automated Benchmark Audits</h3>
                <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                  Evaluates 1-page resume rules, live HTTP link health, GitHub commit velocity, and secrets exposure checks.
                </p>
              </div>
              <span className="text-xs font-bold text-indigo-600 flex items-center gap-1 pt-2 border-t border-border/40">
                Learn More <ArrowRight className="size-3" />
              </span>
            </div>

            {/* Card 4 */}
            <div className="rounded-2xl border-2 border-border bg-card p-5 neo-shadow-sm border-t-8 border-t-emerald-500 space-y-3 flex flex-col justify-between hover:translate-x-0.5 hover:-translate-y-0.5 transition-all">
              <div className="space-y-2">
                <div className="size-10 rounded-xl border-2 border-border bg-[#D1FAE5] flex items-center justify-center text-stone-900">
                  <BarChart3 className="size-5 text-emerald-600" />
                </div>
                <h3 className="text-base font-black text-foreground">Readiness Score &amp; Jobs</h3>
                <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                  Delivers an authoritative 0–100 tier score, top 5 priority fixes, and automated Boolean recruiter search queries.
                </p>
              </div>
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 pt-2 border-t border-border/40">
                Learn More <ArrowRight className="size-3" />
              </span>
            </div>
          </div>
        </section>

        {/* ─── 3. DEEP-DIVE CORE FEATURES SECTION (From Image 1) ─── */}
        <section className="px-4 sm:px-6 max-w-6xl mx-auto space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-black uppercase tracking-wider text-primary">
              Feature Deep-Dive
            </span>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
              Explore Our Core Features
            </h2>
            <p className="text-sm text-muted-foreground font-medium">
              Dive deep into the tools that transform placement interview performance.
            </p>
          </div>

          <div className="space-y-6">
            {/* Feature Card 1 */}
            <div className="rounded-3xl border-2 border-border bg-card neo-shadow overflow-hidden">
              <div className="bg-gradient-to-r from-cyan-600 to-blue-600 p-5 sm:p-6 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                    <Sparkles className="size-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-black">AI-Powered Question Generator &amp; Profile Intake</h3>
                    <p className="text-xs text-white/90 font-medium">Smart Question Gen Engine · Live Project Analysis</p>
                  </div>
                </div>
                <span className="self-start sm:self-auto text-xs font-bold bg-white text-stone-900 px-3 py-1 rounded-full">
                  Verified Engine
                </span>
              </div>

              <div className="p-6 sm:p-8 space-y-6">
                <p className="text-xs sm:text-sm text-muted-foreground font-medium leading-relaxed max-w-3xl">
                  Our advanced engine analyzes job descriptions, industry requirements, and your actual experience to generate highly targeted technical interview probes.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  {/* Left: Key Features */}
                  <div className="space-y-2.5">
                    <h4 className="text-xs font-black uppercase tracking-wider text-foreground">Key Features</h4>
                    <div className="space-y-2 text-xs font-medium text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Check className="size-3.5 text-emerald-500" />
                        <span>Role-specific problem generation based on job track</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="size-3.5 text-emerald-500" />
                        <span>Industry tailored scenario probing and database edge cases</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="size-3.5 text-emerald-500" />
                        <span>Behavioral and technical trade-off questions</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="size-3.5 text-emerald-500" />
                        <span>Adaptive difficulty calibrated to junior and senior tiers</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Benefits */}
                  <div className="space-y-2.5">
                    <h4 className="text-xs font-black uppercase tracking-wider text-foreground">Placement Benefits</h4>
                    <div className="space-y-2 text-xs font-medium text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="size-3.5 text-indigo-500" />
                        <span>80% reduction in viva anxiety before campus drives</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="size-3.5 text-indigo-500" />
                        <span>Covers 500+ tech roles, frameworks, and cloud stacks</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="size-3.5 text-indigo-500" />
                        <span>Consistent with tier-1 MNC hiring formats</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="size-3.5 text-indigo-500" />
                        <span>Continuous AI scoring and weakness diagnostics</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Success Story Green Callout Box (From Image 1) */}
                <div className="rounded-xl border-2 border-emerald-500/30 bg-emerald-500/10 p-4 flex items-center gap-3">
                  <div className="size-8 rounded-lg bg-emerald-500 text-stone-950 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="size-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
                      Placement Success Benchmark
                    </span>
                    <p className="text-xs font-medium text-foreground">
                      Students improved overall technical placement viva scores by 38% after just 2 complete role simulations.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Feature Card 2 */}
            <div className="rounded-3xl border-2 border-border bg-card neo-shadow overflow-hidden">
              <div className="bg-gradient-to-r from-pink-600 to-purple-600 p-5 sm:p-6 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                    <Mic className="size-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-black">Virtual Two-Way Speech Viva Practice</h3>
                    <p className="text-xs text-white/90 font-medium">Real-Time Acoustic Audio · Live Spoken Defense</p>
                  </div>
                </div>
                <span className="self-start sm:self-auto text-xs font-bold bg-white text-stone-900 px-3 py-1 rounded-full">
                  Speech-to-Speech
                </span>
              </div>

              <div className="p-6 sm:p-8 space-y-6">
                <p className="text-xs sm:text-sm text-muted-foreground font-medium leading-relaxed max-w-3xl">
                  Experience realistic spoken viva scenarios in a low-pressure environment. Build articulate communication, project defense skills, and live problem-solving confidence.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  {/* Left: Key Features */}
                  <div className="space-y-2.5">
                    <h4 className="text-xs font-black uppercase tracking-wider text-foreground">Key Features</h4>
                    <div className="space-y-2 text-xs font-medium text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Check className="size-3.5 text-pink-500" />
                        <span>Interactive spoken dialogue with AI examiners</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="size-3.5 text-pink-500" />
                        <span>Real-time voice interruption &amp; barge-in support</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="size-3.5 text-pink-500" />
                        <span>Adaptive silence auto-submission &amp; instant Enter ↵ send</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="size-3.5 text-pink-500" />
                        <span>Embedded Monaco code scratchpad for architecture sketches</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Benefits */}
                  <div className="space-y-2.5">
                    <h4 className="text-xs font-black uppercase tracking-wider text-foreground">Placement Benefits</h4>
                    <div className="space-y-2 text-xs font-medium text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="size-3.5 text-purple-500" />
                        <span>Eliminates nervous stammering and conversational hesitation</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="size-3.5 text-purple-500" />
                        <span>Trains candidates to explain trade-offs out loud</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="size-3.5 text-purple-500" />
                        <span>Detailed voice clarity, pace, and hesitation metrics</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="size-3.5 text-purple-500" />
                        <span>Immediate multi-tier evaluation upon stage finish</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── 4. HIRING ROADMAP & ROUNDS (Directly Inspired by Image 2) ─── */}
        <section className="px-4 sm:px-6 max-w-4xl mx-auto">
          <div className="rounded-3xl border-2 border-border bg-card p-6 sm:p-10 neo-shadow space-y-6">

            {/* Top Google Tech 4-Color Accent Line */}
            <div className="h-1.5 w-full grid grid-cols-4 rounded-full overflow-hidden mb-2">
              <div className="bg-[#4285F4]"></div>
              <div className="bg-[#EA4335]"></div>
              <div className="bg-[#FBBC05]"></div>
              <div className="bg-[#34A853]"></div>
            </div>

            {/* Header with Circular Laptop Badge (Image 2) */}
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <h2 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight flex flex-wrap items-center gap-2">
                  <span>Rounds 1–4:</span>
                  <span className="inline-block bg-[#FF4D4D] text-white px-3 py-0.5 rounded-xl border-2 border-black dark:border-white shadow-[2px_2px_0px_0px_#000] dark:shadow-[2px_2px_0px_0px_#fff]">
                    screening + viva + coding
                  </span>
                </h2>
                <p className="text-sm sm:text-base font-medium text-muted-foreground leading-relaxed max-w-lg">
                  The initial rounds are still core to the software engineering hiring and campus placement viva process.
                </p>
              </div>

              {/* Illustrated Laptop Badge */}
              <div className="size-16 sm:size-20 rounded-full border-2 border-border bg-[#FFE4E6] flex items-center justify-center shrink-0 neo-shadow-sm">
                <Laptop className="size-8 sm:size-10 text-stone-900" />
              </div>
            </div>

            {/* The 4 Stage Cards (Image 2 Style) */}
            <div className="space-y-3.5 pt-2">
              {/* Round 1 */}
              <div className="rounded-2xl border-2 border-border bg-background p-4 neo-shadow-sm hover:translate-x-0.5 hover:-translate-y-0.5 transition-all">
                <div className="flex items-start gap-3.5">
                  <div className="size-11 rounded-xl border-2 border-border bg-[#FFE4E6] flex items-center justify-center shrink-0">
                    <FileText className="size-5 text-stone-900" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black uppercase tracking-wider text-[#FF4D4D]">Round 1</span>
                      <span className="size-1.5 rounded-full bg-stone-300"></span>
                      <span className="text-xs font-bold text-muted-foreground">3 Mins</span>
                    </div>
                    <h3 className="text-base font-black text-foreground tracking-tight">Recruiter screening &amp; Role Fit</h3>
                    <p className="text-xs font-medium text-muted-foreground leading-relaxed">
                      Your background, career goals, technical stack alignment, and role expectations.
                    </p>
                  </div>
                </div>
              </div>

              {/* Round 2 */}
              <div className="rounded-2xl border-2 border-border bg-background p-4 neo-shadow-sm hover:translate-x-0.5 hover:-translate-y-0.5 transition-all">
                <div className="flex items-start gap-3.5">
                  <div className="size-11 rounded-xl border-2 border-border bg-[#EDE9FE] flex items-center justify-center shrink-0">
                    <Layers className="size-5 text-stone-900" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black uppercase tracking-wider text-[#FF4D4D]">Round 2</span>
                      <span className="size-1.5 rounded-full bg-stone-300"></span>
                      <span className="text-xs font-bold text-muted-foreground">7 Mins</span>
                    </div>
                    <h3 className="text-base font-black text-foreground tracking-tight">Project Architecture &amp; Deep Dive</h3>
                    <p className="text-xs font-medium text-muted-foreground leading-relaxed">
                      Technical design of your featured projects, API contracts, schema decisions, and deployment trade-offs.
                    </p>
                  </div>
                </div>
              </div>

              {/* Round 3 */}
              <div className="rounded-2xl border-2 border-border bg-background p-4 neo-shadow-sm hover:translate-x-0.5 hover:-translate-y-0.5 transition-all">
                <div className="flex items-start gap-3.5">
                  <div className="size-11 rounded-xl border-2 border-border bg-[#E0F2FE] flex items-center justify-center shrink-0">
                    <Code2 className="size-5 text-stone-900" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black uppercase tracking-wider text-[#FF4D4D]">Round 3</span>
                      <span className="size-1.5 rounded-full bg-stone-300"></span>
                      <span className="text-xs font-bold text-muted-foreground">7 Mins</span>
                    </div>
                    <h3 className="text-base font-black text-foreground tracking-tight">DSA &amp; Live Problem Solving</h3>
                    <p className="text-xs font-medium text-muted-foreground leading-relaxed">
                      Algorithmic problem solving, edge cases, time/space complexity, and code execution.
                    </p>
                  </div>
                </div>
              </div>

              {/* Round 4 */}
              <div className="rounded-2xl border-2 border-border bg-background p-4 neo-shadow-sm hover:translate-x-0.5 hover:-translate-y-0.5 transition-all">
                <div className="flex items-start gap-3.5">
                  <div className="size-11 rounded-xl border-2 border-border bg-[#FEF3C7] flex items-center justify-center shrink-0">
                    <Award className="size-5 text-stone-900" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black uppercase tracking-wider text-[#FF4D4D]">Round 4</span>
                      <span className="size-1.5 rounded-full bg-stone-300"></span>
                      <span className="text-xs font-bold text-muted-foreground">3 Mins</span>
                    </div>
                    <h3 className="text-base font-black text-foreground tracking-tight">Executive Scorecard &amp; Feedback</h3>
                    <p className="text-xs font-medium text-muted-foreground leading-relaxed">
                      Comprehensive 0–100 multi-factor evaluation, breakdown by criteria, and top priority improvements.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* High-Contrast "Remember" Banner (From Image 2) */}
            <div className="rounded-2xl border-2 border-black dark:border-border bg-neutral-950 p-4 text-white flex items-center gap-3 neo-shadow">
              <span className="shrink-0 bg-[#FF4D4D] text-white font-black text-xs px-2.5 py-1 rounded-lg border border-black uppercase tracking-wider shadow-xs">
                Remember
              </span>
              <p className="text-xs sm:text-sm font-medium text-stone-200 leading-snug">
                Technical viva evaluates your reasoning process and communication clarity, not just silent memorized code output.
              </p>
            </div>

          </div>
        </section>

        {/* ─── 5. FINAL CALL TO ACTION ─── */}
        <section className="px-4 sm:px-6 max-w-4xl mx-auto text-center space-y-6">
          <div className="rounded-3xl border-2 border-border bg-card p-8 sm:p-12 neo-shadow space-y-5">
            <span className="bg-[#FF4D4D] text-white px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider shadow-xs">
              Start Your Prep Today
            </span>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
              Ready to Discover Your Placement Readiness?
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base max-w-lg mx-auto font-medium">
              Upload your resume, audit your projects against written benchmarks, and take your first live spoken viva today.
            </p>
            <div className="pt-2">
              <Link
                href="/dashboard"
                prefetch={true}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-8 text-sm font-black text-primary-foreground border-2 border-primary/80 neo-shadow hover:translate-x-0.5 hover:-translate-y-0.5 transition-all shadow-md"
              >
                Launch Placement Copilot
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="w-full border-t-2 border-border py-6 text-center text-xs text-muted-foreground bg-card">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-3 font-medium">
          <span>
            © {new Date().getFullYear()} Mirai Copilot. All rights reserved.
          </span>
          <div className="flex items-center gap-4 text-xs">
            <Link href="/dashboard/profile-intake" className="hover:underline">Profile Intake</Link>
            <Link href="/dashboard/review" className="hover:underline">Review Engine</Link>
            <Link href="/dashboard" className="hover:underline">Mock Interview</Link>
            <Link href="/dashboard/readiness" className="hover:underline">Readiness Score</Link>
            <Link href="/dashboard/jobs" className="hover:underline">Jobs &amp; Tracking</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
