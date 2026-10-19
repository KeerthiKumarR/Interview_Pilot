"use client";

import React, { useEffect, useState } from "react";
import { Sidebar } from "@/features/admin/components/sidebar";
import { useAdminNotifications } from "@/features/admin/components/admin-notification-system";
import {
  GraduationCap,
  Briefcase,
  Plus,
  Users,
  Search,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  MapPin,
  Sparkles,
  Building2,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { useCachedData, invalidateCache } from "@/lib/client-cache";

interface ApplicantItem {
  applicationId: string;
  status: string;
  appliedAt: string | null;
  notes: string | null;
  studentName: string;
  studentEmail: string;
  githubUsername: string | null;
  targetRole: string | null;
  readinessScore: number;
  readinessTier: string;
}

interface AdminJobItem {
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
  stipendOrSalary: string | null;
  createdAt: string;
  applicantCount: number;
  applicants: ApplicantItem[];
}

export default function AdminJobsPage() {
  const { notify } = useAdminNotifications();
  const { data: cacheData, loading, refresh } = useCachedData<{ jobs: AdminJobItem[] }>("/api/admin/jobs");
  const jobs = cacheData?.jobs || [];
  const [expandedJobs, setExpandedJobs] = useState<Record<string, boolean>>({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // New Job Form State
  const [formData, setFormData] = useState({
    title: "",
    company: "MSOT Placement Cell",
    description: "",
    location: "Bangalore (Hybrid)",
    isRemote: true,
    jobType: "internship",
    applyUrl: "",
    requiredSkills: "React, Next.js, TypeScript, PostgreSQL",
    minReadinessScore: 65,
    isMSOTInternal: true,
    stipendOrSalary: "₹35,000 / month",
  });

  const toggleExpand = (jobId: string) => {
    setExpandedJobs((prev) => ({
      ...prev,
      [jobId]: !prev[jobId],
    }));
  };

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.company || !formData.description || !formData.applyUrl) {
      notify("error", "Validation Error", "Please fill in all required fields.");
      return;
    }

    try {
      setCreating(true);
      const res = await fetch("/api/admin/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const errorJson = await res.json();
        throw new Error(errorJson.error || "Failed to create job posting");
      }

      notify("success", "Job Posted", `"${formData.title}" posted successfully.`);
      setShowCreateModal(false);
      setFormData({
        title: "",
        company: "MSOT Placement Cell",
        description: "",
        location: "Bangalore (Hybrid)",
        isRemote: true,
        jobType: "internship",
        applyUrl: "",
        requiredSkills: "React, Next.js, TypeScript, PostgreSQL",
        minReadinessScore: 65,
        isMSOTInternal: true,
        stipendOrSalary: "₹35,000 / month",
      });
      // Invalidate both admin and student caches so both reflect immediately
      invalidateCache("/api/admin/jobs");
      invalidateCache("/api/jobs");
      refresh();
    } catch (err: any) {
      notify("error", "Creation Failed", err.message);
    } finally {
      setCreating(false);
    }
  };

  const filteredJobs = jobs.filter((j) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      j.title.toLowerCase().includes(q) ||
      j.company.toLowerCase().includes(q) ||
      j.requiredSkills.some((s) => s.toLowerCase().includes(q))
    );
  });

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />

      <main className="flex-1 overflow-y-auto">
        <div className="p-6 sm:p-8 max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
            <div>
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                  <GraduationCap className="h-4 w-4" />
                </div>
                <h1 className="text-xl font-bold tracking-tight">
                  MSOT Campus Drives & Job Management
                </h1>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Post exclusive campus placement drives, monitor candidate applications, and evaluate applicants sorted by readiness score.
              </p>
            </div>

            <Button
              size="sm"
              onClick={() => setShowCreateModal(true)}
              className="gap-1.5 self-start sm:self-auto"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Post Campus Drive</span>
            </Button>
          </div>

          {/* Search bar */}
          <div className="flex items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Filter drives by title, company, skills..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-md border border-border bg-card pl-8 pr-3 py-1.5 text-xs focus:outline-hidden focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="text-xs text-muted-foreground font-mono">
              Total Active Drives: {jobs.length}
            </div>
          </div>

          {/* Jobs Listing */}
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-28 rounded-xl border border-border bg-muted/20 animate-pulse"
                />
              ))}
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-12 text-center space-y-2">
              <Briefcase className="h-8 w-8 mx-auto text-muted-foreground" />
              <h3 className="text-sm font-semibold">No job drives found</h3>
              <p className="text-xs text-muted-foreground">
                Click &quot;Post Campus Drive&quot; to publish your first hiring listing.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredJobs.map((job) => {
                const isExpanded = !!expandedJobs[job.id];
                return (
                  <Card
                    key={job.id}
                    className="border border-border/70 bg-card overflow-hidden transition-all shadow-xs"
                  >
                    <div className="p-5 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                              <Building2 className="h-3.5 w-3.5" />
                              {job.company}
                            </span>
                            {job.isMSOTInternal && (
                              <span className="text-[11px] font-medium text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <GraduationCap className="h-3 w-3" />
                                Exclusive MSOT Drive
                              </span>
                            )}
                            {job.stipendOrSalary && (
                              <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                                {job.stipendOrSalary}
                              </span>
                            )}
                          </div>

                          <h3 className="text-base font-semibold tracking-tight text-foreground">
                            {job.title}
                          </h3>

                          <div className="flex items-center gap-3 text-xs text-muted-foreground pt-0.5">
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {job.location}
                            </span>
                            <span>•</span>
                            <span>Min Readiness: {job.minReadinessScore}+</span>
                            <span>•</span>
                            <span className="capitalize">{job.jobType}</span>
                          </div>
                        </div>

                        {/* Applicant count & toggle button */}
                        <div className="flex items-center gap-2 self-start sm:self-auto">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => toggleExpand(job.id)}
                            className="h-8 gap-1.5 text-xs font-medium"
                          >
                            <Users className="h-3.5 w-3.5 text-primary" />
                            <span>
                              {job.applicantCount}{" "}
                              {job.applicantCount === 1 ? "Applicant" : "Applicants"}
                            </span>
                            {isExpanded ? (
                              <ChevronDown className="h-3.5 w-3.5 ml-0.5" />
                            ) : (
                              <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
                            )}
                          </Button>
                        </div>
                      </div>

                      {/* Required skills */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-[11px] text-muted-foreground font-medium mr-1">
                          Skills:
                        </span>
                        {job.requiredSkills.map((s) => (
                          <span
                            key={s}
                            className="text-[11px] px-2 py-0.5 rounded-md bg-muted/60 text-muted-foreground border border-border/50"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Expandable Applicants Table */}
                    {isExpanded && (
                      <div className="border-t border-border bg-muted/20 p-5 space-y-3">
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <span className="flex items-center gap-1.5">
                            <Sparkles className="h-3.5 w-3.5 text-primary" />
                            Registered Candidates Ranked by Readiness Score
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            Sorted Descending
                          </span>
                        </div>

                        {job.applicants.length === 0 ? (
                          <div className="rounded-lg border border-dashed border-border/60 p-6 text-center text-xs text-muted-foreground">
                            No candidates have applied to this drive yet.
                          </div>
                        ) : (
                          <div className="rounded-lg border border-border/70 overflow-hidden bg-card">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-muted/50 border-b border-border/60 text-[11px] uppercase tracking-wider text-muted-foreground">
                                <tr>
                                  <th className="p-3">Candidate</th>
                                  <th className="p-3">Target Role</th>
                                  <th className="p-3">Readiness Score</th>
                                  <th className="p-3">Status</th>
                                  <th className="p-3 text-right">Actions</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border/50">
                                {job.applicants.map((app) => (
                                  <tr key={app.applicationId} className="hover:bg-muted/30">
                                    <td className="p-3">
                                      <div className="font-medium text-foreground">
                                        {app.studentName}
                                      </div>
                                      <div className="text-[11px] text-muted-foreground font-mono">
                                        {app.studentEmail}
                                      </div>
                                    </td>
                                    <td className="p-3 text-muted-foreground">
                                      {app.targetRole || "General"}
                                    </td>
                                    <td className="p-3">
                                      <span
                                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold font-mono text-[11px] border ${
                                          app.readinessScore >= 75
                                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                            : app.readinessScore >= 50
                                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                                            : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                                        }`}
                                      >
                                        <Sparkles className="h-3 w-3" />
                                        {app.readinessScore}/100
                                      </span>
                                    </td>
                                    <td className="p-3">
                                      <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-muted border border-border">
                                        {app.status}
                                      </span>
                                    </td>
                                    <td className="p-3 text-right">
                                      {app.githubUsername && (
                                        <a
                                          href={`https://github.com/${app.githubUsername}`}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="text-primary hover:underline inline-flex items-center gap-0.5 text-[11px]"
                                        >
                                          <span>GitHub</span>
                                          <ExternalLink className="h-2.5 w-2.5" />
                                        </a>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Post Campus Drive Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <div className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-primary" />
                <h2 className="text-base font-semibold">Post Campus Placement Drive</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-muted-foreground hover:text-foreground text-xs"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleCreateJob} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-medium text-foreground">Job Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Full-Stack Developer Intern (Fast-Track)"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full rounded-md border border-border bg-background px-3 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-foreground">Company Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    className="w-full rounded-md border border-border bg-background px-3 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-foreground">Stipend / Salary</label>
                  <input
                    type="text"
                    placeholder="e.g. ₹35,000 / month"
                    value={formData.stipendOrSalary}
                    onChange={(e) => setFormData({ ...formData, stipendOrSalary: e.target.value })}
                    className="w-full rounded-md border border-border bg-background px-3 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-foreground">Location</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full rounded-md border border-border bg-background px-3 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-foreground">Min Readiness Score (0-100)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={formData.minReadinessScore}
                    onChange={(e) => setFormData({ ...formData, minReadinessScore: Number(e.target.value) })}
                    className="w-full rounded-md border border-border bg-background px-3 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-medium text-foreground">Required Skills (comma separated) *</label>
                <input
                  type="text"
                  required
                  placeholder="React, TypeScript, Next.js, Node.js"
                  value={formData.requiredSkills}
                  onChange={(e) => setFormData({ ...formData, requiredSkills: e.target.value })}
                  className="w-full rounded-md border border-border bg-background px-3 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="font-medium text-foreground">Application / Portal Link *</label>
                <input
                  type="url"
                  required
                  placeholder="https://msot.ac.in/careers or drive form"
                  value={formData.applyUrl}
                  onChange={(e) => setFormData({ ...formData, applyUrl: e.target.value })}
                  className="w-full rounded-md border border-border bg-background px-3 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="font-medium text-foreground">Description *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Briefly describe the responsibilities, project scope, and interview rounds..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full rounded-md border border-border bg-background px-3 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isMSOT"
                  checked={formData.isMSOTInternal}
                  onChange={(e) => setFormData({ ...formData, isMSOTInternal: e.target.checked })}
                  className="rounded border-border text-primary"
                />
                <label htmlFor="isMSOT" className="text-xs text-foreground cursor-pointer font-medium">
                  Mark as Exclusive MSOT Campus Drive (pinned at top for students)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={creating}>
                  {creating ? "Posting..." : "Publish Drive"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
