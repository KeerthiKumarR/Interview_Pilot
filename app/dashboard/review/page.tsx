"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Sparkles,
  RotateCw,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ReviewProgressModal } from "@/features/review/components/review-progress-modal";
import { ResumeAuditCard } from "@/features/review/components/resume-audit-card";
import { CodebaseAuditCard } from "@/features/review/components/codebase-audit-card";
import { LiveLinksCard } from "@/features/review/components/live-links-card";
import { RewritesCard } from "@/features/review/components/rewrites-card";
import { ReviewSkeleton } from "@/features/review/components/review-skeleton";
import { EmptyReviewState } from "@/features/review/components/empty-review-state";
import { ResumeAuditResult } from "@/lib/review/resume-auditor";
import {
  CodebaseCheckResult,
  LiveLinkCheckResult,
  LinkedinCheckResult,
} from "@/lib/review/full-auditor";

interface ReviewData {
  id: string;
  profileId: string;
  resumeCheck: ResumeAuditResult | null;
  codebaseCheck: CodebaseCheckResult | null;
  liveLinkCheck: LiveLinkCheckResult | null;
  linkedinCheck: LinkedinCheckResult | null;
  overallReview: string | null;
  createdAt: string;
}

interface ReadinessScoreData {
  overallScore: number;
  tier: string;
  resumeScore: number;
  projectsScore: number;
  githubScore: number;
  linkedinScore: number;
  topFixes?: string[];
}

export default function ReviewHubPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isRunningReview, setIsRunningReview] = useState(false);
  const [review, setReview] = useState<ReviewData | null>(null);
  const [readinessScore, setReadinessScore] = useState<ReadinessScoreData | null>(null);
  const [resumeFileName, setResumeFileName] = useState<string | null>(null);
  const [targetRole, setTargetRole] = useState<string>("Full Stack Developer");

  // 1. Fetch existing audit results on mount
  useEffect(() => {
    let ignore = false;
    async function loadResults() {
      try {
        const res = await fetch("/api/review");
        if (!res.ok) {
          if (res.status === 401) {
            toast.error("Please sign in to access your Review Hub.");
          }
          return;
        }
        const data = await res.json();
        if (!ignore) {
          setReview(data.review);
          setReadinessScore(data.readinessScore);
          if (data.resumeFileName) setResumeFileName(data.resumeFileName);
          if (data.targetRole) setTargetRole(data.targetRole);
        }
      } catch (err: unknown) {
        if (!ignore) {
          console.error("Failed to load review results:", err);
          toast.error("Unable to load latest audit results.");
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    loadResults();
    return () => {
      ignore = true;
    };
  }, []);

  // 2. Trigger Full Placement Review
  const handleRunFullReview = async () => {
    setIsRunningReview(true);

    try {
      const res = await fetch("/api/review/run", {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to complete placement audit.");
      }

      setReview(data.review);
      setReadinessScore(data.readinessScore);
      toast.success(
        `Review complete! Overall Placement Readiness: ${data.readinessScore?.overallScore || 0}/100.`
      );
    } catch (err: unknown) {
      console.error("Audit runner error:", err);
      const msg = err instanceof Error ? err.message : "Failed to run review.";
      toast.error(msg);
    } finally {
      setIsRunningReview(false);
    }
  };

  const score = readinessScore?.overallScore ?? 0;
  const tier = readinessScore?.tier ?? "Not ready";

  const getTierColor = (t: string) => {
    if (t.toLowerCase().includes("placement"))
      return "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
    if (t.toLowerCase().includes("almost"))
      return "text-amber-500 bg-amber-500/10 border-amber-500/20";
    return "text-rose-500 bg-rose-500/10 border-rose-500/20";
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 space-y-8">
      {/* Real-time Progress Modal during Audit execution */}
      <ReviewProgressModal isOpen={isRunningReview} />

      {/* Top Header & Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          Back to Dashboard
        </Link>

        {review && (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="size-3.5" />
            Audited {new Date(review.createdAt).toLocaleDateString()} at{" "}
            {new Date(review.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        )}
      </div>

      {isLoading ? (
        <ReviewSkeleton />
      ) : !review ? (
        <EmptyReviewState
          onRunReview={handleRunFullReview}
          isStarting={isRunningReview}
          hasResume={!!resumeFileName}
        />
      ) : (
        <div className="space-y-8">
          {/* Main Hub Title & Re-run CTA */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">
                  Placement Review Hub
                </h1>
                <Badge variant="outline" className="gap-1 text-xs py-0.5">
                  <Sparkles className="size-3 text-amber-500" />
                  {targetRole}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Deep multi-agent inspection of your resume, GitHub hygiene, live deployment links, and bio rewrites.
              </p>
            </div>

            <Button
              type="button"
              onClick={handleRunFullReview}
              disabled={isRunningReview}
              className="gap-2 shrink-0 self-start sm:self-auto cursor-pointer"
            >
              <RotateCw
                className={`size-4 ${isRunningReview ? "animate-spin" : ""}`}
              />
              Run Full Review
            </Button>
          </div>

          {/* Overall Readiness Scorecard */}
          <Card className="border-border shadow-xs bg-gradient-to-br from-card to-muted/20">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                  {/* Circular Score display */}
                  <div className="flex size-20 shrink-0 flex-col items-center justify-center rounded-2xl border border-border bg-background shadow-xs">
                    <span className="text-2xl font-black tracking-tight">
                      {score}
                    </span>
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground">
                      Readiness
                    </span>
                  </div>

                  <div className="space-y-1 text-left">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-foreground">
                        Campus Placement Status:
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold ${getTierColor(
                          tier
                        )}`}
                      >
                        {score >= 75 ? (
                          <CheckCircle2 className="size-3" />
                        ) : (
                          <AlertTriangle className="size-3" />
                        )}
                        {tier}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground max-w-xl leading-relaxed">
                      {review.overallReview ||
                        "Review completed across all 4 key dimensions."}
                    </p>
                  </div>
                </div>

                {/* Sub-score Pills */}
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-2 gap-2 text-center text-xs">
                  <div className="rounded-lg border border-border bg-card p-2">
                    <div className="text-[10px] text-muted-foreground">Resume ATS</div>
                    <div className="font-bold text-sm">
                      {readinessScore?.resumeScore ?? review.resumeCheck?.score ?? 0}%
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-2">
                    <div className="text-[10px] text-muted-foreground">Repo Security</div>
                    <div className="font-bold text-sm">
                      {readinessScore?.githubScore ?? review.codebaseCheck?.score ?? 0}%
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-2">
                    <div className="text-[10px] text-muted-foreground">Live Demos</div>
                    <div className="font-bold text-sm">
                      {readinessScore?.projectsScore ?? review.liveLinkCheck?.score ?? 0}%
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-2">
                    <div className="text-[10px] text-muted-foreground">LinkedIn Bio</div>
                    <div className="font-bold text-sm">
                      {readinessScore?.linkedinScore ?? review.linkedinCheck?.score ?? 0}%
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Audit Sections Grid */}
          <div className="grid grid-cols-1 gap-6">
            {/* Step 1: Resume & ATS Check */}
            {review.resumeCheck && (
              <ResumeAuditCard data={review.resumeCheck} />
            )}

            {/* Step 2: Codebase & Secrets Scan */}
            {review.codebaseCheck && (
              <CodebaseAuditCard data={review.codebaseCheck} />
            )}

            {/* Step 3: Live Demo Pings */}
            {review.liveLinkCheck && (
              <LiveLinksCard data={review.liveLinkCheck} />
            )}

            {/* Step 4: Ready-To-Paste Rewrites */}
            {review.linkedinCheck && (
              <RewritesCard
                resumeRewrites={review.resumeCheck?.rewrites || []}
                linkedinData={review.linkedinCheck}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
