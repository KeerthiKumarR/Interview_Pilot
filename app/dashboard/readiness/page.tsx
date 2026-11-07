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
        <div className="rounded-xl border border-dashed border-border p-8 text-center bg-card/30">
          <p className="text-sm text-muted-foreground">
            Unable to load readiness data. Please verify your connection.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fetchReadiness(true)}
            className="mt-3"
          >
            Retry
          </Button>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">
                  Placement Readiness Scorecard
                </h1>
                <span className="inline-flex items-center gap-1 rounded-md border border-primary/20 bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                  <Sparkles className="size-3" />
                  Campus Benchmark
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Live multi-dimensional ranking calculated from your resume, GitHub projects, and mock interview performance.
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fetchReadiness(true)}
              disabled={isRefreshing}
              className="gap-2 shrink-0 self-start sm:self-auto cursor-pointer"
            >
              <RotateCw className={`size-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
              Recalculate Score
            </Button>
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
        </div>
      )}
    </div>
  );
}
