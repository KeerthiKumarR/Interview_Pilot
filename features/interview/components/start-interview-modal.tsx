"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { SUPPORTED_LANGUAGES } from "@/types";
import {
  Loader2,
  Check,
  Sparkles,
  AlertCircle,
  Code2,
  UserCheck,
  ChevronDown,
  ChevronUp,
  Globe,
  Briefcase,
} from "lucide-react";
import { useNavigationLoading } from "@/components/navigation-loading-provider";
import { Badge } from "@/components/ui/badge";
import { readCache, writeCache } from "@/lib/client-cache";

interface StartInterviewModalProps {
  onClose: () => void;
}

interface RoleOption {
  id: string;
  title: string;
  department: string | null;
  level: string | null;
  targetSkills: string | null;
  isDefault: boolean;
  questionCount: number;
}

interface StudentProjectSummary {
  id: string;
  title: string;
  description?: string | null;
  liveUrl?: string | null;
  repoUrl?: string | null;
  techStack?: any;
}

interface StudentProfileSummary {
  id: string;
  targetRole?: string | null;
  resumeFileName?: string | null;
  projects?: StudentProjectSummary[];
  skills?: string[];
  readinessScore?: {
    overallScore?: number;
    tier?: string;
  } | null;
}

const INTERVIEW_TRACKS = [
  {
    id: "technical",
    title: "Technical & Project Viva",
    tagline: "Recommended for Placement",
    description: "Probes your live project architecture, state management, API design, and system trade-offs.",
    icon: Code2,
    style: "standard",
  },
  {
    id: "behavioral",
    title: "HR & Situational Fit",
    tagline: "STAR Method",
    description: "Evaluates teamwork, hackathon leadership, communication, and real-world engineering mindset.",
    icon: UserCheck,
    style: "service",
  },
] as const;

const DURATION_OPTIONS = [
  { value: 15, label: "15 Mins", badge: "Standard Viva" },
  { value: 20, label: "20 Mins", badge: "In-Depth" },
] as const;

const DIFFICULTY_OPTIONS = [
  { value: "medium", label: "Campus Placement", hint: "Standard" },
  { value: "easy", label: "Entry-Level", hint: "Fresher" },
  { value: "hard", label: "Top-Tier", hint: "FAANG / Startup" },
] as const;

/**
 * High-Confidence, Zero-Friction Placement Viva Launchpad.
 * Automatically anchors the viva to the student's target role, verified resume,
 * and live project demo without forcing redundant developer configuration.
 */
export function StartInterviewModal({ onClose }: StartInterviewModalProps) {
  const router = useRouter();
  const { startNavigation } = useNavigationLoading();

  // Core setup states
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [studentProfile, setStudentProfile] = useState<StudentProfileSummary | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedTrack, setSelectedTrack] = useState<"technical" | "behavioral">("technical");
  const [duration, setDuration] = useState<number>(15);
  const [difficulty, setDifficulty] = useState<string>("medium");
  const [language, setLanguage] = useState<string>("javascript");

  // Optional language override toggle
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch available roles and student profile in parallel (with 0ms cache hydration)
  useEffect(() => {
    let ignore = false;

    // Fast synchronous cache read: eliminates waiting for network when cached
    const cachedRoles = readCache<{ roles: RoleOption[] }>("/api/roles");
    const cachedProfile = readCache<{ profile: StudentProfileSummary }>("/api/profile");

    if (cachedRoles?.roles && cachedRoles.roles.length > 0) {
      setRoles(cachedRoles.roles);
    }

    if (cachedProfile?.profile) {
      const profileData = cachedProfile.profile;
      setStudentProfile(profileData);
      if (profileData.projects && profileData.projects.length > 0) {
        setSelectedProjectId(profileData.projects[0].id);
      }
    }

    async function loadInitialData() {
      try {
        const [rolesRes, profileRes] = await Promise.all([
          fetch("/api/roles"),
          fetch("/api/profile"),
        ]);

        if (rolesRes.ok) {
          const data = await rolesRes.json();
          writeCache("/api/roles", data);
          if (!ignore) setRoles(data.roles || []);
        }

        if (profileRes.ok) {
          const data = await profileRes.json();
          writeCache("/api/profile", data);
          if (!ignore && data.profile) {
            const profileData: StudentProfileSummary = data.profile;
            setStudentProfile(profileData);

            if (profileData.projects && profileData.projects.length > 0) {
              setSelectedProjectId(profileData.projects[0].id);
            }

            // Auto-detect programming language from profile tech stack
            const rawSkills = Array.isArray(profileData.skills)
              ? (profileData.skills as string[]).map((s) => s.toLowerCase())
              : [];

            if (
              rawSkills.some(
                (s) =>
                  s.includes("python") ||
                  s.includes("django") ||
                  s.includes("fastapi") ||
                  s.includes("flask")
              )
            ) {
              setLanguage("python");
            } else if (rawSkills.some((s) => s.includes("typescript"))) {
              setLanguage("typescript");
            } else if (
              rawSkills.some(
                (s) =>
                  s.includes("react") ||
                  s.includes("node") ||
                  s.includes("express") ||
                  s.includes("javascript") ||
                  s.includes("mongo") ||
                  s.includes("next")
              )
            ) {
              setLanguage("javascript");
            } else if (rawSkills.some((s) => s.includes("java") && !s.includes("javascript"))) {
              setLanguage("java");
            } else if (rawSkills.some((s) => s.includes("c++") || s.includes("cpp"))) {
              setLanguage("cpp");
            } else if (rawSkills.some((s) => s.includes("go") || s.includes("golang"))) {
              setLanguage("go");
            } else {
              setLanguage("javascript");
            }
          }
        }
      } catch (e) {
        console.warn("Could not fetch interview config data", e);
      }
    }

    loadInitialData();
    return () => {
      ignore = true;
    };
  }, []);

  // Close on Escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isLoading) onClose();
    },
    [onClose, isLoading]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  async function handleStart() {
    setIsLoading(true);
    setError(null);

    try {
      // Find suitable role if available in DB
      let roleIdToUse: string | undefined = undefined;
      if (selectedTrack === "behavioral") {
        const hrRole = roles.find((r) => r.title.toLowerCase().includes("hr"));
        roleIdToUse = hrRole?.id;
      } else {
        const techRole =
          roles.find((r) => !r.title.toLowerCase().includes("hr") && r.isDefault) ||
          roles.find((r) => !r.title.toLowerCase().includes("hr"));
        roleIdToUse = techRole?.id;
      }

      const activeTrack =
        INTERVIEW_TRACKS.find((t) => t.id === selectedTrack) || INTERVIEW_TRACKS[0];

      const response = await fetch("/api/interviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language,
          difficulty,
          style: activeTrack.style,
          duration,
          jobRoleId: roleIdToUse || undefined,
          personalizeWithProfile: true, // Always automatically anchored to verified profile
          provider: "hosted", // Fast high-throughput cloud inference (Groq)
          projectId: selectedProjectId || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create interview session");
      }

      const data = await response.json();
      const targetUrl = `/interview/${data.interview.id}`;
      startNavigation(targetUrl);
      router.push(targetUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong creating interview");
      setIsLoading(false);
    }
  }

  const primaryProject =
    studentProfile?.projects?.find((p) => p.id === selectedProjectId) ||
    studentProfile?.projects?.[0];
  const detectedSkills = Array.isArray(studentProfile?.skills)
    ? (studentProfile?.skills as string[])
    : [];
  const targetRole = studentProfile?.targetRole || "Full Stack Developer";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-border/80 bg-card p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-border/60">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold tracking-tight text-foreground">
                Placement Viva Session
              </h2>
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-500">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live AI
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              15–20 minute structured evaluation anchored to your verified profile.
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground cursor-pointer"
            aria-label="Close modal"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-4">
          {/* Section: Profile Anchor Hero Card */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex size-6 items-center justify-center rounded-md bg-primary/15 text-primary">
                  <Sparkles className="size-3.5" />
                </div>
                <span className="text-xs font-semibold text-foreground">
                  Interview Dossier Anchored
                </span>
              </div>
              <Badge variant="outline" className="text-[10px] py-0 h-4 border-primary/30 text-primary">
                100% Tailored
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
              <div className="rounded-lg bg-background/60 border border-border/50 p-2">
                <span className="text-[10px] font-medium text-muted-foreground block uppercase tracking-wider">
                  Target Role
                </span>
                <span className="font-semibold text-foreground truncate block mt-0.5">
                  {targetRole}
                </span>
              </div>

              <div className="rounded-lg bg-background/60 border border-border/50 p-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-medium text-muted-foreground block uppercase tracking-wider">
                    Featured Project
                  </span>
                  {studentProfile?.projects && studentProfile.projects.length > 1 && (
                    <span className="text-[9px] font-semibold text-primary">
                      {studentProfile.projects.length} Projects Available
                    </span>
                  )}
                </div>
                {studentProfile?.projects && studentProfile.projects.length > 1 ? (
                  <div className="mt-1">
                    <select
                      value={selectedProjectId || studentProfile.projects[0].id}
                      onChange={(e) => {
                        const pId = e.target.value;
                        setSelectedProjectId(pId);
                        const proj = studentProfile.projects?.find((p) => p.id === pId);
                        if (proj) {
                          const stack = Array.isArray(proj.techStack)
                            ? proj.techStack.map((s: string) => s.toLowerCase())
                            : [];
                          if (
                            stack.some(
                              (s: string) =>
                                s.includes("python") ||
                                s.includes("django") ||
                                s.includes("fastapi") ||
                                s.includes("flask")
                            )
                          ) {
                            setLanguage("python");
                          } else if (stack.some((s: string) => s.includes("typescript"))) {
                            setLanguage("typescript");
                          } else if (stack.some((s: string) => s.includes("java") && !s.includes("javascript"))) {
                            setLanguage("java");
                          } else if (stack.some((s: string) => s.includes("c++") || s.includes("cpp"))) {
                            setLanguage("cpp");
                          } else if (stack.some((s: string) => s.includes("go") || s.includes("golang"))) {
                            setLanguage("go");
                          } else if (
                            stack.some(
                              (s: string) =>
                                s.includes("react") ||
                                s.includes("node") ||
                                s.includes("express") ||
                                s.includes("next")
                            )
                          ) {
                            setLanguage("javascript");
                          }
                        }
                      }}
                      className="w-full bg-card text-foreground text-xs font-semibold rounded-md border border-border/80 px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer truncate"
                      aria-label="Select Focus Project for Viva"
                    >
                      {studentProfile.projects.map((p) => (
                        <option key={p.id} value={p.id} className="bg-card text-foreground">
                          {p.title} {Array.isArray(p.techStack) && p.techStack.length > 0 ? `(${p.techStack.slice(0, 3).join(", ")})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="font-semibold text-foreground truncate">
                      {primaryProject?.title || "Portfolio Project"}
                    </span>
                    {primaryProject?.liveUrl && (
                      <span className="inline-flex items-center gap-0.5 text-[9px] text-emerald-500 font-medium shrink-0">
                        <Globe className="size-2.5" />
                        Live
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {detectedSkills.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                <span className="text-[10px] text-muted-foreground">Probed Stack:</span>
                {detectedSkills.slice(0, 5).map((skill, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center rounded bg-secondary/80 px-1.5 py-0.5 text-[10px] font-medium text-secondary-foreground"
                  >
                    {skill}
                  </span>
                ))}
                {detectedSkills.length > 5 && (
                  <span className="text-[10px] text-muted-foreground">
                    +{detectedSkills.length - 5} more
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Section: Select Interview Track */}
          <fieldset>
            <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Briefcase className="size-3.5 text-primary" />
              <span>Interview Round Track</span>
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {INTERVIEW_TRACKS.map((track) => {
                const isSelected = selectedTrack === track.id;
                const IconComponent = track.icon;
                return (
                  <button
                    key={track.id}
                    type="button"
                    disabled={isLoading}
                    onClick={() => setSelectedTrack(track.id)}
                    className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                      isLoading ? "pointer-events-none opacity-60" : "cursor-pointer"
                    } ${
                      isSelected
                        ? "border-primary bg-primary/10 ring-1 ring-primary shadow-xs"
                        : "border-border hover:border-foreground/30 bg-card hover:bg-muted/30"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <IconComponent
                          className={`size-4 ${
                            isSelected ? "text-primary" : "text-muted-foreground"
                          }`}
                        />
                        <span
                          className={`text-xs font-bold leading-tight ${
                            isSelected ? "text-primary" : "text-foreground"
                          }`}
                        >
                          {track.title}
                        </span>
                      </div>
                      {isSelected && (
                        <Check className="size-3.5 text-primary shrink-0 ml-1" />
                      )}
                    </div>
                    <span className="mt-1 text-[10px] font-semibold text-primary/80">
                      {track.tagline}
                    </span>
                    <p className="mt-1 text-[11px] text-muted-foreground leading-snug">
                      {track.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </fieldset>

          {/* Section: Duration & Difficulty (Compact side-by-side) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Duration */}
            <fieldset>
              <legend className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Session Duration
              </legend>
              <div className="grid grid-cols-2 gap-1.5">
                {DURATION_OPTIONS.map((dur) => (
                  <button
                    key={dur.value}
                    type="button"
                    disabled={isLoading}
                    onClick={() => setDuration(dur.value)}
                    className={`flex flex-col items-center justify-center py-2 px-2 rounded-lg border text-xs font-semibold transition-all ${
                      isLoading ? "pointer-events-none opacity-60" : "cursor-pointer"
                    } ${
                      duration === dur.value
                        ? "border-primary bg-primary text-primary-foreground shadow-xs"
                        : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground bg-card"
                    }`}
                  >
                    <span>{dur.label}</span>
                    <span
                      className={`text-[9px] font-normal ${
                        duration === dur.value
                          ? "text-primary-foreground/80"
                          : "text-muted-foreground"
                      }`}
                    >
                      {dur.badge}
                    </span>
                  </button>
                ))}
              </div>
            </fieldset>

            {/* Difficulty */}
            <fieldset>
              <legend className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Evaluation Rigor
              </legend>
              <div className="grid grid-cols-3 gap-1.5">
                {DIFFICULTY_OPTIONS.map((diff) => (
                  <button
                    key={diff.value}
                    type="button"
                    disabled={isLoading}
                    onClick={() => setDifficulty(diff.value)}
                    className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg border text-xs font-semibold transition-all ${
                      isLoading ? "pointer-events-none opacity-60" : "cursor-pointer"
                    } ${
                      difficulty === diff.value
                        ? "border-primary bg-primary text-primary-foreground shadow-xs"
                        : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground bg-card"
                    }`}
                  >
                    <span className="truncate">{diff.hint}</span>
                    <span
                      className={`text-[9px] font-normal capitalize ${
                        difficulty === diff.value
                          ? "text-primary-foreground/80"
                          : "text-muted-foreground"
                      }`}
                    >
                      {diff.value}
                    </span>
                  </button>
                ))}
              </div>
            </fieldset>
          </div>

          {/* Section: Auto-detected Language & Change Language toggle */}
          <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/30 border border-border/50 text-[11px] text-muted-foreground">
            <div className="flex items-center gap-1.5 truncate">
              <Code2 className="size-3.5 text-primary shrink-0" />
              <span>
                Coding Language:{" "}
                <strong className="text-foreground capitalize">{language}</strong>{" "}
                <span className="text-[10px] text-muted-foreground/80">
                  (auto-detected from stack)
                </span>
              </span>
            </div>

            <button
              type="button"
              onClick={() => setShowLanguagePicker(!showLanguagePicker)}
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline cursor-pointer ml-2 shrink-0"
            >
              <span>{showLanguagePicker ? "Close" : "Change Language"}</span>
              {showLanguagePicker ? (
                <ChevronUp className="size-3" />
              ) : (
                <ChevronDown className="size-3" />
              )}
            </button>
          </div>

          {/* Section: Collapsible Language Override (Clean, simple, no Ollama jargon) */}
          {showLanguagePicker && (
            <div className="rounded-xl border border-border bg-muted/20 p-3 animate-in fade-in-50 duration-200">
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Select Interview Coding Language
              </span>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <button
                    key={lang.id}
                    type="button"
                    disabled={isLoading}
                    onClick={() => {
                      setLanguage(lang.id);
                      setShowLanguagePicker(false);
                    }}
                    className={`flex h-8 items-center justify-center rounded-md border text-xs font-medium transition-colors cursor-pointer ${
                      language === lang.id
                        ? "border-primary bg-primary text-primary-foreground font-semibold shadow-xs"
                        : "border-border bg-card text-muted-foreground hover:text-foreground hover:border-foreground/30"
                    }`}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Error Notification */}
        {error && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-2.5 text-xs text-destructive">
            <AlertCircle className="size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Actions */}
        <div className="mt-5 pt-4 border-t border-border/60 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="h-9 rounded-lg px-4 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground cursor-pointer disabled:opacity-40"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleStart}
            disabled={isLoading}
            className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-6 text-xs font-semibold text-primary-foreground transition-all hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer disabled:opacity-50 disabled:cursor-wait shadow-sm"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin shrink-0" />
                <span>Initializing Interviewer...</span>
              </>
            ) : (
              `Start ${duration}-Min Placement Viva 🚀`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
