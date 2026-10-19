"use client";

import React from "react";
import {
  Briefcase,
  Bookmark,
  Send,
  Calendar,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Clock,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { JobItem } from "./job-card";

interface ApplicationTrackerProps {
  jobs: JobItem[];
  onUpdateStatus: (jobId: string, status: string) => Promise<void>;
}

export function ApplicationTracker({
  jobs,
  onUpdateStatus,
}: ApplicationTrackerProps) {
  const trackedJobs = jobs.filter(
    (j) => j.applicationStatus && j.applicationStatus !== "None"
  );

  const columns = [
    { key: "Saved", label: "Saved", icon: Bookmark, color: "text-blue-500 bg-blue-500/10 border-blue-500/20" },
    { key: "Applied", label: "Applied", icon: Send, color: "text-amber-500 bg-amber-500/10 border-amber-500/20" },
    { key: "Interview", label: "Interview", icon: Calendar, color: "text-purple-500 bg-purple-500/10 border-purple-500/20" },
    { key: "Offer", label: "Offer", icon: CheckCircle2, color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" },
  ];

  if (trackedJobs.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-10 text-center space-y-3">
        <div className="mx-auto h-12 w-12 rounded-full bg-muted/60 flex items-center justify-center text-muted-foreground">
          <Briefcase className="h-6 w-6" />
        </div>
        <h3 className="text-base font-medium">No Tracked Applications Yet</h3>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
          When you save a job or mark it as applied from the Discover Opportunities tab, it will automatically appear in your tracker here.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {columns.map((col) => {
        const colJobs = trackedJobs.filter((j) => j.applicationStatus === col.key);
        const Icon = col.icon;

        return (
          <div key={col.key} className="space-y-3">
            {/* Column Header */}
            <div className="flex items-center justify-between pb-1 border-b border-border/60">
              <div className="flex items-center gap-1.5 text-xs font-semibold">
                <span className={`p-1 rounded-md border ${col.color}`}>
                  <Icon className="h-3 w-3" />
                </span>
                <span>{col.label}</span>
              </div>
              <span className="text-xs font-mono font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {colJobs.length}
              </span>
            </div>

            {/* Cards in column */}
            <div className="space-y-2.5">
              {colJobs.map((job) => (
                <Card
                  key={job.id}
                  className="border border-border/70 bg-card/80 shadow-xs hover:border-border transition-all"
                >
                  <CardContent className="p-3.5 space-y-2">
                    <div>
                      <div className="text-[11px] font-medium text-muted-foreground truncate">
                        {job.company}
                      </div>
                      <div className="text-xs font-semibold text-foreground line-clamp-1">
                        {job.title}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                      <span className="font-mono text-emerald-600 dark:text-emerald-400">
                        {job.fitPercentage}% Fit
                      </span>
                      <a
                        href={job.applyUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline flex items-center gap-0.5"
                      >
                        <span>Link</span>
                        <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    </div>

                    {/* Move Status Buttons */}
                    <div className="flex items-center gap-1 pt-1">
                      {col.key !== "Applied" && (
                        <button
                          type="button"
                          onClick={() => onUpdateStatus(job.id, "Applied")}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-muted hover:bg-muted/80 text-muted-foreground"
                        >
                          → Applied
                        </button>
                      )}
                      {col.key !== "Interview" && (
                        <button
                          type="button"
                          onClick={() => onUpdateStatus(job.id, "Interview")}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-muted hover:bg-muted/80 text-muted-foreground"
                        >
                          → Interview
                        </button>
                      )}
                      {col.key !== "Offer" && (
                        <button
                          type="button"
                          onClick={() => onUpdateStatus(job.id, "Offer")}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
                        >
                          → Offer
                        </button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}

              {colJobs.length === 0 && (
                <div className="rounded-lg border border-dashed border-border/50 p-4 text-center text-[11px] text-muted-foreground">
                  No jobs in {col.label.toLowerCase()}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
