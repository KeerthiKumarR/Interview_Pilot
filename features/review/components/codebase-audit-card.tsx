"use client";

import React from "react";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Lock,
} from "lucide-react";
import { GithubIcon } from "@/components/icons";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CodebaseCheckResult } from "@/lib/review/full-auditor";

interface CodebaseAuditCardProps {
  data: CodebaseCheckResult;
}

export function CodebaseAuditCard({ data }: CodebaseAuditCardProps) {
  return (
    <Card className="shadow-xs border-border">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="size-4 text-emerald-500" />
              Codebase Hygiene & Secrets Scan
            </CardTitle>
            <CardDescription>
              Inspection of repository structures, committed credential safety, and hygiene.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="text-right">
              <span className="text-xl font-bold tracking-tight">
                {data.score}
              </span>
              <span className="text-xs text-muted-foreground">/100</span>
            </div>
            <Badge
              variant={data.score >= 80 ? "success" : "secondary"}
              className="text-xs py-0.5"
            >
              {data.score >= 80 ? "Clean Repos" : "Attention"}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Pass / Fail Checks */}
        <div className="space-y-2.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Security & Hygiene Checks
          </span>

          <div className="grid grid-cols-1 gap-2.5">
            {data.checks.map((item) => (
              <div
                key={item.id}
                className={`flex items-start gap-3 rounded-lg border p-3 ${
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

                <div className="flex-1 space-y-0.5 text-left">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">
                      {item.name}
                    </span>
                    {item.passed && (
                      <Badge variant="success" className="text-[10px] py-0 h-4">
                        Passed
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {item.message}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Scanned Repositories List */}
        {data.scannedRepos && data.scannedRepos.length > 0 && (
          <div className="space-y-2.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <GithubIcon className="size-3.5" />
              Scanned Project Repositories ({data.scannedRepos.length})
            </span>

            <div className="grid grid-cols-1 gap-2">
              {data.scannedRepos.map((repo, idx) => (
                <div
                  key={idx}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border border-border bg-card p-3"
                >
                  <div className="flex items-center gap-2.5">
                    <GithubIcon className="size-4 text-muted-foreground shrink-0" />
                    <span className="text-xs font-medium text-foreground truncate max-w-[200px] sm:max-w-xs">
                      {repo.name}
                    </span>
                    <a
                      href={repo.repoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-muted-foreground hover:text-primary transition-colors"
                    >
                      <ExternalLink className="size-3" />
                    </a>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant="success" className="gap-1 text-[11px] py-0">
                      <Lock className="size-2.5" />
                      Secrets Clean
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
