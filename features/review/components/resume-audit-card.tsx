"use client";

import React from "react";
import {
  FileText,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Lightbulb,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ResumeAuditResult } from "@/lib/review/resume-auditor";

interface ResumeAuditCardProps {
  data: ResumeAuditResult;
}

export function ResumeAuditCard({ data }: ResumeAuditCardProps) {
  const getScoreBadge = (score: number) => {
    if (score >= 80)
      return { variant: "success" as const, label: "Placement Ready" };
    if (score >= 60)
      return { variant: "secondary" as const, label: "Needs Minor Polish" };
    return { variant: "destructive" as const, label: "Action Required" };
  };

  const badge = getScoreBadge(data.score);

  return (
    <Card className="shadow-xs border-border">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="size-4 text-primary" />
              Resume & ATS Benchmark Audit
            </CardTitle>
            <CardDescription>
              Evaluated against 1-page constraints, quantifiable metrics, and ATS headings.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="text-right">
              <span className="text-xl font-bold tracking-tight">
                {data.score}
              </span>
              <span className="text-xs text-muted-foreground">/100</span>
            </div>
            <Badge variant={badge.variant} className="text-xs py-0.5">
              {badge.label}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Pass / Fail Checklist */}
        <div className="space-y-2.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Audit Checklist ({data.checks.filter((c) => c.passed).length}/{data.checks.length} Passed)
          </span>

          <div className="grid grid-cols-1 gap-2.5">
            {data.checks.map((item) => (
              <div
                key={item.id}
                className={`flex items-start gap-3 rounded-lg border p-3 transition-colors ${
                  item.passed
                    ? "border-border/60 bg-muted/10"
                    : "border-destructive/20 bg-destructive/5"
                }`}
              >
                <div className="mt-0.5 shrink-0">
                  {item.passed ? (
                    <CheckCircle2 className="size-4 text-emerald-500" />
                  ) : (
                    <XCircle className="size-4 text-destructive" />
                  )}
                </div>

                <div className="flex-1 space-y-1 text-left">
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-semibold ${
                        item.passed ? "text-foreground" : "text-destructive"
                      }`}
                    >
                      {item.name}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {item.score} pts
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {item.message}
                  </p>
                  {item.fix && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 font-medium pt-0.5 flex items-center gap-1">
                      <AlertCircle className="size-3 shrink-0" />
                      Fix: {item.fix}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actionable Fixes */}
        {data.actionableFixes && data.actionableFixes.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-4 space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <Lightbulb className="size-4 text-amber-500" />
              Priority Fixes to Boost ATS Ranking
            </div>
            <ul className="space-y-1.5 text-xs text-muted-foreground pl-1">
              {data.actionableFixes.map((fix, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-primary font-bold">•</span>
                  <span>{fix}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
