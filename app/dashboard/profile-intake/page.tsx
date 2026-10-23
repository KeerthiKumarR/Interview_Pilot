"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Sparkles,
  Save,
  CheckCircle2,
  ArrowLeft,
  Loader2,
  FileCheck2,
  ShieldCheck,
  UserCheck,
  Trash2,
  Bot,
  RotateCw,
  Calendar,
  Layers,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { invalidateCache, readCache, writeCache, getCacheTimestamp } from "@/lib/client-cache";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  ChatIntakeAssistant,
  type ExtractedProfileData,
} from "@/features/profile/components/chat-intake-assistant";
import {
  ResumeDropzone,
  type ParsedResumePayload,
} from "@/features/profile/components/resume-dropzone";
import { SocialLinksForm } from "@/features/profile/components/social-links-form";
import { SkillsInput } from "@/features/profile/components/skills-input";
import { ProjectsSection } from "@/features/profile/components/projects-section";
import { AchievementsSection } from "@/features/profile/components/achievements-section";
import { ProfileIntakeSkeleton } from "@/features/profile/components/profile-intake-skeleton";

// Module 2 Review Components
import { ReviewProgressModal } from "@/features/review/components/review-progress-modal";
import { ResumeAuditCard } from "@/features/review/components/resume-audit-card";
import { CodebaseAuditCard } from "@/features/review/components/codebase-audit-card";
import { LiveLinksCard } from "@/features/review/components/live-links-card";
import { RewritesCard } from "@/features/review/components/rewrites-card";
import { EmptyReviewState } from "@/features/review/components/empty-review-state";
import { ResumeAuditResult } from "@/lib/review/resume-auditor";
import {
  CodebaseCheckResult,
  LiveLinkCheckResult,
  LinkedinCheckResult,
} from "@/lib/review/full-auditor";

import {
  StudentProjectData,
  StudentAchievementData,
  SaveProfilePayload,
} from "@/types/profile";

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

function ProfileIntakeMain() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<"profile" | "review">(
    tabParam === "review" ? "review" : "profile"
  );

  // Synchronous cache read for instantaneous 0ms frame-0 render
  const initialProfile = typeof window !== "undefined" ? readCache<{ profile: any }>("/api/profile")?.profile || null : null;
  const initialReview = typeof window !== "undefined" ? readCache<{ review: ReviewData | null; readinessScore: ReadinessScoreData | null }>("/api/review") : null;

  const [isLoading, setIsLoading] = useState(() => !initialProfile);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(() =>
    initialProfile?.updatedAt ? new Date(initialProfile.updatedAt) : null
  );

  // Profile Form States initialized directly from cache
  const [targetRole, setTargetRole] = useState(() => initialProfile?.targetRole || "Full Stack Developer");
  const [resumeFileName, setResumeFileName] = useState<string | null>(() => initialProfile?.resumeFileName || null);
  const [resumeText, setResumeText] = useState<string | null>(() => initialProfile?.resumeText || null);
  const [resumePageCount, setResumePageCount] = useState<number | null>(() => initialProfile?.resumePageCount || null);

  const [githubUsername, setGithubUsername] = useState(() => initialProfile?.githubUsername || "");
  const [leetcodeUsername, setLeetcodeUsername] = useState(() => initialProfile?.leetcodeUsername || "");
  const [linkedinUrl, setLinkedinUrl] = useState(() => initialProfile?.linkedinUrl || "");
  const [linkedinAbout, setLinkedinAbout] = useState(() => initialProfile?.linkedinAbout || "");

  const [skills, setSkills] = useState<string[]>(() => initialProfile?.skills || []);
  const [detectedSkillsPool, setDetectedSkillsPool] = useState<string[]>([]);

  const [projects, setProjects] = useState<StudentProjectData[]>(() => initialProfile?.projects || []);
  const [achievements, setAchievements] = useState<StudentAchievementData[]>(() => initialProfile?.achievements || []);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showChatAssistant, setShowChatAssistant] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Review Engine States initialized directly from cache
  const [review, setReview] = useState<ReviewData | null>(() => initialReview?.review || null);
  const [readinessScore, setReadinessScore] = useState<ReadinessScoreData | null>(() => initialReview?.readinessScore || null);
  const [isRunningReview, setIsRunningReview] = useState(false);

  // Apply extracted data from Chat Intake Assistant
  const handleApplyExtracted = useCallback((extracted: ExtractedProfileData) => {
    if (!extracted) return;
    if (extracted.targetRole) setTargetRole(extracted.targetRole);
    if (extracted.githubUsername) setGithubUsername(extracted.githubUsername);
    if (extracted.leetcodeUsername) setLeetcodeUsername(extracted.leetcodeUsername);
    if (extracted.linkedinUrl) setLinkedinUrl(extracted.linkedinUrl);
    if (extracted.linkedinAbout) setLinkedinAbout(extracted.linkedinAbout);

    if (Array.isArray(extracted.skills) && extracted.skills.length > 0) {
      setSkills((prev) => {
        const next = [...prev];
        for (const s of extracted.skills || []) {
          if (!next.some((item) => item.toLowerCase() === s.toLowerCase())) {
            next.push(s);
          }
        }
        return next;
      });
    }

    if (Array.isArray(extracted.projects) && extracted.projects.length > 0) {
      setProjects((prev) => {
        const existingTitles = new Set(prev.map((p) => p.title.toLowerCase()));
        const newOnes = (extracted.projects || []).filter(
          (p) => p.title && !existingTitles.has(p.title.toLowerCase())
        );
        return [...prev, ...newOnes];
      });
    }

    if (Array.isArray(extracted.achievements) && extracted.achievements.length > 0) {
      setAchievements((prev) => {
        const existingTitles = new Set(prev.map((a) => a.title.toLowerCase()));
        const validCategories = ["hackathon", "certification", "club", "award", "other"] as const;
        type AchCategory = (typeof validCategories)[number];

        const newOnes: StudentAchievementData[] = (extracted.achievements || [])
          .filter((a) => a.title && !existingTitles.has(a.title.toLowerCase()))
          .map((a) => {
            const rawCat = (a.category || "").toLowerCase() as AchCategory;
            const category: AchCategory = validCategories.includes(rawCat) ? rawCat : "other";
            return {
              title: a.title,
              category,
              description: a.description,
              date: a.date,
            };
          });
        return [...prev, ...newOnes];
      });
    }
  }, []);

  // Delete all stored profile data (Privacy compliance)
  const handleDeleteProfile = async () => {
    if (
      !confirm(
        "Are you sure you want to delete all stored profile and review data? This action cannot be undone."
      )
    ) {
      return;
    }

    setIsDeleting(true);
    try {
      const res = await fetch("/api/profile", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to delete profile.");
      }

      setTargetRole("Full Stack Developer");
      setResumeFileName(null);
      setResumeText(null);
      setResumePageCount(null);
      setGithubUsername("");
      setLeetcodeUsername("");
      setLinkedinUrl("");
      setLinkedinAbout("");
      setSkills([]);
      setDetectedSkillsPool([]);
      setProjects([]);
      setAchievements([]);
      setReview(null);
      setReadinessScore(null);
      setLastSavedAt(null);
      invalidateCache("/api/profile");
      invalidateCache("/api/readiness");
      toast.success("All stored profile data has been securely deleted.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete profile data.";
      toast.error(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  // 1. Fetch profile & review data on mount (with 0ms Stale-While-Revalidate hydration)
  // State is already initialized from cache via lazy initializers above.
  // This effect only fires a background revalidation if data is stale (> 3 min).
  useEffect(() => {
    let isMounted = true;
    const FRESH_THRESHOLD_MS = 3 * 60 * 1000; // 3 minutes
    const now = Date.now();

    const profileAge = now - getCacheTimestamp("/api/profile");
    const reviewAge = now - getCacheTimestamp("/api/review");

    // If both caches are fresh, skip network entirely — instant 0ms render
    if (profileAge < FRESH_THRESHOLD_MS && reviewAge < FRESH_THRESHOLD_MS) {
      setIsLoading(false);
      return;
    }

    // Silent background revalidation — never set isLoading to true if we already have data
    async function silentRevalidate() {
      try {
        const fetchProfile = profileAge >= FRESH_THRESHOLD_MS;
        const fetchReview = reviewAge >= FRESH_THRESHOLD_MS;

        const promises: Promise<Response>[] = [];
        if (fetchProfile) promises.push(fetch("/api/profile"));
        if (fetchReview) promises.push(fetch("/api/review"));

        const results = await Promise.all(promises);
        let resultIdx = 0;

        if (fetchProfile) {
          const profileRes = results[resultIdx++];
          if (profileRes.ok) {
            const profileData = await profileRes.json();
            writeCache("/api/profile", profileData);
            if (isMounted && profileData.profile) {
              const p = profileData.profile;
              if (p.targetRole) setTargetRole(p.targetRole);
              if (p.resumeFileName) setResumeFileName(p.resumeFileName);
              if (p.resumeText) setResumeText(p.resumeText);
              if (p.resumePageCount) setResumePageCount(p.resumePageCount);
              if (p.githubUsername) setGithubUsername(p.githubUsername);
              if (p.leetcodeUsername) setLeetcodeUsername(p.leetcodeUsername);
              if (p.linkedinUrl) setLinkedinUrl(p.linkedinUrl);
              if (p.linkedinAbout) setLinkedinAbout(p.linkedinAbout);
              if (p.skills && Array.isArray(p.skills)) setSkills(p.skills);
              if (p.projects && Array.isArray(p.projects)) setProjects(p.projects);
              if (p.achievements && Array.isArray(p.achievements)) setAchievements(p.achievements);
              if (p.updatedAt) setLastSavedAt(new Date(p.updatedAt));
            }
          }
        }

        if (fetchReview) {
          const reviewRes = results[resultIdx++];
          if (reviewRes.ok) {
            const reviewData = await reviewRes.json();
            writeCache("/api/review", reviewData);
            if (isMounted) {
              if (reviewData.review) setReview(reviewData.review);
              if (reviewData.readinessScore) setReadinessScore(reviewData.readinessScore);
            }
          }
        }
      } catch (err) {
        console.error("Failed to load profile or review data:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    silentRevalidate();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Handle Resume Parsing Results
  const handleResumeParsed = useCallback(
    (parsed: ParsedResumePayload) => {
      setResumeFileName(parsed.fileName);
      setResumePageCount(parsed.pageCount);
      setResumeText(parsed.text);
      setDetectedSkillsPool(parsed.detectedSkills);

      // Auto-populate links if currently empty
      if (parsed.detectedLinks.github && !githubUsername) {
        let clean = parsed.detectedLinks.github;
        const match = clean.match(/github\.com\/([a-zA-Z0-9_-]+)/);
        if (match) clean = match[1];
        setGithubUsername(clean);
      }
      if (parsed.detectedLinks.leetcode && !leetcodeUsername) {
        let clean = parsed.detectedLinks.leetcode;
        const match = clean.match(/leetcode\.com\/(?:u\/)?([a-zA-Z0-9_-]+)/);
        if (match) clean = match[1];
        setLeetcodeUsername(clean);
      }
      if (parsed.detectedLinks.linkedin && !linkedinUrl) {
        setLinkedinUrl(parsed.detectedLinks.linkedin);
      }

      // ─── AI Auto-fill: 3. Skills Cloud, 4. Highlighted Projects, 5. Achievements ───
      if (parsed.aiExtracted) {
        const ext = parsed.aiExtracted;

        // Auto-fill target role if detected and currently default
        if (ext.targetRole && (!targetRole || targetRole === "Full Stack Developer")) {
          setTargetRole(ext.targetRole);
        }

        // Auto-fill social links from AI extraction if still empty
        if (ext.githubUsername && !githubUsername) {
          setGithubUsername(ext.githubUsername);
        }
        if (ext.leetcodeUsername && !leetcodeUsername) {
          setLeetcodeUsername(ext.leetcodeUsername);
        }
        if (ext.linkedinUrl && !linkedinUrl) {
          setLinkedinUrl(ext.linkedinUrl);
        }

        // Auto-fill 3. Technical Skills Cloud
        if (Array.isArray(ext.skills) && ext.skills.length > 0) {
          setSkills((prev) => {
            const next = [...prev];
            for (const s of ext.skills || []) {
              if (!next.some((item) => item.toLowerCase() === s.toLowerCase())) {
                next.push(s);
              }
            }
            return next;
          });
        }

        // Auto-fill 4. Highlighted Projects & Architectures
        if (Array.isArray(ext.projects) && ext.projects.length > 0) {
          setProjects((prev) => {
            const existingTitles = new Set(prev.map((p) => p.title.toLowerCase()));
            const newOnes: StudentProjectData[] = (ext.projects || [])
              .filter((p) => p.title && !existingTitles.has(p.title.toLowerCase()))
              .map((p, idx) => ({
                title: p.title,
                description: p.description,
                repoUrl: p.repoUrl,
                liveUrl: p.liveUrl,
                techStack: p.techStack || [],
                order: prev.length + idx + 1,
              }));
            return [...prev, ...newOnes];
          });
        }

        // Auto-fill 5. Achievements & Certifications
        if (Array.isArray(ext.achievements) && ext.achievements.length > 0) {
          setAchievements((prev) => {
            const existingTitles = new Set(prev.map((a) => a.title.toLowerCase()));
            const validCategories = ["hackathon", "certification", "club", "award", "other"] as const;
            type AchCategory = (typeof validCategories)[number];

            const newOnes: StudentAchievementData[] = (ext.achievements || [])
              .filter((a) => a.title && !existingTitles.has(a.title.toLowerCase()))
              .map((a) => {
                const rawCat = (a.category || "").toLowerCase() as AchCategory;
                const category: AchCategory = validCategories.includes(rawCat) ? rawCat : "other";
                return {
                  title: a.title,
                  category,
                  description: a.description,
                  date: a.date,
                };
              });
            return [...prev, ...newOnes];
          });
        }

        toast.success(
          "AI automatically populated your Technical Skills Cloud, Projects, and Achievements!"
        );
      }
    },
    [githubUsername, leetcodeUsername, linkedinUrl, targetRole]
  );

  const handleRemoveResume = useCallback(() => {
    setResumeFileName(null);
    setResumePageCount(null);
    setResumeText(null);
    setDetectedSkillsPool([]);
    toast.info("Resume removed from current session.");
  }, []);

  const handleAddSkills = useCallback(
    (newSkills: string[]) => {
      setSkills((prev) => {
        const updated = [...prev];
        for (const s of newSkills) {
          if (!updated.some((item) => item.toLowerCase() === s.toLowerCase())) {
            updated.push(s);
          }
        }
        return updated;
      });
      setDetectedSkillsPool((prev) =>
        prev.filter((ds) => !newSkills.some((s) => s.toLowerCase() === ds.toLowerCase()))
      );
      toast.success(`Added ${newSkills.length} skill${newSkills.length > 1 ? "s" : ""}.`);
    },
    []
  );

  const handleSocialChange = useCallback((field: string, val: string) => {
    setErrors((prev) => ({ ...prev, [field]: "" }));
    if (field === "targetRole") setTargetRole(val);
    else if (field === "githubUsername") setGithubUsername(val);
    else if (field === "leetcodeUsername") setLeetcodeUsername(val);
    else if (field === "linkedinUrl") setLinkedinUrl(val);
    else if (field === "linkedinAbout") setLinkedinAbout(val);
  }, []);

  // Validation
  const validateForm = (): boolean => {
    const errs: Record<string, string> = {};
    if (!targetRole.trim()) errs.targetRole = "Please specify your target role.";
    if (linkedinUrl && !linkedinUrl.startsWith("http")) errs.linkedinUrl = "LinkedIn link must start with https://";

    for (let i = 0; i < projects.length; i++) {
      if (!projects[i].title.trim()) {
        errs[`project_${i}`] = `Project #${i + 1} requires a title.`;
        toast.error(`Project #${i + 1} must have a title.`);
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // 3. Save Profile Action & Auto-Trigger Review
  const handleSaveProfile = async () => {
    if (!validateForm()) return;

    setIsSaving(true);
    const payload: SaveProfilePayload = {
      targetRole: targetRole.trim(),
      resumeFileName: resumeFileName || undefined,
      resumeText: resumeText || undefined,
      resumePageCount: resumePageCount || undefined,
      githubUsername: githubUsername.trim() || undefined,
      leetcodeUsername: leetcodeUsername.trim() || undefined,
      linkedinUrl: linkedinUrl.trim() || undefined,
      linkedinAbout: linkedinAbout.trim() || undefined,
      skills,
      projects: projects.map((p, idx) => ({
        ...p,
        title: p.title.trim(),
        order: idx + 1,
      })),
      achievements: achievements.map((a) => ({
        ...a,
        title: a.title.trim(),
      })),
    };

    try {
      const res = await fetch("/api/profile/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to save profile.");
      }

      setLastSavedAt(new Date());
      invalidateCache("/api/profile");
      invalidateCache("/api/review");
      invalidateCache("/api/readiness");
      toast.success("Profile saved! Placement review benchmark is syncing in background.");

      // Fetch fresh review data and update cache
      const revRes = await fetch("/api/review");
      if (revRes.ok) {
        const revData = await revRes.json();
        writeCache("/api/review", revData);
        if (revData.review) setReview(revData.review);
        if (revData.readinessScore) setReadinessScore(revData.readinessScore);
      }
    } catch (err: unknown) {
      console.error("Save profile error:", err);
      const msg = err instanceof Error ? err.message : "Failed to save profile. Please try again.";
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  // 4. Trigger Full Placement Review On-Demand
  const handleRunFullReview = async () => {
    setIsRunningReview(true);
    try {
      const res = await fetch("/api/review/run", { method: "POST" });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Review audit failed to run.");
      }

      setReview(data.review);
      setReadinessScore(data.readinessScore);
      writeCache("/api/review", { review: data.review, readinessScore: data.readinessScore });
      invalidateCache("/api/readiness");
      toast.success("Placement review refreshed successfully!");
    } catch (err: unknown) {
      console.error("Error running review:", err);
      const msg = err instanceof Error ? err.message : "Failed to run review audit.";
      toast.error(msg);
    } finally {
      setIsRunningReview(false);
    }
  };

  const score = readinessScore?.overallScore ?? 0;
  const tier = readinessScore?.tier ?? "Not evaluated";

  const getTierColor = (t: string) => {
    if (t.toLowerCase().includes("placement"))
      return "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
    if (t.toLowerCase().includes("almost"))
      return "text-amber-500 bg-amber-500/10 border-amber-500/20";
    return "text-rose-500 bg-rose-500/10 border-rose-500/20";
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 space-y-6">
      {/* Real-time Progress Modal during Audit execution */}
      <ReviewProgressModal isOpen={isRunningReview} />

      {/* Top Header & Navigation */}
      <div className="flex items-center justify-between pb-2">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          Back to Mock Interview Dashboard
        </Link>

        {lastSavedAt && (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CheckCircle2 className="size-3.5 text-emerald-500" />
            Last synced {lastSavedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        )}
      </div>

      {isLoading ? (
        <ProfileIntakeSkeleton />
      ) : (
        <div className="space-y-6">
          {/* Main Title & Pitch */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  Profile & Placement Review Hub
                </h1>
                <span className="inline-flex items-center gap-1 rounded-md border border-primary/20 bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                  <Sparkles className="size-3" />
                  Modules 1 & 2
                </span>
              </div>
              <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
                Set up your resume and GitHub handles once. The benchmark engine automatically audits your ATS compatibility, codebase hygiene, and tailored questions.
              </p>
            </div>

            {activeTab === "profile" ? (
              <Button
                type="button"
                variant={showChatAssistant ? "default" : "outline"}
                size="sm"
                onClick={() => setShowChatAssistant(!showChatAssistant)}
                className="gap-1.5 shrink-0"
              >
                <Bot className="size-3.5" />
                {showChatAssistant ? "Hide Assistant" : "Talk to AI Assistant"}
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleRunFullReview}
                disabled={isRunningReview}
                size="sm"
                className="gap-2 shrink-0 cursor-pointer"
              >
                <RotateCw className={`size-3.5 ${isRunningReview ? "animate-spin" : ""}`} />
                Re-run Benchmark
              </Button>
            )}
          </div>

          {/* Unified Tab Switcher */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl border border-border bg-card shadow-2xs">
            <button
              type="button"
              onClick={() => setActiveTab("profile")}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                activeTab === "profile"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              <UserCheck className="size-3.5" />
              <span>1. Candidate Profile & Resume</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("review")}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                activeTab === "review"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              <Sparkles className="size-3.5 text-amber-500" />
              <span>2. AI Placement Review</span>
              {readinessScore && (
                <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-bold">
                  {readinessScore.overallScore}/100
                </span>
              )}
            </button>
          </div>

          {/* ══════════════════════════════════════════════════════════
              TAB 1: CANDIDATE PROFILE & RESUME INTAKE
             ══════════════════════════════════════════════════════════ */}
          {activeTab === "profile" && (
            <div className="space-y-6">
              {/* Profile & Benchmark Snapshot Card */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl border border-primary/20 bg-primary/5">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-primary uppercase tracking-wider">
                      Placement Benchmark Status
                    </span>
                    {readinessScore ? (
                      <span
                        className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold ${getTierColor(
                          readinessScore.tier
                        )}`}
                      >
                        {readinessScore.overallScore}/100 · {readinessScore.tier}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">Not evaluated yet</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {readinessScore
                      ? "Your ATS benchmark and codebase audit are active. Any changes to your resume or skills will auto-refresh your review."
                      : "Upload your resume and click Save to automatically generate your ATS score and code hygiene report."}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveTab("review")}
                  className="gap-1.5 shrink-0 text-xs"
                >
                  <Sparkles className="size-3.5 text-amber-500" />
                  View Audit & Rewrites &rarr;
                </Button>
              </div>

              {/* Conversational Assistant */}
              {showChatAssistant && (
                <ChatIntakeAssistant onApplyExtracted={handleApplyExtracted} />
              )}

              {/* Resume Upload */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileCheck2 className="size-4 text-primary" />
                    1. Resume Intake & Auto-Parser
                  </CardTitle>
                  <CardDescription>
                    Drop your PDF or DOCX resume for AI-powered data extraction and interview readiness.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResumeDropzone
                    currentFileName={resumeFileName}
                    currentPageCount={resumePageCount}
                    onParsedSuccess={handleResumeParsed}
                    onRemoveResume={handleRemoveResume}
                    onAddSkills={handleAddSkills}
                    detectedSkillsPool={detectedSkillsPool}
                  />
                </CardContent>
              </Card>

              {/* Role & Social Handles */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <UserCheck className="size-4 text-primary" />
                    2. Target Role & Developer Profiles
                  </CardTitle>
                  <CardDescription>
                    Provide your target role and handles so your mock interviews match real company expectations.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <SocialLinksForm
                    targetRole={targetRole}
                    githubUsername={githubUsername}
                    leetcodeUsername={leetcodeUsername}
                    linkedinUrl={linkedinUrl}
                    linkedinAbout={linkedinAbout}
                    errors={errors}
                    onChange={handleSocialChange}
                  />
                </CardContent>
              </Card>

              {/* Skills Cloud */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ShieldCheck className="size-4 text-primary" />
                    3. Technical Skills Cloud
                  </CardTitle>
                  <CardDescription>
                    Languages, frameworks, databases, and core concepts you want evaluated in interviews.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <SkillsInput
                    skills={skills}
                    onChange={setSkills}
                    detectedSkillsPool={detectedSkillsPool}
                  />
                </CardContent>
              </Card>

              {/* Key Projects */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">
                    4. Highlighted Projects & Architectures
                  </CardTitle>
                  <CardDescription>
                    The AI interviewer will refer to these live during your technical mock interview.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ProjectsSection projects={projects} onChange={setProjects} />
                </CardContent>
              </Card>

              {/* Achievements */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">
                    5. Achievements & Certifications
                  </CardTitle>
                  <CardDescription>
                    Hackathons, cloud credentials, or competitive rankings.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <AchievementsSection achievements={achievements} onChange={setAchievements} />
                </CardContent>
              </Card>

              {/* Action Bar */}
              <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-4 rounded-xl border border-border bg-card p-4 shadow-xs">
                <div className="flex items-center gap-3">
                  <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ArrowLeft className="size-3.5" />
                    Back to Mock Interview
                  </Link>

                  <span className="text-border">|</span>

                  <button
                    type="button"
                    onClick={handleDeleteProfile}
                    disabled={isDeleting || isSaving}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-destructive hover:text-destructive/80 transition-colors cursor-pointer"
                    title="Deletes stored profile data"
                  >
                    <Trash2 className="size-3.5" />
                    {isDeleting ? "Deleting..." : "Delete Stored Data"}
                  </button>
                </div>

                <Button
                  type="button"
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                  className="w-full sm:w-auto gap-2"
                  size="lg"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Saving & Running Benchmark...
                    </>
                  ) : (
                    <>
                      <Save className="size-4" />
                      Save & Update Profile
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              TAB 2: AI PLACEMENT REVIEW & BENCHMARKS
             ══════════════════════════════════════════════════════════ */}
          {activeTab === "review" && (
            <div className="space-y-6">
              {!review ? (
                <EmptyReviewState
                  onRunReview={handleRunFullReview}
                  isStarting={isRunningReview}
                  hasResume={!!resumeFileName}
                />
              ) : (
                <div className="space-y-6">
                  {/* Overall Readiness Scorecard */}
                  <Card className="border-border shadow-xs bg-gradient-to-br from-card to-muted/20">
                    <CardContent className="p-6">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-center gap-5">
                          <div className="flex size-20 shrink-0 flex-col items-center justify-center rounded-2xl border border-border bg-background shadow-xs">
                            <span className="text-2xl font-black tracking-tight text-foreground">
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
                                  <Sparkles className="size-3" />
                                )}
                                {tier}
                              </span>
                            </div>

                            <p className="text-xs text-muted-foreground">
                              Target Role:{" "}
                              <span className="font-semibold text-foreground">
                                {targetRole}
                              </span>
                              {review && (
                                <>
                                  {" "}· Audited {new Date(review.createdAt).toLocaleDateString()}
                                </>
                              )}
                            </p>
                          </div>
                        </div>

                        {/* Sub-score Badges */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                          <div className="rounded-lg border border-border bg-background/80 p-2.5 shadow-2xs">
                            <div className="text-xs font-bold text-foreground">
                              {readinessScore?.resumeScore ?? review.resumeCheck?.score ?? 0}
                            </div>
                            <div className="text-[10px] text-muted-foreground uppercase font-medium">
                              Resume ATS
                            </div>
                          </div>
                          <div className="rounded-lg border border-border bg-background/80 p-2.5 shadow-2xs">
                            <div className="text-xs font-bold text-foreground">
                              {readinessScore?.githubScore ?? review.codebaseCheck?.score ?? 0}
                            </div>
                            <div className="text-[10px] text-muted-foreground uppercase font-medium">
                              GitHub
                            </div>
                          </div>
                          <div className="rounded-lg border border-border bg-background/80 p-2.5 shadow-2xs">
                            <div className="text-xs font-bold text-foreground">
                              {readinessScore?.projectsScore ?? review.liveLinkCheck?.score ?? 0}
                            </div>
                            <div className="text-[10px] text-muted-foreground uppercase font-medium">
                              Projects
                            </div>
                          </div>
                          <div className="rounded-lg border border-border bg-background/80 p-2.5 shadow-2xs">
                            <div className="text-xs font-bold text-foreground">
                              {readinessScore?.linkedinScore ?? review.linkedinCheck?.score ?? 0}
                            </div>
                            <div className="text-[10px] text-muted-foreground uppercase font-medium">
                              LinkedIn
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Resume Audit Card */}
                  {review.resumeCheck && (
                    <ResumeAuditCard data={review.resumeCheck} />
                  )}

                  {/* Codebase Audit Card */}
                  {review.codebaseCheck && (
                    <CodebaseAuditCard data={review.codebaseCheck} />
                  )}

                  {/* Live Deployment Links */}
                  {review.liveLinkCheck && (
                    <LiveLinksCard data={review.liveLinkCheck} />
                  )}

                  {/* Bullet Point Rewrites */}
                  <RewritesCard
                    resumeRewrites={review.resumeCheck?.rewrites || []}
                    linkedinData={
                      review.linkedinCheck || {
                        score: 0,
                        checks: [],
                        suggestedHeadline: "",
                        suggestedAbout: "",
                        keyImprovements: [],
                      }
                    }
                  />

                  {/* Navigation Footer */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl border border-border bg-card shadow-xs">
                    <button
                      type="button"
                      onClick={() => setActiveTab("profile")}
                      className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    >
                      &larr; Back to Profile Editor
                    </button>

                    <Link href="/dashboard">
                      <Button className="gap-2">
                        <span>Go to Mock Interview</span>
                        <ArrowRight className="size-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ProfileIntakePage() {
  return (
    <Suspense fallback={<ProfileIntakeSkeleton />}>
      <ProfileIntakeMain />
    </Suspense>
  );
}
