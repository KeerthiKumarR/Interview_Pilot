"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Briefcase,
  GraduationCap,
  Sparkles,
  ArrowLeft,
  Search,
  Filter,
  CheckCircle2,
  RefreshCw,
  Clock,
  ListFilter,
} from "lucide-react";
import { BooleanSearchCard } from "@/features/jobs/components/boolean-search-card";
import { JobCard, JobItem } from "@/features/jobs/components/job-card";
import { ApplicationTracker } from "@/features/jobs/components/application-tracker";
import { Button } from "@/components/ui/button";

import { useCachedData, invalidateCache } from "@/lib/client-cache";

interface JobsData {
  booleanQuery: string;
  platformUrls: any;
  studentTargetRole: string;
  candidateReadinessScore: number;
  jobs: JobItem[];
}

export default function JobsPage() {
  const { data, loading, error, refresh, mutate } = useCachedData<JobsData>("/api/jobs");
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "msot" | "tracker">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const handleUpdateStatus = async (jobId: string, status: string) => {
    try {
      const res = await fetch("/api/jobs/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, status }),
      });

      if (!res.ok) {
        throw new Error("Failed to update status");
      }

      // Update local state smoothly via cache mutate
      mutate((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          jobs: prev.jobs.map((j) =>
            j.id === jobId ? { ...j, applicationStatus: status } : j
          ),
        };
      });
      invalidateCache("/api/jobs");
      invalidateCache("/api/admin/jobs");
    } catch (err) {
      console.error("Error updating application status:", err);
    }
  };

  // Filter jobs
  const allJobs = data?.jobs || [];
  const filteredJobs = allJobs.filter((job) => {
    if (activeTab === "msot" && !job.isMSOTInternal) return false;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchTitle = job.title.toLowerCase().includes(query);
      const matchCompany = job.company.toLowerCase().includes(query);
      const matchSkill = job.requiredSkills.some((s) =>
        s.toLowerCase().includes(query)
      );
      if (!matchTitle && !matchCompany && !matchSkill) return false;
    }
    return true;
  });

  const msotCount = allJobs.filter((j) => j.isMSOTInternal).length;
  const trackerCount = allJobs.filter(
    (j) => j.applicationStatus && j.applicationStatus !== "None"
  ).length;

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8 sm:py-10 space-y-6">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Dashboard</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/readiness"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground bg-muted/60 border border-border/60 px-2.5 py-1 rounded-md transition-colors"
          >
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span>Readiness Score: {data?.candidateReadinessScore || 0}/100</span>
          </Link>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <Briefcase className="h-4 w-4" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Job Discovery & Campus Board
          </h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Algorithmic matching against verified opportunities, Boolean search queries, and exclusive MSOT campus placement drives.
        </p>
      </div>

      {/* Boolean Search Component */}
      {data && (
        <BooleanSearchCard
          booleanQuery={data.booleanQuery}
          targetRole={data.studentTargetRole}
          platformUrls={data.platformUrls}
        />
      )}

      {/* Tabs & Search Controls */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
          {/* Tabs */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={`text-xs font-semibold px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
                activeTab === "all"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              <Briefcase className="h-3.5 w-3.5" />
              <span>All Opportunities ({allJobs.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("msot")}
              className={`text-xs font-semibold px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
                activeTab === "msot"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              <GraduationCap className="h-3.5 w-3.5" />
              <span>MSOT Campus Drives ({msotCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("tracker")}
              className={`text-xs font-semibold px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
                activeTab === "tracker"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Tracker Pipeline ({trackerCount})</span>
            </button>
          </div>

          {/* Quick Search */}
          {activeTab !== "tracker" && (
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Filter by title, company, skill..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-md border border-border bg-card pl-8 pr-3 py-1.5 text-xs focus:outline-hidden focus:ring-1 focus:ring-primary"
              />
            </div>
          )}
        </div>

        {/* Content based on Active Tab */}
        {loading ? (
          <div className="space-y-3 py-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-36 rounded-xl border border-border/60 bg-muted/20 animate-pulse"
              />
            ))}
          </div>
        ) : activeTab === "tracker" ? (
          <ApplicationTracker jobs={allJobs} onUpdateStatus={handleUpdateStatus} />
        ) : (
          <div className="space-y-3.5">
            {filteredJobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                onUpdateStatus={handleUpdateStatus}
              />
            ))}

            {filteredJobs.length === 0 && (
              <div className="rounded-xl border border-dashed border-border p-10 text-center space-y-2">
                <div className="mx-auto h-10 w-10 rounded-full bg-muted/60 flex items-center justify-center text-muted-foreground">
                  <ListFilter className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-medium">No matching jobs found</h3>
                <p className="text-xs text-muted-foreground">
                  Try adjusting your search filter or complete your profile skills.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
