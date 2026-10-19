"use client";

import React, { useEffect, useState } from "react";
import {
  Loader2,
  CheckCircle2,
  Circle,
  FileText,
  ShieldCheck,
  Globe,
  Sparkles,
} from "lucide-react";

interface ReviewProgressModalProps {
  isOpen: boolean;
  onComplete?: () => void;
}

const AUDIT_STEPS = [
  {
    step: 1,
    title: "Auditing Resume against ATS & 1-page rule",
    description: "Scanning page constraints, action verbs, and quantifiable impact metrics.",
    icon: FileText,
  },
  {
    step: 2,
    title: "Inspecting GitHub repos & scanning for committed secrets",
    description: "Analyzing repository cleanliness and checking for exposed credentials or .env files.",
    icon: ShieldCheck,
  },
  {
    step: 3,
    title: "Pinging live project demo links",
    description: "Verifying HTTP response statuses, SSL certificates, and latency response times.",
    icon: Globe,
  },
  {
    step: 4,
    title: "Generating actionable LinkedIn & resume rewrites",
    description: "Synthesizing high-impact Google XYZ formula bullets and recruiter-optimized headlines.",
    icon: Sparkles,
  },
];

function InnerProgressModal() {
  const [activeStep, setActiveStep] = useState(1);

  useEffect(() => {
    const timer1 = setTimeout(() => setActiveStep(2), 1800);
    const timer2 = setTimeout(() => setActiveStep(3), 3600);
    const timer3 = setTimeout(() => setActiveStep(4), 5400);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-6">
        {/* Header */}
        <div className="space-y-1.5 text-center sm:text-left">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary mb-1">
            <Sparkles className="size-3.5" />
            Live Audit in Progress
          </div>
          <h3 className="text-xl font-bold tracking-tight">
            Running Full Placement Audit
          </h3>
          <p className="text-xs text-muted-foreground">
            Our automated multi-agent auditor is evaluating your application materials
            against tech industry hiring rubrics.
          </p>
        </div>

        {/* Steps List */}
        <div className="space-y-3 pt-2">
          {AUDIT_STEPS.map((item) => {
            const isFinished = activeStep > item.step;
            const isCurrent = activeStep === item.step;
            const Icon = item.icon;

            return (
              <div
                key={item.step}
                className={`flex items-start gap-3.5 rounded-xl border p-3.5 transition-all ${
                  isCurrent
                    ? "border-primary/50 bg-primary/5 shadow-xs"
                    : isFinished
                    ? "border-border/60 bg-muted/20"
                    : "border-border/40 opacity-50"
                }`}
              >
                {/* Status Indicator */}
                <div className="mt-0.5 shrink-0">
                  {isFinished ? (
                    <CheckCircle2 className="size-5 text-emerald-500" />
                  ) : isCurrent ? (
                    <Loader2 className="size-5 animate-spin text-primary" />
                  ) : (
                    <Circle className="size-5 text-muted-foreground" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 space-y-0.5 text-left">
                  <div className="flex items-center gap-2">
                    <Icon className="size-3.5 text-muted-foreground" />
                    <span
                      className={`text-xs font-semibold ${
                        isCurrent
                          ? "text-primary font-bold"
                          : isFinished
                          ? "text-foreground"
                          : "text-muted-foreground"
                      }`}
                    >
                      Step {item.step}: {item.title}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Status Tip */}
        <div className="rounded-lg bg-muted/40 p-3 text-center border border-border/40">
          <p className="text-xs text-muted-foreground">
            Please wait while the checks complete. Results will automatically appear.
          </p>
        </div>
      </div>
    </div>
  );
}

export function ReviewProgressModal({ isOpen }: ReviewProgressModalProps) {
  if (!isOpen) return null;
  return <InnerProgressModal />;
}
