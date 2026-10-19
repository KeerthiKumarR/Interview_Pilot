"use client";

import React, { useState } from "react";
import {
  Search,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  Globe,
  Briefcase,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface BooleanSearchCardProps {
  booleanQuery: string;
  targetRole: string;
  platformUrls: {
    linkedin: string;
    wellfound: string;
    internshala: string;
    googleJobs: string;
  };
}

export function BooleanSearchCard({
  booleanQuery,
  targetRole,
  platformUrls,
}: BooleanSearchCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!booleanQuery) return;
    navigator.clipboard.writeText(booleanQuery);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const platforms = [
    {
      name: "LinkedIn Jobs",
      url: platformUrls?.linkedin,
      accent: "hover:border-blue-500/50 hover:bg-blue-500/5 text-blue-600 dark:text-blue-400",
    },
    {
      name: "Wellfound (AngelList)",
      url: platformUrls?.wellfound,
      accent: "hover:border-rose-500/50 hover:bg-rose-500/5 text-rose-600 dark:text-rose-400",
    },
    {
      name: "Internshala",
      url: platformUrls?.internshala,
      accent: "hover:border-sky-500/50 hover:bg-sky-500/5 text-sky-600 dark:text-sky-400",
    },
    {
      name: "Google Jobs",
      url: platformUrls?.googleJobs,
      accent: "hover:border-emerald-500/50 hover:bg-emerald-500/5 text-emerald-600 dark:text-emerald-400",
    },
  ];

  return (
    <Card className="border border-border/60 bg-gradient-to-br from-card to-card/60 backdrop-blur-sm shadow-sm overflow-hidden">
      <CardContent className="p-5 sm:p-6 space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Search className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold tracking-tight flex items-center gap-2">
                Automated Boolean Job Search Query
                <span className="inline-flex items-center gap-1 text-[11px] font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  <Sparkles className="h-3 w-3 text-primary" />
                  Tailored for {targetRole}
                </span>
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Use this recruiter-grade Boolean query on job platforms to uncover hidden internship and junior roles.
              </p>
            </div>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={handleCopy}
            className="h-8 gap-1.5 text-xs self-start sm:self-auto shrink-0"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">Copied to Clipboard</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Copy Search Query</span>
              </>
            )}
          </Button>
        </div>

        {/* Code Snippet Box */}
        <div className="relative group">
          <div className="rounded-lg border border-border/80 bg-muted/40 p-3.5 font-mono text-xs text-foreground/90 break-all select-all leading-relaxed">
            {booleanQuery || "Generating search query based on profile skills..."}
          </div>
        </div>

        {/* Quick Launch Buttons */}
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5" />
            Launch 1-Click Boolean Search on Job Platforms
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {platforms.map((p) => (
              <a
                key={p.name}
                href={p.url || "#"}
                target="_blank"
                rel="noreferrer"
                className={`inline-flex items-center justify-between px-3 py-2 rounded-md border border-border/70 bg-card text-xs font-medium transition-all ${p.accent}`}
              >
                <span>{p.name}</span>
                <ExternalLink className="h-3 w-3 opacity-70 ml-1 shrink-0" />
              </a>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
