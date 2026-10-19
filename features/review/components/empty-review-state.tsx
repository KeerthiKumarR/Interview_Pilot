"use client";

import React from "react";
import Link from "next/link";
import {
  Sparkles,
  Play,
  FileCheck2,
  ShieldCheck,
  Globe,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyReviewStateProps {
  onRunReview: () => void;
  isStarting: boolean;
  hasResume: boolean;
}

export function EmptyReviewState({
  onRunReview,
  isStarting,
  hasResume,
}: EmptyReviewStateProps) {
  return (
    <div className="rounded-2xl border border-dashed border-border p-8 sm:p-12 text-center bg-card/40 space-y-8">
      <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Sparkles className="size-7" />
      </div>

      <div className="space-y-2 max-w-xl mx-auto">
        <h3 className="text-xl font-bold tracking-tight">
          No Placement Review Run Yet
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Run your first automated evaluation across all 4 key dimensions: ATS resume formatting, GitHub repository secrets & hygiene, live project deployment status, and high-converting rewrites.
        </p>
      </div>

      {/* 4 Steps preview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl mx-auto text-left">
        <div className="rounded-xl border border-border bg-card p-3.5 space-y-1">
          <FileCheck2 className="size-4 text-primary" />
          <p className="text-xs font-semibold">1-Page ATS Audit</p>
          <p className="text-[11px] text-muted-foreground">
            Quantified metrics, Google XYZ power verbs, clean section headers.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-3.5 space-y-1">
          <ShieldCheck className="size-4 text-emerald-500" />
          <p className="text-xs font-semibold">Repo & Secrets Scan</p>
          <p className="text-[11px] text-muted-foreground">
            Finds leaked .env files, private keys, and verifies repo README quality.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-3.5 space-y-1">
          <Globe className="size-4 text-blue-500" />
          <p className="text-xs font-semibold">Live Demo Pings</p>
          <p className="text-[11px] text-muted-foreground">
            Checks uptime, latency response times, and HTTPS certificates.
          </p>
        </div>
      </div>

      {/* CTA action buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
        {!hasResume && (
          <Link
            href="/dashboard/profile-intake"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border px-3 py-2 rounded-lg transition-colors"
          >
            Upload Resume First
            <ArrowRight className="size-3.5" />
          </Link>
        )}

        <Button
          type="button"
          size="lg"
          onClick={onRunReview}
          disabled={isStarting}
          className="gap-2 text-sm font-semibold cursor-pointer"
        >
          <Play className="size-4" />
          Run Full Review Now
        </Button>
      </div>
    </div>
  );
}
