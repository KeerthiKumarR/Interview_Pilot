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
  Volume2,
} from "lucide-react";
import { useNavigationLoading } from "@/components/navigation-loading-provider";
import { Badge } from "@/components/ui/badge";
import { readCache, writeCache } from "@/lib/client-cache";
import { useInterviewStore } from "@/features/interview/store/interview-store";
import { speakTestBackend, stopAllTTSAudio } from "@/hooks/use-tts";

const REGIONAL_SPOKEN_LANGUAGES = [
  { code: "en-IN", label: "English (India)", native: "Indic Accent" },
  { code: "hi-IN", label: "Hindi", native: "हिंदी" },
  { code: "kn-IN", label: "Kannada", native: "ಕನ್ನಡ" },
  { code: "ta-IN", label: "Tamil", native: "தமிழ்" },
  { code: "te-IN", label: "Telugu", native: "తెలుగు" },
  { code: "mr-IN", label: "Marathi", native: "मराठी" },
  { code: "bn-IN", label: "Bengali", native: "বাংলা" },
  { code: "ml-IN", label: "Malayalam", native: "മലയാളം" },
  { code: "gu-IN", label: "Gujarati", native: "ગુજરાતી" },
];

interface StartInterviewModalProps {
  onClose: () => void;
  initialJobRole?: string;
  initialCompany?: string;
  initialSkills?: string[];
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
    title: "Technical & Project Deep Dive",
    tagline: "Probes live code, architecture, and system trade-offs",
    badge: "Recommended",
    description: "Evaluates your live project architecture, state management, API design, and system trade-offs.",
    icon: Code2,
    style: "standard",
  },
  {
    id: "behavioral",
    title: "HR & Situational Fit",
    tagline: "Behavioral & cultural fit evaluation",
    badge: "STAR Method",
    description: "Evaluates teamwork, leadership, communication, and real-world engineering mindset.",
    icon: UserCheck,
    style: "service",
  },
] as const;

const DURATION_OPTIONS = [
  { value: 15, label: "15 Mins", badge: "Standard" },
  { value: 20, label: "20 Mins", badge: "In-Depth" },
] as const;

const DIFFICULTY_OPTIONS = [
  { value: "medium", label: "Standard", hint: "Medium" },
  { value: "easy", label: "Fresher", hint: "Easy" },
  { value: "hard", label: "FAANG", hint: "Hard" },
] as const;

export const EXAMINER_OPTIONS = [
  {
    id: "gnani_nalini",
    name: "Nalini",
    gender: "female",
    roleTitle: "Senior Staff Systems Architect",
    badge: "Female Examiner · Recommended",
    description: "Deep on distributed architecture, API contracts, and real-world system trade-offs.",
    sampleText: "Hi, I'm Nalini, and I'll be conducting your technical placement viva today.",
  },
  {
    id: "gnani_arun",
    name: "Arun",
    gender: "male",
    roleTitle: "Principal Engineering Lead",
    badge: "Male Examiner",
    description: "Incisive on code modularity, edge cases, caching, and production scaling.",
    sampleText: "Hi, I'm Arun, and I'll be conducting your technical placement viva today.",
  },
] as const;

/**
 * High-Confidence, Zero-Friction Placement Viva Launchpad.
 * Automatically anchors the viva to the student's target role, verified resume,
 * and live project demo without forcing redundant developer configuration.
 */
export function StartInterviewModal({
  onClose,
  initialJobRole,
  initialCompany,
  initialSkills,
}: StartInterviewModalProps) {
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

  // Examiner Voice & Persona selection
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("interview_pilot_voice_id");
      if (saved) return saved;
    }
    return useInterviewStore.getState().selectedVoiceId || "gnani_nalini";
  });
  const [previewingVoiceId, setPreviewingVoiceId] = useState<string | null>(null);

  const handlePreviewVoice = async (voiceId: string, sampleText: string) => {
    try {
      if (previewingVoiceId) {
        stopAllTTSAudio();
        setPreviewingVoiceId(null);
        return;
      }
      setPreviewingVoiceId(voiceId);
      await speakTestBackend(
        sampleText,
        voiceId,
        "preview",
        () => setPreviewingVoiceId(null),
        () => setPreviewingVoiceId(null),
        "en-IN"
      );
    } catch {
      setPreviewingVoiceId(null);
    }
  };

  // Optional language override toggle
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const [spokenLanguage, setSpokenLanguage] = useState<string>(() => {
    return (typeof window !== "undefined" && localStorage.getItem("interview_pilot_stt_lang")) || "en-IN";
  });
  const [showSpokenPicker, setShowSpokenPicker] = useState(false);

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
          targetRole: initialJobRole || undefined,
          company: initialCompany || undefined,
          voiceId: selectedVoiceId,
          spokenLanguage,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create interview session");
      }

      const data = await response.json();
      useInterviewStore.getState().setSttLanguage(spokenLanguage);
      useInterviewStore.getState().setSelectedVoiceId(selectedVoiceId);
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("interview_pilot_stt_lang", spokenLanguage);
          localStorage.setItem("interview_pilot_voice_id", selectedVoiceId);
        } catch {}
      }
      const targetUrl = `/interview/${data.interview.id}?lang=${encodeURIComponent(spokenLanguage)}&voice=${encodeURIComponent(selectedVoiceId)}`;
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
  const targetRole = initialJobRole
    ? (initialCompany ? `${initialJobRole} (${initialCompany})` : initialJobRole)
    : (studentProfile?.targetRole || "Full Stack Developer");

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Soft ambient backdrop — keeps dashboard softly visible */}
      <div
        className="absolute inset-0 bg-black/35 dark:bg-black/65 backdrop-blur-[2px] transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden
      />

      {/* Slide-over Studio Drawer Panel (Modern engineering console) */}
      <div className="fixed inset-y-0 right-0 max-w-full flex">
        <div className="w-screen max-w-md sm:max-w-lg bg-card border-l-2 border-border neo-shadow flex flex-col h-full animate-in slide-in-from-right duration-300 relative shadow-2xl">
          {/* Top Google Tech 4-Color Stripe */}
          <div className="h-1.5 w-full grid grid-cols-4 shrink-0 border-b border-border/80">
            <div className="bg-[#4285F4]"></div>
            <div className="bg-[#EA4335]"></div>
            <div className="bg-[#FBBC05]"></div>
            <div className="bg-[#34A853]"></div>
          </div>

          {/* Drawer Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b-2 border-border/80 bg-card shrink-0">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight text-foreground">
                  Viva Launch Studio
                </h2>
                <span className="bg-[#FF4D4D] text-white px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider shadow-xs border border-[#FF4D4D]">
                  Live Setup
                </span>
              </div>
              <p className="text-xs text-muted-foreground font-medium mt-0.5">
                Configure your tailored mock interview session.
              </p>
            </div>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground cursor-pointer"
              aria-label="Close studio"
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

          {/* Scrollable Configuration Body */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {/* Section: Profile & Focus Hero Card */}
          <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-4 space-y-3 neo-shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground font-black text-xs">
                  <Sparkles className="size-3.5" />
                </div>
                <span className="text-xs font-black text-foreground uppercase tracking-wider">
                  Profile &amp; Focus
                </span>
              </div>
              <Badge variant="outline" className="text-[10px] py-0.5 h-auto border-primary/40 text-primary font-bold bg-primary/10">
                Personalized
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
              <div className="rounded-lg bg-background/80 border border-border/80 p-2.5">
                <span className="text-[10px] font-bold text-muted-foreground block uppercase tracking-wider">
                  Target Role
                </span>
                <span className="font-bold text-foreground truncate block mt-0.5">
                  {targetRole}
                </span>
              </div>

              <div className="rounded-lg bg-background/80 border border-border/80 p-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-muted-foreground block uppercase tracking-wider">
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
          </div>

          {/* Section: Select Interview Track */}
          <fieldset>
            <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Briefcase className="size-3.5 text-primary" />
              <span>Interview Track</span>
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
                    className={`flex flex-col items-start p-3.5 rounded-xl border-2 text-left transition-all ${
                      isLoading ? "pointer-events-none opacity-60" : "cursor-pointer"
                    } ${
                      isSelected
                        ? "border-primary bg-primary/10 ring-1 ring-primary shadow-xs"
                        : "border-border hover:border-foreground/30 bg-card hover:bg-muted/30"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${
                        isSelected ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                      }`}>
                        {track.badge}
                      </span>
                      {isSelected && (
                        <Check className="size-3.5 text-primary shrink-0 ml-1" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <IconComponent
                        className={`size-4 shrink-0 ${
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
                    <p className="mt-1.5 text-[11px] text-muted-foreground leading-snug">
                      {track.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </fieldset>

          {/* Section: Select AI Examiner Persona (Male / Female) */}
          <fieldset>
            <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between w-full">
              <div className="flex items-center gap-1.5">
                <UserCheck className="size-3.5 text-primary" />
                <span>Examiner Persona (Gender &amp; Voice)</span>
              </div>
              <span className="text-[10px] text-muted-foreground font-normal">Choose Male or Female</span>
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {EXAMINER_OPTIONS.map((examiner) => {
                const isSelected = selectedVoiceId === examiner.id;
                const isPreviewing = previewingVoiceId === examiner.id;
                return (
                  <div
                    key={examiner.id}
                    onClick={() => {
                      setSelectedVoiceId(examiner.id);
                      useInterviewStore.getState().setSelectedVoiceId(examiner.id);
                      if (typeof window !== "undefined") {
                        try {
                          localStorage.setItem("interview_pilot_voice_id", examiner.id);
                        } catch {}
                      }
                    }}
                    className={`flex flex-col justify-between p-3.5 rounded-xl border-2 text-left transition-all cursor-pointer ${
                      isSelected
                        ? "border-primary bg-primary/10 ring-1 ring-primary shadow-xs"
                        : "border-border hover:border-foreground/30 bg-card hover:bg-muted/30"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between w-full">
                        <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${
                          isSelected ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                        }`}>
                          {examiner.badge}
                        </span>
                        {isSelected && (
                          <Check className="size-3.5 text-primary shrink-0 ml-1" />
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-2">
                        <div className={`size-7 rounded-full flex items-center justify-center font-bold text-xs ${
                          examiner.gender === "female"
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                            : "bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30"
                        }`}>
                          {examiner.name[0]}
                        </div>
                        <div>
                          <h4 className={`text-xs font-bold leading-tight ${
                            isSelected ? "text-primary" : "text-foreground"
                          }`}>
                            {examiner.name}
                          </h4>
                          <p className="text-[10px] text-muted-foreground leading-none mt-0.5">
                            {examiner.roleTitle}
                          </p>
                        </div>
                      </div>

                      <p className="mt-2 text-[11px] text-muted-foreground leading-snug">
                        {examiner.description}
                      </p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-border/50 flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground font-medium">Gnani Timbre</span>
                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePreviewVoice(examiner.id, examiner.sampleText);
                        }}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline cursor-pointer"
                      >
                        <Volume2 className={`size-3 ${isPreviewing ? "animate-pulse text-emerald-500" : ""}`} />
                        <span>{isPreviewing ? "Playing..." : "Hear Sample"}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </fieldset>

          {/* Section: Duration & Difficulty (Compact side-by-side) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Duration */}
            <fieldset>
              <legend className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Duration
              </legend>
              <div className="grid grid-cols-2 gap-1.5">
                {DURATION_OPTIONS.map((dur) => (
                  <button
                    key={dur.value}
                    type="button"
                    disabled={isLoading}
                    onClick={() => setDuration(dur.value)}
                    className={`flex flex-col items-center justify-center py-2 px-1.5 rounded-lg border text-xs font-semibold transition-all min-w-0 w-full overflow-hidden ${
                      isLoading ? "pointer-events-none opacity-60" : "cursor-pointer"
                    } ${
                      duration === dur.value
                        ? "border-primary bg-primary text-primary-foreground shadow-xs font-bold"
                        : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground bg-card"
                    }`}
                  >
                    <span className="truncate w-full text-center font-bold">{dur.label}</span>
                    <span
                      className={`text-[9px] font-normal truncate w-full text-center ${
                        duration === dur.value
                          ? "text-primary-foreground/80 font-medium"
                          : "text-muted-foreground"
                      }`}
                    >
                      {dur.badge}
                    </span>
                  </button>
                ))}
              </div>
            </fieldset>

            {/* Difficulty Level */}
            <fieldset>
              <legend className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Difficulty Level
              </legend>
              <div className="grid grid-cols-3 gap-1.5">
                {DIFFICULTY_OPTIONS.map((diff) => (
                  <button
                    key={diff.value}
                    type="button"
                    disabled={isLoading}
                    onClick={() => setDifficulty(diff.value)}
                    className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg border text-xs font-semibold transition-all min-w-0 w-full overflow-hidden ${
                      isLoading ? "pointer-events-none opacity-60" : "cursor-pointer"
                    } ${
                      difficulty === diff.value
                        ? "border-primary bg-primary text-primary-foreground shadow-xs font-bold"
                        : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground bg-card"
                    }`}
                  >
                    <span className="truncate w-full text-center px-0.5 font-bold">{diff.label}</span>
                    <span
                      className={`text-[9px] font-medium truncate w-full text-center ${
                        difficulty === diff.value
                          ? "text-primary-foreground/90 font-semibold"
                          : "text-muted-foreground"
                      }`}
                    >
                      {diff.hint}
                    </span>
                  </button>
                ))}
              </div>
            </fieldset>
          </div>

          {/* Section: Auto-detected Language & Change Language toggle */}
          <div className="flex items-center justify-between px-3.5 py-2.5 rounded-lg bg-muted/30 border border-border/80 text-[11px] text-muted-foreground">
            <div className="flex items-center gap-1.5 truncate">
              <Code2 className="size-3.5 text-primary shrink-0" />
              <span>
                Coding Language:{" "}
                <strong className="text-foreground capitalize">{language}</strong>{" "}
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                  (auto-anchored from repo stack)
                </span>
              </span>
            </div>

            <button
              type="button"
              onClick={() => setShowLanguagePicker(!showLanguagePicker)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline cursor-pointer ml-2 shrink-0"
            >
              <span>{showLanguagePicker ? "Close" : "Change Language"}</span>
              {showLanguagePicker ? (
                <ChevronUp className="size-3" />
              ) : (
                <ChevronDown className="size-3" />
              )}
            </button>
          </div>

          {/* Section: Collapsible Language Override */}
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

          {/* Section: Spoken Viva Language */}
          <div className="flex items-center justify-between px-3.5 py-2.5 rounded-lg bg-muted/30 border border-border/80 text-[11px] text-muted-foreground">
            <div className="flex items-center gap-1.5 truncate">
              <Globe className="size-3.5 text-primary shrink-0" />
              <span>
                Spoken Viva Language:{" "}
                <strong className="text-foreground">
                  {REGIONAL_SPOKEN_LANGUAGES.find((l) => l.code === spokenLanguage)?.label || "English (India)"}
                </strong>{" "}
                <span className="text-muted-foreground font-medium">
                  ({REGIONAL_SPOKEN_LANGUAGES.find((l) => l.code === spokenLanguage)?.native})
                </span>
              </span>
            </div>

            <button
              type="button"
              onClick={() => setShowSpokenPicker(!showSpokenPicker)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline cursor-pointer ml-2 shrink-0"
            >
              <span>{showSpokenPicker ? "Close" : "Change Spoken Language"}</span>
              {showSpokenPicker ? (
                <ChevronUp className="size-3" />
              ) : (
                <ChevronDown className="size-3" />
              )}
            </button>
          </div>

          {showSpokenPicker && (
            <div className="rounded-xl border border-border bg-muted/20 p-3 animate-in fade-in-50 duration-200">
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Select Spoken Language
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                {REGIONAL_SPOKEN_LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    type="button"
                    disabled={isLoading}
                    onClick={() => {
                      setSpokenLanguage(lang.code);
                      if (typeof window !== "undefined") {
                        try {
                          localStorage.setItem("interview_pilot_stt_lang", lang.code);
                        } catch {}
                      }
                      useInterviewStore.getState().setSttLanguage(lang.code);
                      setShowSpokenPicker(false);
                    }}
                    className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-md border text-xs transition-colors cursor-pointer ${
                      spokenLanguage === lang.code
                        ? "border-primary bg-primary text-primary-foreground font-semibold shadow-xs"
                        : "border-border bg-card text-muted-foreground hover:text-foreground hover:border-foreground/30"
                    }`}
                  >
                    <span className="font-medium truncate w-full text-center">{lang.label}</span>
                    <span className={`text-[10px] truncate w-full text-center ${spokenLanguage === lang.code ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                      {lang.native}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Error Notification */}
          {error && (
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-destructive/10 border-2 border-destructive/20 p-3 text-xs text-destructive font-medium">
              <AlertCircle className="size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Sticky Actions Footer */}
        <div className="px-6 py-4 border-t-2 border-border/80 bg-card/90 backdrop-blur-md flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="h-10 rounded-xl px-4 text-xs font-bold text-muted-foreground transition-colors hover:text-foreground cursor-pointer disabled:opacity-40"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleStart}
            disabled={isLoading}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-6 text-xs font-black text-primary-foreground border-2 border-primary/80 neo-shadow-sm transition-all hover:translate-x-0.5 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer disabled:opacity-50 disabled:cursor-wait"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin shrink-0" />
                <span>Starting Interview...</span>
              </>
            ) : (
              `Start Interview (${duration}m)`
            )}
          </button>
        </div>
      </div>
    </div>
  </div>
  );
}
