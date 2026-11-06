"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Briefcase,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  Building2,
  MapPin,
  Laptop,
  GraduationCap,
  Bookmark,
  Search,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export interface MatchedJob {
  id: string;
  title: string;
  company: string;
  description: string;
  location: string;
  isRemote: boolean;
  jobType: string;
  applyUrl: string;
  requiredSkills: string[];
  minReadinessScore: number;
  isMSOTInternal: boolean;
  stipendOrSalary?: string | null;
  fitPercentage: number;
  matchedSkills: string[];
  missingSkills: string[];
  isEligible: boolean;
  matchReason: string;
  applicationStatus: string;
}

interface MatchedJobsSectionProps {
  interviewId: string;
  overallScore: number;
  targetRole?: string;
}

export function MatchedJobsSection({
  interviewId,
  overallScore,
  targetRole,
}: MatchedJobsSectionProps) {
  const [jobs, setJobs] = useState<MatchedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [platformUrls, setPlatformUrls] = useState<any>(null);
  const [booleanQuery, setBooleanQuery] = useState("");
  const [appliedJobs, setAppliedJobs] = useState<Record<string, string>>({});

  useEffect(() => {
    let isMounted = true;
    async function fetchMatchedJobs() {
      try {
        setLoading(true);
        const res = await fetch(`/api/interviews/${interviewId}/matched-jobs`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setJobs(data.jobs || []);
            setPlatformUrls(data.platformUrls);
            setBooleanQuery(data.booleanQuery);

            const initialStatuses: Record<string, string> = {};
            (data.jobs || []).forEach((j: MatchedJob) => {
              if (j.applicationStatus && j.applicationStatus !== "None") {
                initialStatuses[j.id] = j.applicationStatus;
              }
            });
            setAppliedJobs(initialStatuses);
          }
        }
      } catch (err) {
        console.error("Failed to load matched jobs for interview:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    if (interviewId) {
      fetchMatchedJobs();
    }

    return () => {
      isMounted = false;
    };
  }, [interviewId]);

  const handleUpdateStatus = async (jobId: string, status: string) => {
    try {
      const res = await fetch("/api/jobs/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, status }),
      });

      if (res.ok) {
        setAppliedJobs((prev) => ({ ...prev, [jobId]: status }));
        toast.success(
          status === "Applied"
            ? "Marked as Applied! Tracked on your Dashboard."
            : "Job saved to your Application Tracker."
        );
      } else {
        toast.error("Failed to update application status.");
      }
    } catch (err) {
      toast.error("Network error updating application status.");
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 space-y-4 animate-pulse">
        <div className="h-4 w-48 bg-muted rounded"></div>
        <div className="h-6 w-72 bg-muted rounded"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="h-44 bg-muted/40 rounded-lg"></div>
          <div className="h-44 bg-muted/40 rounded-lg"></div>
        </div>
      </div>
    );
  }

  if (jobs.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-6 shadow-sm">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Live Profile & Viva Match
            </span>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-secondary text-muted-foreground">
              {jobs.length} Matching Openings
            </span>
          </div>
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-primary" />
            Recommended Jobs Matching Your Profile & Viva Score
          </h2>
          <p className="text-xs text-muted-foreground">
            Calculated from your verified resume skills, target role (
            <strong className="text-foreground">{targetRole || "Software Engineer"}</strong>),
            and viva score (
            <strong className="text-foreground">{overallScore}/100</strong>).
          </p>
        </div>

        <Link
          href="/dashboard/jobs"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline self-start sm:self-auto shrink-0"
        >
          <span>View All &amp; Application Tracker</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Top Matching Jobs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {jobs.map((job) => {
          const currentStatus = appliedJobs[job.id] || "None";
          const isHighMatch = job.fitPercentage >= 75;

          return (
            <Card
              key={job.id}
              className={`border transition-all overflow-hidden flex flex-col justify-between ${
                job.isMSOTInternal
                  ? "border-primary/40 bg-card/95 shadow-sm ring-1 ring-primary/20"
                  : "border-border bg-secondary/10 hover:border-primary/30"
              }`}
            >
              <CardContent className="p-4 space-y-3.5 flex-1 flex flex-col justify-between">
                <div>
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                        {job.company}
                      </span>
                      {job.isMSOTInternal && (
                        <Badge
                          variant="secondary"
                          className="bg-primary/10 text-primary border-primary/20 text-[10px] font-semibold py-0"
                        >
                          <GraduationCap className="w-3 h-3 mr-1" />
                          Campus Drive
                        </Badge>
                      )}
                    </div>

                    <Badge
                      className={`text-[10px] font-bold px-2 py-0.5 border ${
                        isHighMatch
                          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                          : "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30"
                      }`}
                    >
                      {job.fitPercentage}% Match
                    </Badge>
                  </div>

                  {/* Title & Metadata */}
                  <h3 className="text-sm font-bold text-foreground line-clamp-1 mb-1.5">
                    {job.title}
                  </h3>

                  <div className="flex items-center gap-2.5 text-[11px] text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-muted-foreground" />
                      {job.location}
                    </span>
                    {job.isRemote && (
                      <span className="flex items-center gap-1">
                        <Laptop className="w-3 h-3 text-muted-foreground" />
                        Remote
                      </span>
                    )}
                    {job.stipendOrSalary && (
                      <span className="font-semibold text-foreground/90">
                        • {job.stipendOrSalary}
                      </span>
                    )}
                  </div>

                  {/* Match Reason Rationale */}
                  <div className="mt-2.5 p-2 rounded bg-background/80 border border-border/60 text-[11px] text-muted-foreground leading-relaxed">
                    <div className="flex items-start gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                      <span>{job.matchReason}</span>
                    </div>
                  </div>

                  {/* Skills Alignment */}
                  <div className="mt-3 space-y-1.5">
                    <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                      Skills Alignment:
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {job.matchedSkills.map((skill) => (
                        <span
                          key={skill}
                          className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                        >
                          ✓ {skill}
                        </span>
                      ))}
                      {job.missingSkills.slice(0, 3).map((skill) => (
                        <span
                          key={skill}
                          className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-secondary text-muted-foreground border border-border"
                        >
                          + {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="pt-3 border-t border-border/60 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {currentStatus === "Applied" ? (
                      <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[10px] gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Applied
                      </Badge>
                    ) : currentStatus === "Saved" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUpdateStatus(job.id, "Applied")}
                        className="h-7 text-[11px] px-2.5"
                      >
                        Mark Applied
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleUpdateStatus(job.id, "Saved")}
                        className="h-7 text-[11px] px-2 text-muted-foreground hover:text-foreground"
                      >
                        <Bookmark className="w-3 h-3 mr-1" />
                        Save
                      </Button>
                    )}
                  </div>

                  <a
                    href={job.applyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 h-7 px-3 rounded-md bg-primary text-primary-foreground text-[11px] font-semibold hover:bg-primary/90 transition-colors shadow-xs"
                  >
                    <span>Apply on Site</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 1-Click Live Online Search Integrations */}
      {platformUrls && (
        <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-primary" />
                Live Online Job Search (Pre-filled Boolean Query)
              </h3>
              <p className="text-[11px] text-muted-foreground">
                One-click search across major hiring portals using your verified resume skills and target role.
              </p>
            </div>
            {booleanQuery && (
              <span className="font-mono text-[10px] text-muted-foreground truncate max-w-xs bg-background/80 px-2 py-0.5 rounded border border-border/60">
                {booleanQuery}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            {platformUrls.linkedin && (
              <a
                href={platformUrls.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#0A66C2] text-white hover:bg-[#0A66C2]/90 transition-colors"
              >
                <span>LinkedIn Jobs ↗</span>
              </a>
            )}
            {platformUrls.googleJobs && (
              <a
                href={platformUrls.googleJobs}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-background border border-border text-foreground hover:bg-secondary transition-colors"
              >
                <span>Google Jobs ↗</span>
              </a>
            )}
            {platformUrls.wellfound && (
              <a
                href={platformUrls.wellfound}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-background border border-border text-foreground hover:bg-secondary transition-colors"
              >
                <span>Wellfound (Startups) ↗</span>
              </a>
            )}
            {platformUrls.internshala && (
              <a
                href={platformUrls.internshala}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#008BDC] text-white hover:bg-[#008BDC]/90 transition-colors"
              >
                <span>Internshala ↗</span>
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

