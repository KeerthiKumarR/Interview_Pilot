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
  Globe,
  Award,
  FileText,
  Radio,
  SlidersHorizontal,
} from "lucide-react";
import { BooleanSearchCard } from "@/features/jobs/components/boolean-search-card";
import { JobCard, JobItem } from "@/features/jobs/components/job-card";
import { ApplicationTracker } from "@/features/jobs/components/application-tracker";
import { Button } from "@/components/ui/button";
import { useCachedData, invalidateCache } from "@/lib/client-cache";
import { formatVerdictLabel } from "@/lib/jobs/matcher";

interface CandidateSummary {
  name?: string | null;
  email?: string | null;
  imageUrl?: string | null;
  targetRole: string;
  skillsCount: number;
  skills: string[];
  projectsCount: number;
  hasResume: boolean;
  readinessScore: number;
  latestInterview: {
    id: string;
    overallScore: number;
    technicalScore: number;
    communicationScore: number;
    problemSolvingScore: number;
    verdict: string | null;
  } | null;
}

interface JobsStats {
  totalJobs: number;
  onlineJobsCount: number;
  campusJobsCount: number;
  highMatchCount: number;
}

interface JobsData {
  candidateSummary?: CandidateSummary;
  stats?: JobsStats;
  booleanQuery: string;
  platformUrls: any;
  studentTargetRole?: string;
  candidateReadinessScore?: number;
  jobs: JobItem[];
}

export default function JobsPage() {
  const { data, loading, error, refresh, mutate } = useCachedData<JobsData>("/api/jobs");
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "online" | "campus" | "tracker">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [highMatchOnly, setHighMatchOnly] = useState(false);

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
  const candidateSummary = data?.candidateSummary;
  const onlineCount = data?.stats?.onlineJobsCount ?? allJobs.filter((j) => !j.isMSOTInternal).length;
  const campusDrivesCount = data?.stats?.campusJobsCount ?? allJobs.filter((j) => j.isMSOTInternal).length;
  const trackerCount = allJobs.filter(
    (j) => j.applicationStatus && j.applicationStatus !== "None"
  ).length;

  const filteredJobs = allJobs.filter((job) => {
    if (activeTab === "online" && job.isMSOTInternal) return false;
    if (activeTab === "campus" && !job.isMSOTInternal) return false;
    if (remoteOnly && !job.isRemote) return false;
    if (highMatchOnly && job.fitPercentage < 70) return false;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchTitle = job.title.toLowerCase().includes(query);
      const matchCompany = job.company.toLowerCase().includes(query);
      const matchSkill = (job.requiredSkills || []).some((s) =>
        s.toLowerCase().includes(query)
      );
      if (!matchTitle && !matchCompany && !matchSkill) return false;
    }
    return true;
  });

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
            <Radio className="h-3.5 w-3.5 text-primary" />
            <span>Readiness Score: {candidateSummary?.readinessScore || data?.candidateReadinessScore || 0}/100</span>
          </Link>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="h-8 gap-1.5 px-2 text-xs"
            title="Fetch latest online job listings"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-primary" : ""}`} />
            <span className="hidden sm:inline">Refresh Live Jobs</span>
          </Button>
        </div>
      </div>

      {/* Main Header with Neo-Brutalist Badges */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 rounded-full border-2 border-border bg-card px-3 py-0.5 text-xs font-black text-foreground shadow-xs">
          <span className="size-2 rounded-full bg-[#EA4335] animate-ping" />
          <span>Campus Placement &amp; Job Drives</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
          Jobs &amp;{" "}
          <span className="inline-block bg-[#EA4335] text-white px-3 py-0.5 rounded-xl border-2 border-black dark:border-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.7)] rotate-[-1deg] mx-1">
            Drives
          </span>
        </h1>
        <p className="text-sm text-muted-foreground font-medium max-w-xl">
          Multi-factor matching against your verified resume, portfolio projects, and viva interview performance.
        </p>
      </div>

      {/* Candidate Profile Synced Passport */}
      {candidateSummary && (
        <div className="rounded-2xl border-2 border-border bg-card p-5 neo-shadow space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-border/80 pb-3">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl border-2 border-border bg-primary/10 flex items-center justify-center text-primary neo-shadow-sm shrink-0">
                <Briefcase className="size-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-primary">
                    Candidate Profile Synced
                  </span>
                  <span className="px-2.5 py-0.5 rounded-lg border-2 border-border bg-secondary text-foreground text-xs font-black">
                    {candidateSummary.targetRole}
                  </span>
                </div>
                {candidateSummary.name && (
                  <div className="text-[11px] font-medium text-muted-foreground mt-0.5">
                    {candidateSummary.name} {candidateSummary.email ? `(${candidateSummary.email})` : ""} · Multi-Factor Match
                  </div>
                )}
              </div>
            </div>
            <div className="text-xs font-medium text-muted-foreground">
              Profile Alignment: Skills · Viva Performance · Projects · Readiness
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            {/* Dimension 1: Resume & Skills */}
            <div className="p-2.5 rounded-lg bg-card/80 border border-border/60 space-y-1">
              <div className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                <FileText className="h-3 w-3 text-blue-500" />
                Resume & Skills
              </div>
              <div className="text-sm font-bold text-foreground">
                {candidateSummary.skillsCount} Verified Skills
              </div>
              <div className="text-[11px] text-muted-foreground truncate">
                {candidateSummary.skills.slice(0, 3).join(", ") || "Skills extracted"}
              </div>
            </div>

            {/* Dimension 2: Mock Viva Track Record */}
            <div className="p-2.5 rounded-lg bg-card/80 border border-border/60 space-y-1">
              <div className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                <Award className="h-3 w-3 text-purple-500" />
                Latest Placement Viva
              </div>
              <div className="text-sm font-bold text-foreground">
                {candidateSummary.latestInterview ? (
                  `${candidateSummary.latestInterview.overallScore}% Overall`
                ) : (
                  "Not Taken Yet"
                )}
              </div>
              <div className="text-[11px] text-muted-foreground">
                {candidateSummary.latestInterview ? (
                  `Tech: ${candidateSummary.latestInterview.technicalScore}% · ${formatVerdictLabel(candidateSummary.latestInterview.verdict)}`
                ) : (
                  <Link href="/dashboard" className="text-primary hover:underline">
                    Take Viva to Boost Score
                  </Link>
                )}
              </div>
            </div>

            {/* Dimension 3: Projects */}
            <div className="p-2.5 rounded-lg bg-card/80 border border-border/60 space-y-1">
              <div className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                <Briefcase className="h-3 w-3 text-emerald-500" />
                Portfolio Projects
              </div>
              <div className="text-sm font-bold text-foreground">
                {candidateSummary.projectsCount} Projects Synced
              </div>
              <div className="text-[11px] text-muted-foreground">
                Verified GitHub & Deployment
              </div>
            </div>

            {/* Dimension 4: Readiness */}
            <div className="p-2.5 rounded-lg bg-card/80 border border-border/60 space-y-1">
              <div className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                <Radio className="h-3 w-3 text-amber-500" />
                Readiness Benchmark
              </div>
              <div className="text-sm font-bold text-foreground">
                {candidateSummary.readinessScore}/100 Score
              </div>
              <div className="text-[11px] text-muted-foreground">
                {candidateSummary.readinessScore >= 75
                  ? "Placement Ready"
                  : candidateSummary.readinessScore >= 50
                  ? "Interview Ready"
                  : "Needs Practice"}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Boolean Search Component */}
      {data && (
        <BooleanSearchCard
          booleanQuery={data.booleanQuery}
          targetRole={candidateSummary?.targetRole || data.studentTargetRole || "Software Engineer"}
          platformUrls={data.platformUrls}
        />
      )}

      {/* Tabs & Search Controls */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
          {/* Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={`text-xs font-semibold px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 cursor-pointer ${
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
              onClick={() => setActiveTab("online")}
              className={`text-xs font-semibold px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === "online"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              <Globe className="h-3.5 w-3.5" />
              <span>Live Online Jobs ({onlineCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("campus")}
              className={`text-xs font-semibold px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === "campus"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              <GraduationCap className="h-3.5 w-3.5" />
              <span>Campus Partner Drives ({campusDrivesCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("tracker")}
              className={`text-xs font-semibold px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === "tracker"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>My Applications ({trackerCount})</span>
            </button>
          </div>

          {/* Quick Search */}
          {activeTab !== "tracker" && (
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search title, company, skill..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-md border border-border bg-card pl-8 pr-3 py-1.5 text-xs focus:outline-hidden focus:ring-1 focus:ring-primary"
              />
            </div>
          )}
        </div>

        {/* Quick Filter Toggles */}
        {activeTab !== "tracker" && (
          <div className="flex items-center gap-3 text-xs">
            <span className="text-muted-foreground font-medium flex items-center gap-1">
              <SlidersHorizontal className="h-3 w-3" /> Filter:
            </span>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={remoteOnly}
                onChange={(e) => setRemoteOnly(e.target.checked)}
                className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5"
              />
              <span>Remote Only</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={highMatchOnly}
                onChange={(e) => setHighMatchOnly(e.target.checked)}
                className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5"
              />
              <span>High Match (70%+)</span>
            </label>
          </div>
        )}

        {/* Content based on Active Tab */}
        {loading ? (
          <div className="space-y-3 py-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-40 rounded-xl border border-border/60 bg-muted/20 animate-pulse"
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
                  Try clearing your search query or unchecking filters.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
