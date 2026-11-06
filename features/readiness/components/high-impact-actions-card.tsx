"use client";

import React from "react";
import Link from "next/link";
import {
  Zap,
  ArrowRight,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { HighImpactAction } from "@/app/api/readiness/route";

interface HighImpactActionsCardProps {
  actions: HighImpactAction[];
}

export function HighImpactActionsCard({
  actions,
}: HighImpactActionsCardProps) {
  if (actions.length === 0) {
    return (
      <Card className="border-border shadow-xs">
        <CardContent className="p-6 text-center space-y-2">
          <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
            <CheckCircle2 className="size-5" />
          </div>
          <h4 className="text-sm font-bold text-foreground">
            No Critical Gaps Remaining!
          </h4>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            All 7 components currently meet or exceed campus placement targets. Keep your edge by practicing with weekly mock interviews.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="rounded-3xl border-2 border-border bg-card p-6 neo-shadow space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b-2 border-border/80">
        <div className="space-y-1">
          <h3 className="text-base font-black flex items-center gap-2 text-foreground">
            <Zap className="size-4 text-amber-500" />
            Top 5 High-Impact Actions
          </h3>
          <p className="text-xs text-muted-foreground font-medium">
            Prioritized to-do list that yields the highest score gain per minute of effort.
          </p>
        </div>
        <span className="inline-flex items-center gap-1 text-xs font-bold text-muted-foreground bg-secondary px-2.5 py-1 rounded-lg border border-border self-start sm:self-center">
          <Sparkles className="size-3 text-primary" />
          Ranked by Score Lift
        </span>
      </div>

      <div className="space-y-3">
        {actions.map((act, idx) => (
          <div
            key={act.id}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 rounded-2xl border-2 border-border bg-card p-4 neo-shadow-sm hover:translate-x-0.5 hover:-translate-y-0.5 transition-all"
          >
            {/* Left: Rank, Title, Description */}
            <div className="flex items-start gap-3">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-xl border-2 border-border bg-secondary font-mono text-xs font-black text-foreground mt-0.5">
                {idx + 1}
              </span>

              <div className="space-y-1 text-left">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-xs sm:text-sm font-black text-foreground">
                    {act.title}
                  </h4>
                  {act.potentialPoints > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[11px] font-black text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                      <Zap className="size-2.5" />
                      +{act.potentialPoints} pts
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                  {act.description}
                </p>
              </div>
            </div>

            {/* Right: Clickable direct action button */}
            <Link
              href={act.href}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-black text-primary-foreground border-2 border-primary/80 neo-shadow-sm hover:translate-x-0.5 hover:-translate-y-0.5 transition-all shrink-0 self-start sm:self-center"
            >
              <span>{act.actionText}</span>
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
