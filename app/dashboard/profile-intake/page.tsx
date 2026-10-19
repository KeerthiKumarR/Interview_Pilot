"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
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
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { ResumeDropzone } from "@/features/profile/components/resume-dropzone";
import { SocialLinksForm } from "@/features/profile/components/social-links-form";
import { SkillsInput } from "@/features/profile/components/skills-input";
import { ProjectsSection } from "@/features/profile/components/projects-section";
import { AchievementsSection } from "@/features/profile/components/achievements-section";
import { ProfileIntakeSkeleton } from "@/features/profile/components/profile-intake-skeleton";
import {
  StudentProjectData,
  StudentAchievementData,
  SaveProfilePayload,
} from "@/types/profile";

export default function ProfileIntakePage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  // Profile Form States
  const [targetRole, setTargetRole] = useState("Full Stack Developer");
  const [resumeFileName, setResumeFileName] = useState<string | null>(null);
  const [resumeText, setResumeText] = useState<string | null>(null);
  const [resumePageCount, setResumePageCount] = useState<number | null>(null);

  const [githubUsername, setGithubUsername] = useState("");
  const [leetcodeUsername, setLeetcodeUsername] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [linkedinAbout, setLinkedinAbout] = useState("");

  const [skills, setSkills] = useState<string[]>([]);
  const [detectedSkillsPool, setDetectedSkillsPool] = useState<string[]>([]);

  const [projects, setProjects] = useState<StudentProjectData[]>([]);
  const [achievements, setAchievements] = useState<StudentAchievementData[]>([]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showChatAssistant, setShowChatAssistant] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  // Apply extracted data from Chat Intake Assistant (Module 1 specification)
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

  // Delete all stored profile data (Privacy compliance per Module 1 rule:
  // "The student can see, edit and delete everything stored about them")
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

      // Reset all local form state
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
      setLastSavedAt(null);
      toast.success("All stored profile data has been securely deleted.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete profile data.";
      toast.error(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  // 1. Fetch existing profile on mount
  useEffect(() => {
    let isMounted = true;
    async function fetchProfile() {
      try {
        const res = await fetch("/api/profile");
        if (!res.ok) {
          if (res.status === 401) {
            toast.error("Please sign in to access your profile.");
          }
          return;
        }
        const data = await res.json();
        if (isMounted && data.profile) {
          const p = data.profile;
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
          if (p.achievements && Array.isArray(p.achievements))
            setAchievements(p.achievements);
          if (p.updatedAt) setLastSavedAt(new Date(p.updatedAt));
        }
      } catch (err) {
        console.error("Failed to load profile:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    fetchProfile();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Handle Resume Parsing Results
  const handleResumeParsed = useCallback(
    (parsed: {
      fileName: string;
      fileSize: number;
      pageCount: number;
      text: string;
      detectedSkills: string[];
      detectedLinks: {
        github?: string;
        linkedin?: string;
        leetcode?: string;
        others: string[];
      };
    }) => {
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
    },
    [githubUsername, leetcodeUsername, linkedinUrl]
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
      // Filter out added ones from pool
      setDetectedSkillsPool((prev) =>
        prev.filter(
          (ds) => !newSkills.some((s) => s.toLowerCase() === ds.toLowerCase())
        )
      );
      toast.success(
        `Added ${newSkills.length} skill${newSkills.length > 1 ? "s" : ""}.`
      );
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

  // 3. Validation before submission
  const validateForm = (): boolean => {
    const errs: Record<string, string> = {};

    if (!targetRole.trim()) {
      errs.targetRole = "Please specify your target role.";
    }

    if (linkedinUrl && !linkedinUrl.startsWith("http")) {
      errs.linkedinUrl = "LinkedIn link must start with https://";
    }

    // Check project titles
    for (let i = 0; i < projects.length; i++) {
      if (!projects[i].title.trim()) {
        errs[`project_${i}`] = `Project #${i + 1} requires a title.`;
        toast.error(`Project #${i + 1} must have a title.`);
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // 4. Save Profile Action (calls POST /api/profile/save)
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
      toast.success(
        "Profile saved! Your AI interview questions will be customized to your stack."
      );
    } catch (err: unknown) {
      console.error("Save profile error:", err);
      const msg = err instanceof Error ? err.message : "Failed to save profile. Please try again.";
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center justify-between pb-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          Back to Dashboard
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
        <div className="space-y-8">
          {/* Header Title & Pitch */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">
                  Profile Intake Hub
                </h1>
                <span className="inline-flex items-center gap-1 rounded-md border border-primary/20 bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                  <Sparkles className="size-3" />
                  Module 1: Intake
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Talk to the AI assistant or upload your documents. The copilot extracts your
                skills, projects, and handles to customize your mock interview and calculate your readiness score.
              </p>
            </div>

            <Button
              type="button"
              variant={showChatAssistant ? "default" : "outline"}
              size="sm"
              onClick={() => setShowChatAssistant(!showChatAssistant)}
              className="gap-1.5 shrink-0"
            >
              <Bot className="size-3.5" />
              {showChatAssistant ? "Hide Chat Assistant" : "Talk to AI Assistant"}
            </Button>
          </div>

          {/* Module 1: Conversational Chat Intake Assistant */}
          {showChatAssistant && (
            <ChatIntakeAssistant onApplyExtracted={handleApplyExtracted} />
          )}

          {/* Section 1: Resume Upload */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileCheck2 className="size-4 text-primary" />
                1. Resume Intake & Auto-Parser
              </CardTitle>
              <CardDescription>
                Drop your PDF resume for instant client parsing and automated skill
                extraction.
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

          {/* Section 2: Role & Social Coding Handles */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <UserCheck className="size-4 text-primary" />
                2. Target Role & Profiles
              </CardTitle>
              <CardDescription>
                Provide your target position and developer handles so the interviewer
                matches real industry rubrics.
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

          {/* Section 3: Technical Skills Cloud */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldCheck className="size-4 text-primary" />
                3. Technical Skills Cloud
              </CardTitle>
              <CardDescription>
                Languages, frameworks, databases, and DevOps tools you want tested.
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

          {/* Section 4: Highlighted Projects */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                4. Key Projects & System Architectures
              </CardTitle>
              <CardDescription>
                Your AI interviewer will refer to these projects during the live
                interview just like a senior engineering manager.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProjectsSection
                projects={projects}
                onChange={setProjects}
              />
            </CardContent>
          </Card>

          {/* Section 5: Achievements & Certifications */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                5. Achievements & Certifications
              </CardTitle>
              <CardDescription>
                Hackathon awards, cloud certifications, or competitive programming
                standings.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AchievementsSection
                achievements={achievements}
                onChange={setAchievements}
              />
            </CardContent>
          </Card>

          {/* Action Bar / Save */}
          <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-4 rounded-xl border border-border bg-card p-4 shadow-xs">
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="size-3.5" />
                Return to Dashboard
              </Link>

              <span className="text-border">|</span>

              <button
                type="button"
                onClick={handleDeleteProfile}
                disabled={isDeleting || isSaving}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-destructive hover:text-destructive/80 transition-colors cursor-pointer"
                title="Deletes all your stored profile data, projects, achievements, and review reports from the database"
              >
                <Trash2 className="size-3.5" />
                {isDeleting ? "Deleting Data..." : "Delete All Stored Data"}
              </button>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
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
                    Saving Profile...
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
        </div>
      )}
    </div>
  );
}
