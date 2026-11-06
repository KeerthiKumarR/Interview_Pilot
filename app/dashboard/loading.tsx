import { Skeleton } from "@/components/ui/skeleton";

/**
 * Instant loading skeleton for the placement dashboard.
 * Perfectly mirrors the vertical Placement Preparation Track timeline and telemetry station,
 * eliminating layout shift and preventing old horizontal cards from flashing on reload.
 */
export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-12 space-y-8 animate-in fade-in duration-150">
      {/* ─── 1. COMMAND HEADER STATION SKELETON ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-2 border-b border-border/80">
        <div className="space-y-2">
          <Skeleton className="h-10 w-72 sm:w-96 rounded-2xl" />
          <Skeleton className="h-4 w-64 sm:w-80 rounded-md" />
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Skeleton className="h-11 w-44 rounded-xl" />
        </div>
      </div>

      {/* ─── 2. CORE WORKSPACE: PREPARATION TRACK & TELEMETRY STATION ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT / PRIMARY SPINE: CANDIDATE ROADMAP (Col 1-7) */}
        <div className="lg:col-span-7 xl:col-span-7 space-y-4">
          <div className="flex items-center justify-between pb-1">
            <div className="flex items-center gap-2">
              <Skeleton className="size-4 rounded-md" />
              <Skeleton className="h-4 w-48 rounded-md" />
            </div>
            <Skeleton className="h-3 w-24 rounded-md" />
          </div>

          {/* Connected Vertical Timeline Spine */}
          <div className="relative pl-6 sm:pl-8 space-y-5 before:absolute before:left-2.5 sm:before:left-3.5 before:top-4 before:bottom-4 before:w-0.5 before:bg-border/80">
            {/* Stage 1: Profile Calibration */}
            <div className="relative">
              <div className="absolute -left-6 sm:-left-8 top-4 size-5 sm:size-7 rounded-full border-2 bg-card border-border flex items-center justify-center z-10">
                <Skeleton className="size-3.5 rounded-full" />
              </div>
              <div className="rounded-2xl border-2 border-border bg-card p-4 sm:p-5 neo-shadow space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-28 rounded-md" />
                    <Skeleton className="h-5 w-56 rounded-md" />
                  </div>
                  <Skeleton className="h-4 w-16 rounded-md" />
                </div>
                <Skeleton className="h-4 w-full rounded-md" />
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/60">
                  <Skeleton className="h-8 rounded-md" />
                  <Skeleton className="h-8 rounded-md" />
                </div>
              </div>
            </div>

            {/* Stage 2: Technical Viva Chamber (Active Hero Stage) */}
            <div className="relative">
              <div className="absolute -left-6 sm:-left-8 top-5 size-5 sm:size-7 rounded-full border-2 border-black dark:border-white bg-[#FF4D4D] flex items-center justify-center z-10">
                <Skeleton className="size-3.5 rounded-full bg-white/60" />
              </div>
              <div className="rounded-2xl border-2 border-foreground/30 bg-card p-5 sm:p-6 neo-shadow ring-2 ring-[#FF4D4D]/50 space-y-4 relative overflow-hidden">
                <div className="h-1.5 w-full bg-[#FF4D4D] absolute top-0 left-0" />
                <div className="space-y-1 pt-1">
                  <Skeleton className="h-4 w-28 rounded-md" />
                  <Skeleton className="h-6 w-64 rounded-md" />
                </div>
                <Skeleton className="h-4 w-full rounded-md" />
                <div className="rounded-xl border border-border bg-muted/30 p-3.5 space-y-2">
                  <div className="flex justify-between">
                    <Skeleton className="h-3 w-36 rounded-md" />
                    <Skeleton className="h-3 w-24 rounded-md" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <Skeleton className="h-8 rounded-md" />
                    <Skeleton className="h-8 rounded-md" />
                  </div>
                </div>
                <Skeleton className="h-11 w-full rounded-xl" />
              </div>
            </div>

            {/* Stage 3: Placement Readiness Diagnostic */}
            <div className="relative">
              <div className="absolute -left-6 sm:-left-8 top-4 size-5 sm:size-7 rounded-full border-2 border-border bg-card flex items-center justify-center z-10">
                <Skeleton className="size-3.5 rounded-full" />
              </div>
              <div className="rounded-2xl border-2 border-border bg-card p-4 sm:p-5 neo-shadow space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-28 rounded-md" />
                    <Skeleton className="h-5 w-60 rounded-md" />
                  </div>
                  <Skeleton className="h-4 w-20 rounded-md" />
                </div>
                <Skeleton className="h-4 w-full rounded-md" />
                <div className="flex justify-between pt-1 border-t border-border/60">
                  <Skeleton className="h-4 w-24 rounded-md" />
                  <Skeleton className="h-4 w-32 rounded-md" />
                </div>
              </div>
            </div>

            {/* Stage 4: Verified Placement Drives */}
            <div className="relative">
              <div className="absolute -left-6 sm:-left-8 top-4 size-5 sm:size-7 rounded-full border-2 border-border bg-card flex items-center justify-center z-10">
                <Skeleton className="size-3.5 rounded-full" />
              </div>
              <div className="rounded-2xl border-2 border-border bg-card p-4 sm:p-5 neo-shadow space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-28 rounded-md" />
                    <Skeleton className="h-5 w-64 rounded-md" />
                  </div>
                  <Skeleton className="h-4 w-20 rounded-md" />
                </div>
                <Skeleton className="h-4 w-full rounded-md" />
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: TELEMETRY (Col 8-12) */}
        <div className="lg:col-span-5 xl:col-span-5 space-y-5">
          {/* Candidate Command Snapshot */}
          <div className="rounded-2xl border-2 border-border bg-card p-5 neo-shadow space-y-3.5">
            <div className="space-y-1 pb-2 border-b border-border/80">
              <Skeleton className="h-5 w-36 rounded-md" />
              <Skeleton className="h-3 w-44 rounded-md" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-border bg-secondary/50 p-2.5 space-y-1">
                <Skeleton className="h-3 w-16 rounded-md" />
                <Skeleton className="h-6 w-10 rounded-md" />
              </div>
              <div className="rounded-xl border border-border bg-secondary/50 p-2.5 space-y-1">
                <Skeleton className="h-3 w-20 rounded-md" />
                <Skeleton className="h-6 w-14 rounded-md" />
              </div>
            </div>
            <Skeleton className="h-8 w-full rounded-xl" />
          </div>

          {/* Performance Telemetry Widget */}
          <div className="rounded-2xl border-2 border-border bg-card p-5 neo-shadow space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-border/80">
              <div className="flex items-center gap-2">
                <Skeleton className="size-4 rounded-md" />
                <Skeleton className="h-4 w-36 rounded-md" />
              </div>
              <Skeleton className="h-4 w-20 rounded-md" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Skeleton className="h-10 rounded-lg" />
              <Skeleton className="h-10 rounded-lg" />
              <Skeleton className="h-10 rounded-lg" />
            </div>
            <div className="h-28 flex items-end gap-2 pt-2">
              {[45, 60, 50, 75, 55, 80].map((h, i) => (
                <Skeleton key={i} className="flex-1 rounded-t-md" style={{ height: `${h}%` }} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ─── 3. INTERVIEW HISTORY & SCORECARDS TABLE SKELETON ─── */}
      <section className="space-y-4 pt-4 border-t border-border/80">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-48 rounded-md" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
        <div className="space-y-2.5">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-2xl border-2 border-border bg-card px-5 py-4 neo-shadow-sm flex items-center justify-between"
            >
              <div className="space-y-2 min-w-0">
                <Skeleton className="h-4 w-48 sm:w-64 rounded-md" />
                <div className="flex items-center gap-2">
                  <Skeleton className="h-3 w-16 rounded-md" />
                  <Skeleton className="h-3 w-12 rounded-md" />
                  <Skeleton className="h-3 w-14 rounded-md" />
                </div>
              </div>
              <Skeleton className="h-7 w-20 rounded-xl" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
