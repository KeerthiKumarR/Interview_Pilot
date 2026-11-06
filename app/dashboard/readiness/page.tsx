"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Sparkles,
  ArrowLeft,
  Calendar,
  RotateCw,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ReadinessHeroCard } from "@/features/readiness/components/readiness-hero-card";
import { ReadinessBreakdownCard } from "@/features/readiness/components/readiness-breakdown-card";
import { HighImpactActionsCard } from "@/features/readiness/components/high-impact-actions-card";
import { ReadinessSkeleton } from "@/features/readiness/components/readiness-skeleton";
import { useCachedData, invalidateCache } from "@/lib/client-cache";
import type { ReadinessComponent, HighImpactAction } from "@/app/api/readiness/route";

interface ReadinessData {
  overallScore: number;
  tier: string;
  targetRole: string;
  components: ReadinessComponent[];
  topFixes: HighImpactAction[];
  lastUpdated: string;
}

export default function PlacementReadinessPage() {
  const { data, loading: isLoading, refresh } = useCachedData<ReadinessData>("/api/readiness");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchReadiness = async (showToast = false) => {
    try {
      if (showToast) setIsRefreshing(true);
      invalidateCache("/api/readiness");
      await refresh();
      if (showToast) {
        toast.success("Readiness scorecard updated with latest metrics!");
      }
    } catch (err: unknown) {
      console.error("Failed to load readiness data:", err);
      toast.error("Unable to load placement readiness score.");
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 space-y-8">
      {/* Top Header & Breadcrumbs */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          Back to Dashboard
        </Link>

        {data?.lastUpdated && (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="size-3.5" />
            Last calculated {new Date(data.lastUpdated).toLocaleDateString()}
          </span>
        )}
      </div>

      {isLoading ? (
        <ReadinessSkeleton />
      ) : !data ? (
        <div className="rounded-2xl border-2 border-dashed border-border p-8 text-center bg-card neo-shadow-sm">
          <p className="text-sm font-medium text-muted-foreground">
            Unable to load readiness data. Please verify your connection.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fetchReadiness(true)}
            className="mt-3 rounded-xl border-2 border-border font-bold neo-shadow-sm"
          >
            Retry
          </Button>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Section Header with Creative Neo-Brutalist Badges */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border-2 border-border bg-card px-3 py-0.5 text-xs font-black text-foreground shadow-xs">
                <span className="size-2 rounded-full bg-[#34A853] animate-ping" />
                <span>Placement Benchmark Metric</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
                Readiness{" "}
                <span className="inline-block bg-[#34A853] text-white px-3 py-0.5 rounded-xl border-2 border-black dark:border-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.7)] rotate-[-1deg] mx-1">
                  Scorecard
                </span>
              </h1>
              <p className="text-sm text-muted-foreground font-medium max-w-xl">
                Live multi-dimensional ranking calculated from your resume, GitHub projects, and mock interview performance.
              </p>
            </div>

            <button
              type="button"
              onClick={() => fetchReadiness(true)}
              disabled={isRefreshing}
              className="inline-flex items-center gap-2 rounded-xl border-2 border-border bg-card px-4 py-2.5 text-xs font-black text-foreground neo-shadow-sm hover:translate-x-0.5 hover:-translate-y-0.5 transition-all shrink-0 cursor-pointer disabled:opacity-50"
            >
              <RotateCw className={`size-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
              <span>Recalculate Score</span>
            </button>
          </div>

          {/* 1. Hero Scorecard Card */}
          <ReadinessHeroCard
            overallScore={data.overallScore}
            tier={data.tier}
            targetRole={data.targetRole}
          />

          {/* 2. Top 5 High-Impact Actions */}
          <HighImpactActionsCard actions={data.topFixes} />

          {/* 3. The 7-Component Weighted Breakdown */}
          <ReadinessBreakdownCard components={data.components} />

          {/* 4. Recruiter Insight "Remember" Callout */}
          <div className="rounded-2xl border-2 border-black dark:border-border bg-neutral-950 p-4 text-white flex items-center gap-3.5 neo-shadow">
            <span className="shrink-0 bg-[#FF4D4D] text-white font-black text-xs px-2.5 py-1 rounded-lg border border-black uppercase tracking-wider shadow-xs">
              Remember
            </span>
            <p className="text-xs sm:text-sm font-medium text-stone-200 leading-snug">
              Crossing the 75/100 threshold elevates your profile into the top placement screening tier, unlocking direct recruiter match recommendations.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
