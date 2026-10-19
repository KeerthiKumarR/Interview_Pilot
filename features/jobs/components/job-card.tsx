"use client";

import React, { useState } from "react";
import {
  Building2,
  MapPin,
  Laptop,
  GraduationCap,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  Clock,
  Bookmark,
  Send,
  Calendar,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface JobItem {
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
  createdAt: string;
  fitPercentage: number;
  matchedSkills: string[];
  missingSkills: string[];
  isEligible: boolean;
  matchReason: string;
  applicationStatus: string;
  appliedAt?: string | null;
  reminderDate?: string | null;
  notes?: string | null;
}

interface JobCardProps {
  job: JobItem;
  onUpdateStatus: (jobId: string, status: string) => Promise<void>;
}

export function JobCard({ job, onUpdateStatus }: JobCardProps) {
  const [updating, setUpdating] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(job.applicationStatus || "None");

  const handleStatusChange = async (newStatus: string) => {
    try {
      setUpdating(true);
      await onUpdateStatus(job.id, newStatus);
      setCurrentStatus(newStatus);
    } finally {
      setUpdating(false);
    }
  };

  const getFitBadge = (score: number) => {
    if (score >= 75) {
      return {
        bg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
        label: "High Match",
      };
    }
    if (score >= 50) {
      return {
        bg: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
        label: "Good Fit",
      };
    }
    return {
      bg: "bg-muted text-muted-foreground border-border",
      label: "Partial Fit",
    };
  };

  const fitBadge = getFitBadge(job.fitPercentage);

  return (
    <Card
      className={`border transition-all duration-200 overflow-hidden ${
        job.isMSOTInternal
          ? "border-primary/40 bg-card/90 shadow-sm ring-1 ring-primary/20"
          : "border-border/60 bg-card/60 hover:border-border"
      }`}
    >
      {/* Top Banner for Internal MSOT Drives */}
      {job.isMSOTInternal && (
        <div className="bg-primary/10 border-b border-primary/20 px-4 py-1.5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 font-medium text-primary">
            <GraduationCap className="h-3.5 w-3.5" />
            <span>Exclusive MSOT Campus Drive</span>
          </div>
          <span className="text-[11px] text-muted-foreground font-mono">
            Direct Screening
          </span>
        </div>
      )}

      <CardContent className="p-5 space-y-4">
        {/* Title & Company Row */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground/80" />
                {job.company}
              </span>
              {job.stipendOrSalary && (
                <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  {job.stipendOrSalary}
                </span>
              )}
            </div>

            <h3 className="text-base font-semibold tracking-tight text-foreground">
              {job.title}
            </h3>

            <div className="flex flex-wrap items-center gap-2 pt-0.5 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                {job.isRemote ? (
                  <>
                    <Laptop className="h-3 w-3" />
                    Remote
                  </>
                ) : (
                  <>
                    <MapPin className="h-3 w-3" />
                    {job.location}
                  </>
                )}
              </span>
              <span>•</span>
              <span className="capitalize">{job.jobType}</span>
              {job.minReadinessScore > 0 && (
                <>
                  <span>•</span>
                  <span>Min Readiness: {job.minReadinessScore}+</span>
                </>
              )}
            </div>
          </div>

          {/* Fit Percentage Widget */}
          <div className="flex sm:flex-col items-center sm:items-end justify-between gap-1.5 shrink-0">
            <div className={`px-2.5 py-1 rounded-md border text-xs font-semibold flex items-center gap-1.5 ${fitBadge.bg}`}>
              <Sparkles className="h-3.5 w-3.5" />
              <span>{job.fitPercentage}% Match</span>
            </div>
            <span className="text-[11px] text-muted-foreground hidden sm:inline">
              {fitBadge.label}
            </span>
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
          {job.description}
        </p>

        {/* Skills Matched & Missing */}
        <div className="space-y-2 pt-1 border-t border-border/50">
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-[11px] font-medium text-muted-foreground mr-1">Skills:</span>
            {job.matchedSkills.map((skill) => (
              <span
                key={skill}
                className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20"
              >
                <CheckCircle2 className="h-2.5 w-2.5" />
                {skill}
              </span>
            ))}
            {job.missingSkills.map((skill) => (
              <span
                key={skill}
                className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-md bg-muted/60 text-muted-foreground border border-border/60"
              >
                {skill}
              </span>
            ))}
          </div>

          {/* Explainable Match Reason */}
          <div className="rounded-md bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground/90 border border-border/40 flex items-start gap-2">
            <Sparkles className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
            <span>{job.matchReason}</span>
          </div>
        </div>

        {/* Footer Actions & Application Pipeline */}
        <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-border/60">
          {/* Status Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <span className="text-[11px] text-muted-foreground font-medium mr-1 shrink-0">
              Pipeline:
            </span>
            {(["Saved", "Applied", "Interview", "Offer"] as const).map((status) => {
              const active = currentStatus === status;
              return (
                <button
                  key={status}
                  type="button"
                  disabled={updating}
                  onClick={() => handleStatusChange(status)}
                  className={`text-[11px] px-2.5 py-1 rounded-md font-medium transition-all ${
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/50"
                  }`}
                >
                  {status}
                </button>
              );
            })}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={job.applyUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
            >
              <span>Apply Directly</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
