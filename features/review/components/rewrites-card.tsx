"use client";

import React, { useState } from "react";
import {
  Sparkles,
  Copy,
  Check,
  ArrowRight,
  FileText,
} from "lucide-react";
import { LinkedinIcon } from "@/components/icons";
import { toast } from "sonner";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LinkedinCheckResult } from "@/lib/review/full-auditor";

interface RewritesCardProps {
  resumeRewrites: Array<{
    original: string;
    rewrite: string;
    reason: string;
  }>;
  linkedinData: LinkedinCheckResult;
}

export function RewritesCard({
  resumeRewrites,
  linkedinData,
}: RewritesCardProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = async (text: string, id: string, label: string) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for non-secure contexts
        const textarea = document.createElement("textarea");
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }

      setCopiedId(id);
      toast.success(`Copied ${label} to clipboard!`);
      setTimeout(() => {
        setCopiedId((prev) => (prev === id ? null : prev));
      }, 2000);
    } catch {
      toast.error("Failed to copy to clipboard.");
    }
  };

  return (
    <Card className="shadow-xs border-border">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="size-4 text-amber-500" />
              Actionable AI Rewrites (Ready to Paste)
            </CardTitle>
            <CardDescription>
              High-impact bullet points and recruiter-optimized LinkedIn profiles using the Google XYZ formula.
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-xs py-0.5 self-start sm:self-center">
            One-Click Copy
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-8">
        {/* Section 1: Resume Bullet Rewrites */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <FileText className="size-4 text-primary" />
            <h4 className="text-sm font-semibold text-foreground">
              High-Impact Resume Bullets
            </h4>
          </div>

          {resumeRewrites.length === 0 ? (
            <p className="text-xs text-muted-foreground p-3 border rounded-lg bg-card">
              No weak bullet points detected. Your resume bullets currently meet impact thresholds.
            </p>
          ) : (
            <div className="space-y-4">
              {resumeRewrites.map((item, idx) => {
                const id = `resume_${idx}`;
                const isCopied = copiedId === id;

                return (
                  <div
                    key={idx}
                    className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-xs"
                  >
                    {/* Before & After comparison */}
                    <div className="space-y-2">
                      <div className="space-y-1">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Original Weak Bullet
                        </span>
                        <div className="rounded-lg bg-muted/40 p-2.5 text-xs text-muted-foreground italic border border-border/40">
                          &ldquo;{item.original}&rdquo;
                        </div>
                      </div>

                      <div className="flex items-center justify-center py-0.5 text-muted-foreground">
                        <ArrowRight className="size-3.5 rotate-90 sm:rotate-0" />
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                            Recommended XYZ Rewrite
                          </span>
                          <Button
                            type="button"
                            variant="outline"
                            size="xs"
                            onClick={() =>
                              copyToClipboard(item.rewrite, id, "bullet rewrite")
                            }
                            className="gap-1 text-xs"
                          >
                            {isCopied ? (
                              <>
                                <Check className="size-3 text-emerald-500" />
                                Copied
                              </>
                            ) : (
                              <>
                                <Copy className="size-3" />
                                Copy
                              </>
                            )}
                          </Button>
                        </div>
                        <div className="rounded-lg bg-emerald-500/10 dark:bg-emerald-500/15 p-3 text-xs font-medium text-foreground border border-emerald-500/20 leading-relaxed">
                          {item.rewrite}
                        </div>
                      </div>
                    </div>

                    {/* Rationale */}
                    <p className="text-[11px] text-muted-foreground pt-1">
                      <span className="font-semibold text-foreground">Why: </span>
                      {item.reason}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Section 2: LinkedIn Headline & About */}
        <div className="space-y-4 pt-2 border-t border-border">
          <div className="flex items-center gap-2">
            <LinkedinIcon className="size-4 text-blue-500" />
            <h4 className="text-sm font-semibold text-foreground">
              Recruiter-Optimized LinkedIn Profile
            </h4>
          </div>

          <div className="space-y-4">
            {/* Headline */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">
                  Suggested Headline
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={() =>
                    copyToClipboard(
                      linkedinData.suggestedHeadline,
                      "linkedin_headline",
                      "headline"
                    )
                  }
                  className="gap-1 text-xs"
                >
                  {copiedId === "linkedin_headline" ? (
                    <>
                      <Check className="size-3 text-emerald-500" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="size-3" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
              <div className="rounded-lg bg-muted/30 p-2.5 text-xs text-foreground font-medium border border-border/50">
                {linkedinData.suggestedHeadline}
              </div>
            </div>

            {/* About / Summary */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">
                  Suggested Bio / About Section
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={() =>
                    copyToClipboard(
                      linkedinData.suggestedAbout,
                      "linkedin_about",
                      "about bio"
                    )
                  }
                  className="gap-1 text-xs"
                >
                  {copiedId === "linkedin_about" ? (
                    <>
                      <Check className="size-3 text-emerald-500" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="size-3" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
              <div className="rounded-lg bg-muted/30 p-3 text-xs text-foreground leading-relaxed border border-border/50 whitespace-pre-line">
                {linkedinData.suggestedAbout}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
