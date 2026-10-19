"use client";

import React from "react";
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Briefcase,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ReadinessHeroCardProps {
  overallScore: number;
  tier: string;
  targetRole: string;
}

export function ReadinessHeroCard({
  overallScore,
  tier,
  targetRole,
}: ReadinessHeroCardProps) {
  const getTierDetails = (t: string, score: number) => {
    if (score >= 75) {
      return {
        badgeVariant: "success" as const,
        badgeClass:
          "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
        icon: CheckCircle2,
        title: "Placement Ready",
        summary:
          "You meet the gold-standard criteria for tech campus placements and engineering screener rounds. Maintain interview agility by running regular mocks.",
      };
    }
    if (score >= 50) {
      return {
        badgeVariant: "secondary" as const,
        badgeClass:
          "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20",
        icon: AlertTriangle,
        title: "Almost Ready",
        summary:
          "Solid foundation across multiple areas. Focus on the high-impact fixes below (especially deploying live project demos and running a mock interview) to cross the 75+ benchmark.",
      };
    }
    return {
      badgeVariant: "destructive" as const,
      badgeClass:
        "text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20",
      icon: AlertCircle,
      title: "Preparation Required",
      summary:
        "Key portfolio components are currently incomplete. Complete your profile intake, deploy at least one live project, and practice with our AI interviewer to quickly boost your score.",
    };
  };

  const details = getTierDetails(tier, overallScore);
  const StatusIcon = details.icon;

  return (
    <Card className="border-border shadow-xs bg-gradient-to-br from-card via-card to-muted/20 overflow-hidden relative">
      <CardContent className="p-6 sm:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* Left: Overall Score + Narrative */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-6">
            {/* Score Ring / Badge */}
            <div className="relative flex size-24 sm:size-28 shrink-0 flex-col items-center justify-center rounded-3xl border-2 border-border/80 bg-background shadow-md">
              <span className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
                {overallScore}
              </span>
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-muted-foreground mt-0.5">
                / 100
              </span>
              <div className="absolute -top-2 -right-2 rounded-full bg-primary/10 border border-primary/20 p-1 text-primary">
                <Sparkles className="size-3.5" />
              </div>
            </div>

            {/* Information */}
            <div className="space-y-2 text-left">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold ${details.badgeClass}`}
                >
                  <StatusIcon className="size-3.5" />
                  {details.title}
                </span>

                <Badge variant="outline" className="gap-1.5 text-xs py-1">
                  <Briefcase className="size-3 text-primary" />
                  {targetRole}
                </Badge>
              </div>

              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                Campus Placement Readiness Scorecard
              </h2>

              <p className="text-xs sm:text-sm text-muted-foreground max-w-xl leading-relaxed">
                {details.summary}
              </p>
            </div>
          </div>

          {/* Right: Quick Stats Callout */}
          <div className="flex flex-col sm:flex-row md:flex-col gap-2 shrink-0 border-t md:border-t-0 md:border-l border-border/60 pt-4 md:pt-0 md:pl-6">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <TrendingUp className="size-4 text-primary" />
              <span>Placement Benchmark:</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold text-foreground">75+ / 100</span>
              <span className="text-xs text-muted-foreground">Top Quartile</span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Based on hiring standards from top tech firms and placement cells.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
