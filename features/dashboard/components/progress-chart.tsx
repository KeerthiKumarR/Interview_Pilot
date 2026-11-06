"use client";

import { useMemo, useRef, useEffect, useState } from "react";
import { format } from "date-fns";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronLeft,
  ChevronRight,
  Activity,
  Target,
  Trophy,
  Zap,
} from "lucide-react";

interface ProgressChartProps {
  interviews: Array<{
    id: string;
    createdAt: Date | string;
    report: { overallScore: number } | null;
  }>;
}

export function ProgressChart({ interviews }: ProgressChartProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Keep all completed interviews with valid scores, sorted chronologically (oldest to newest)
  const completed = useMemo(() => {
    return interviews
      .filter((i) => i.report !== null && typeof i.report?.overallScore === "number")
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [interviews]);

  const scores = completed.map((i) => i.report!.overallScore);
  const latestScore = scores.length > 0 ? scores[scores.length - 1] : 0;
  const previousScore = scores.length > 1 ? scores[scores.length - 2] : latestScore;
  const diff = latestScore - previousScore;
  const averageScore =
    scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const bestScore = scores.length > 0 ? Math.max(...scores) : 0;

  const isScrollable = completed.length > 8;

  // Check scroll positions for chevron buttons
  const updateScrollState = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (el && isScrollable) {
      el.scrollLeft = el.scrollWidth;
      setTimeout(updateScrollState, 50);
    }
  }, [isScrollable, completed.length]);

  if (completed.length < 2) {
    return (
      <div className="rounded-2xl border-2 border-border bg-card p-5 neo-shadow space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="size-4 text-primary" />
            <span className="text-xs font-black uppercase tracking-wider text-foreground">
              Performance Telemetry
            </span>
          </div>
          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-secondary text-muted-foreground border border-border">
            Baseline Inactive
          </span>
        </div>
        <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 p-4 text-center space-y-1.5">
          <p className="text-xs font-bold text-foreground">
            Awaiting 2 Completed Viva Defenses
          </p>
          <p className="text-[11px] text-muted-foreground max-w-sm mx-auto font-medium leading-relaxed">
            Complete your technical architecture vivas to generate score velocity, benchmark tracking, and historical readiness trends.
          </p>
        </div>
      </div>
    );
  }

  const trendIcon =
    diff > 0 ? (
      <TrendingUp className="size-3.5 text-emerald-600 dark:text-emerald-400" />
    ) : diff < 0 ? (
      <TrendingDown className="size-3.5 text-rose-600 dark:text-rose-400" />
    ) : (
      <Minus className="size-3.5 text-muted-foreground" />
    );

  const trendBadge =
    diff > 0
      ? `+${diff} pts delta`
      : diff < 0
      ? `${diff} pts delta`
      : "Score steady";

  const handleScroll = (direction: "left" | "right") => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const scrollAmount = 200;
    el.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  return (
    <div className="rounded-2xl border-2 border-border bg-card text-card-foreground neo-shadow p-5 space-y-4">
      {/* Header with Title and Scroll Controls */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Activity className="size-4 text-primary" />
          <h3 className="text-xs font-black uppercase tracking-wider text-foreground">
            Performance Telemetry
          </h3>
          <span className="bg-[#FF4D4D] text-white text-[9px] font-black px-1.5 py-0.5 rounded border border-black/40 uppercase tracking-wider">
            Live Trajectory
          </span>
        </div>

        {isScrollable && (
          <div className="flex items-center gap-1 border-2 border-border rounded-lg p-0.5 bg-background shadow-xs">
            <button
              type="button"
              onClick={() => handleScroll("left")}
              disabled={!canScrollLeft}
              aria-label="Scroll older interviews"
              className="p-1 rounded text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
            >
              <ChevronLeft className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleScroll("right")}
              disabled={!canScrollRight}
              aria-label="Scroll newer interviews"
              className="p-1 rounded text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
            >
              <ChevronRight className="size-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* High-Density Metric Summary Chips */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-border bg-secondary/50 p-2.5 text-left">
          <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground">
            <Zap className="size-3 text-amber-500" />
            <span>Latest Viva</span>
          </div>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-lg font-black text-foreground tracking-tight">
              {latestScore}
            </span>
            <span className="text-[10px] text-muted-foreground font-bold">/100</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground mt-0.5">
            {trendIcon}
            <span className="truncate">{trendBadge}</span>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-secondary/50 p-2.5 text-left">
          <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground">
            <Trophy className="size-3 text-emerald-500" />
            <span>Avg Defense</span>
          </div>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-lg font-black text-foreground tracking-tight">
              {averageScore}
            </span>
            <span className="text-[10px] text-muted-foreground font-bold">/100</span>
          </div>
          <p className="text-[10px] text-muted-foreground font-bold mt-0.5">
            Across {completed.length} vivas
          </p>
        </div>

        <div className="rounded-xl border border-border bg-secondary/50 p-2.5 text-left">
          <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground">
            <Target className="size-3 text-primary" />
            <span>Best Benchmark</span>
          </div>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
              {bestScore}
            </span>
            <span className="text-[10px] text-muted-foreground font-bold">/100</span>
          </div>
          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-0.5">
            {bestScore >= 75 ? "Target Cleared" : "Target: 75+"}
          </p>
        </div>
      </div>

      {/* Discrete Pillar Chart (Fixed Width Columns — Never Stretched Slabs) */}
      <div className="relative pt-6 pb-2">
        {/* 75-Point Target Benchmark Line */}
        <div
          className="absolute inset-x-0 border-t border-dashed border-emerald-500/50 flex items-center justify-end pointer-events-none z-10"
          style={{ bottom: "calc(75% + 24px)" }}
        >
          <span className="text-[9px] font-black uppercase text-emerald-600 dark:text-emerald-400 bg-card px-1.5 -translate-y-1/2 border border-emerald-500/30 rounded">
            Target 75
          </span>
        </div>

        <div
          ref={scrollContainerRef}
          onScroll={updateScrollState}
          className="overflow-x-auto overflow-y-hidden scrollbar-none"
          style={{ scrollbarWidth: "none" }}
        >
          <div className="h-[140px] flex items-end gap-3.5 min-w-full px-1 border-b-2 border-border/80 pb-1">
            {completed.map((interview) => {
              const score = interview.report!.overallScore;
              // Map score 0-100 to height 12% - 100% so even a 0 is visible
              const heightPercent = Math.max(12, Math.min(100, score));

              let barBg = "bg-[#FF4D4D] text-white border-red-600 dark:border-red-400";
              let badgeColor = "text-rose-600 dark:text-rose-400";
              if (score >= 80) {
                barBg = "bg-emerald-500 text-white border-emerald-600 dark:border-emerald-400";
                badgeColor = "text-emerald-600 dark:text-emerald-400";
              } else if (score >= 60) {
                barBg = "bg-amber-500 text-white border-amber-600 dark:border-amber-400";
                badgeColor = "text-amber-600 dark:text-amber-400";
              }

              const formattedDate = format(new Date(interview.createdAt), "MMM d");

              return (
                <div
                  key={interview.id}
                  className="group flex flex-col items-center justify-end h-full w-10 sm:w-11 shrink-0 relative"
                >
                  {/* Score Label On Top of Pillar */}
                  <span className={`text-[10px] font-black tracking-tight mb-1 transition-transform group-hover:-translate-y-0.5 ${badgeColor}`}>
                    {score}
                  </span>

                  {/* Discrete Fixed-Width Pillar */}
                  <div
                    className={`w-full rounded-t-lg border-2 shadow-xs transition-all duration-300 group-hover:brightness-110 ${barBg}`}
                    style={{ height: `${heightPercent}%` }}
                  />

                  {/* Date Stamp Below Baseline */}
                  <span className="text-[9px] font-bold text-muted-foreground mt-1.5 truncate max-w-full">
                    {formattedDate}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
