"use client";

import React from "react";
import Link from "next/link";
import {
  FileText,
  FolderGit2,
  Bot,
  Code2,
  Trophy,
  ExternalLink,
  Layers,
  Sparkles,
} from "lucide-react";
import { GithubIcon, LinkedinIcon } from "@/components/icons";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ReadinessComponent } from "@/app/api/readiness/route";

interface ReadinessBreakdownCardProps {
  components: ReadinessComponent[];
}

export function ReadinessBreakdownCard({
  components,
}: ReadinessBreakdownCardProps) {
  const getComponentIcon = (id: string) => {
    switch (id) {
      case "resume":
        return FileText;
      case "projects":
        return FolderGit2;
      case "interview":
        return Bot;
      case "github":
        return GithubIcon;
      case "leetcode":
        return Code2;
      case "linkedin":
        return LinkedinIcon;
      case "achievements":
        return Trophy;
      default:
        return Layers;
    }
  };

  const getProgressBarColor = (score: number) => {
    if (score >= 80) return "bg-emerald-500";
    if (score >= 60) return "bg-amber-500";
    if (score > 0) return "bg-rose-500";
    return "bg-muted-foreground/30";
  };

  const getStatusBadge = (status: ReadinessComponent["status"], score: number) => {
    if (score >= 80)
      return <Badge variant="success" className="text-[10px] py-0 h-4">Optimal</Badge>;
    if (score >= 60)
      return <Badge variant="secondary" className="text-[10px] py-0 h-4">Good</Badge>;
    if (score > 0)
      return <Badge variant="destructive" className="text-[10px] py-0 h-4">Needs Work</Badge>;
    return <Badge variant="outline" className="text-[10px] py-0 h-4 text-muted-foreground">Not Started</Badge>;
  };

  return (
    <Card className="border-border shadow-xs">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-base flex items-center gap-2">
              <Layers className="size-4 text-primary" />
              7-Dimensional Preparation Breakdown
            </CardTitle>
            <CardDescription>
              Every domain is mathematically weighted to mirror real campus placement rubrics.
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-xs py-1 self-start sm:self-center gap-1">
            <Sparkles className="size-3 text-amber-500" />
            100% Total Weight
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="grid grid-cols-1 gap-4">
          {components.map((item) => {
            const Icon = getComponentIcon(item.id);
            const progressColor = getProgressBarColor(item.score);

            return (
              <div
                key={item.id}
                className="rounded-xl border border-border/70 bg-card p-4 space-y-3 transition-colors hover:border-foreground/20 shadow-xs"
              >
                {/* Header: Title, Icon, Weight Badge, Score */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="flex size-8 items-center justify-center rounded-lg bg-muted/60 text-foreground shrink-0">
                      <Icon className="size-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-semibold text-foreground">
                          {item.name}
                        </span>
                        {getStatusBadge(item.status, item.score)}
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-snug">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  {/* Score & Weight */}
                  <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                    <span className="inline-flex items-center text-[11px] font-semibold text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-md border border-border/50">
                      {item.weight}% Weight
                    </span>
                    <div className="text-right min-w-16">
                      <span className="text-sm font-bold text-foreground">
                        {item.score}
                      </span>
                      <span className="text-xs text-muted-foreground">/100</span>
                      <span className="block text-[10px] text-muted-foreground">
                        ({item.weightedContribution} pts)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1">
                  <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted/60">
                    <div
                      className={`h-full transition-all duration-500 rounded-full ${progressColor}`}
                      style={{ width: `${Math.max(item.score, 4)}%` }}
                    />
                  </div>
                </div>

                {/* Footer: Action Link */}
                <div className="flex items-center justify-end pt-1">
                  <Link
                    href={item.targetTab}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline transition-colors"
                  >
                    <span>Improve Score in Tab</span>
                    <ExternalLink className="size-3" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
