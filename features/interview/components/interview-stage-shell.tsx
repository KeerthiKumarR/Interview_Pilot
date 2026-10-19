"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { useInterviewStore } from "@/features/interview/store/interview-store";
import {
  MessageSquare,
  Clock,
  ArrowRight,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Layers,
  ChevronLeft,
  ChevronRight,
  Settings,
  PhoneOff,
  Maximize,
  Minimize,
  Maximize2,
  Info,
  Target,
  Send,
  X,
  Volume2,
  Network,
  Code2,
  Flag,
  Check,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export interface InterviewStageShellProps {
  interview?: {
    id: string;
    language: string;
    difficulty: string;
    duration: number;
    status: string;
    problemTitle: string;
    problemDescription: string;
    code: string;
    startedAt: number | null;
    jobRoleId?: string | null;
    jobRole?: {
      title?: string;
      level?: string;
      mode?: string;
    } | null;
  };
  currentStageNumber: number; // 1, 2, 3, 4
  stageCategory: "conversation" | "option_quiz" | "drawing" | "code_editor";
  cameraStream: MediaStream | null;
  onNextStage: () => void;
  onEndInterview: () => void;
  onSendMessage: (text: string) => void;
  onStopGeneration?: () => void;
  children: React.ReactNode;
}

export function InterviewStageShell({
  interview,
  currentStageNumber,
  stageCategory,
  cameraStream,
  onNextStage,
  onEndInterview,
  onSendMessage,
  children,
}: InterviewStageShellProps) {
  const { user } = useUser();
  const isMicMuted = useInterviewStore((s) => s.isMicMuted);
  const toggleMic = useInterviewStore((s) => s.toggleMic);
  const messages = useInterviewStore((s) => s.messages);
  const timeRemainingSeconds = useInterviewStore((s) => s.timeRemainingSeconds);
  const duration = useInterviewStore((s) => s.duration);
  const problemTitle = useInterviewStore((s) => s.problemTitle);

  // Active Tab in Right Sidebar: "conversation" | "info"
  const [activeTab, setActiveTab] = useState<"conversation" | "info">("conversation");

  // Local media & UI states
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPipExpanded, setIsPipExpanded] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  const [inputText, setInputText] = useState("");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  // Sync camera stream to PiP element
  useEffect(() => {
    if (videoRef.current && cameraStream) {
      videoRef.current.srcObject = isCameraOff ? null : cameraStream;
      videoRef.current.play().catch(() => {});
    }
  }, [cameraStream, isCameraOff]);

  // Auto-scroll chat on message change
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleToggleCamera = () => {
    if (cameraStream) {
      const tracks = cameraStream.getVideoTracks();
      tracks.forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsCameraOff((prev) => !prev);
    }
  };

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const handleSend = () => {
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText("");
  };

  const formatTimer = (secs: number) => {
    const mins = Math.floor(Math.max(0, secs) / 60);
    const rem = Math.max(0, secs) % 60;
    return `${mins.toString().padStart(2, "0")}:${rem.toString().padStart(2, "0")}`;
  };

  const formatMessageTime = (timestamp?: number) => {
    if (!timestamp) return "Just now";
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const questionsList = useInterviewStore((s) => s.questionsList);
  const currentQuestionIndex = useInterviewStore((s) => s.currentQuestionIndex);

  // Dynamic Stages Definition derived from job role questions (or fallback standard 4)
  const stages = useMemo(() => {
    if (questionsList && questionsList.length > 0) {
      return questionsList.map((q, idx) => {
        let fallbackLabel = "Stage";
        if (q.category === "option_quiz") fallbackLabel = "Quiz";
        else if (q.category === "drawing") fallbackLabel = "Architecture";
        else if (q.category === "code_editor") fallbackLabel = "Coding";
        else if (q.category === "conversation") fallbackLabel = "Intro";

        const cleanTitle = q.title ? q.title.replace(/^\d+[\.\:\-]\s*/, "").trim() : "";
        const label = cleanTitle && cleanTitle.length <= 16 ? cleanTitle : fallbackLabel;

        return {
          num: idx + 1,
          label,
          fullTitle: q.title || fallbackLabel,
          category: q.category || "conversation",
          rawQuestion: q,
        };
      });
    }

    return [
      { num: 1, label: "Intro", fullTitle: "Intro & Background", category: "conversation" },
      { num: 2, label: "Quiz", fullTitle: "Conceptual Quiz", category: "option_quiz" },
      { num: 3, label: "Architecture", fullTitle: "Architecture Whiteboard", category: "drawing" },
      { num: 4, label: "Coding", fullTitle: "Live Coding", category: "code_editor" },
    ];
  }, [questionsList]);

  // Authoritative active stage index (1-based)
  const activeStageNum = useMemo(() => {
    if (questionsList && questionsList.length > 0) {
      return Math.min(Math.max(1, currentQuestionIndex + 1), stages.length);
    }
    return currentStageNumber;
  }, [questionsList, currentQuestionIndex, currentStageNumber, stages.length]);

  // Stepper Horizontal Scroll State
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const activeStepRef = useRef<HTMLDivElement | null>(null);

  const checkScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 6);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 6);
  }, []);

  useEffect(() => {
    checkScroll();
    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
  }, [stages, checkScroll]);

  // Auto-scroll active step into center of view
  useEffect(() => {
    if (activeStepRef.current) {
      activeStepRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
      const t = setTimeout(checkScroll, 350);
      return () => clearTimeout(t);
    }
  }, [activeStageNum, checkScroll]);

  // Dynamic Interview Focus checklist per stage
  const getFocusItems = () => {
    switch (stageCategory) {
      case "conversation":
        return [
          { title: "Introduction", state: "active" as const },
          { title: "Technical background", state: "pending" as const },
          { title: "Projects & experience", state: "pending" as const },
          { title: "Problem-solving approach", state: "pending" as const },
          { title: "Communication", state: "pending" as const },
        ];
      case "option_quiz":
        return [
          { title: "Introduction", state: "done" as const },
          { title: "Technical background", state: "active" as const },
          { title: "Projects & experience", state: "pending" as const },
          { title: "Problem-solving approach", state: "pending" as const },
          { title: "Communication", state: "pending" as const },
        ];
      case "drawing":
        return [
          { title: "Requirement clarification", state: "done" as const },
          { title: "System design approach", state: "done" as const },
          { title: "Component architecture", state: "active" as const },
          { title: "Scalability considerations", state: "pending" as const },
          { title: "Trade-offs discussion", state: "pending" as const },
        ];
      case "code_editor":
      default:
        return [
          { title: "Problem understanding", state: "done" as const },
          { title: "Approach explanation", state: "done" as const },
          { title: "Code implementation", state: "active" as const },
          { title: "Time & space complexity", state: "pending" as const },
          { title: "Edge cases handling", state: "pending" as const },
        ];
    }
  };

  // Dynamic Next Stage Card per stage
  const getNextStageCard = () => {
    const nextIndex = activeStageNum; // next stage (0-indexed) is activeStageNum
    if (nextIndex < stages.length) {
      const nextStage = stages[nextIndex];
      const icon =
        nextStage.category === "code_editor"
          ? Code2
          : nextStage.category === "drawing"
          ? Network
          : nextStage.category === "option_quiz"
          ? Layers
          : MessageSquare;

      const subtitle =
        nextStage.category === "code_editor"
          ? "Problem Solving & Implementation"
          : nextStage.category === "drawing"
          ? "System Design & Architecture"
          : nextStage.category === "option_quiz"
          ? "Conceptual & Knowledge Quiz"
          : "Discussion & Behavioral";

      return {
        icon,
        title: `Stage ${nextStage.num}: ${nextStage.label}`,
        subtitle,
        actionText: "Next Stage",
      };
    }

    return {
      icon: Flag,
      title: "Interview Complete",
      subtitle: "All stages finished",
      actionText: "Conclude",
    };
  };

  const nextStageInfo = getNextStageCard();
  const focusItems = getFocusItems();
  const candidateName = user?.fullName || user?.firstName || "Pravin Ghodake";
  const candidatePhoto = user?.imageUrl || null;

  return (
    <div className="flex h-screen w-screen flex-col bg-background text-foreground select-none overflow-hidden font-sans transition-colors duration-200">
      {/* ─── 1. TOP HEADER BAR ────────────────────────────────────────── */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-card/85 backdrop-blur-md px-6 z-30">
        {/* Left: AlgoPilot Logo + Role Title */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-foreground"
            >
              <path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3" />
            </svg>
            <span className="text-base font-bold tracking-tight text-foreground">AlgoPilot</span>
          </div>

          <div className="h-5 w-px bg-border mx-1" />

          <span className="text-sm font-medium text-muted-foreground">
            {interview?.jobRole?.title || "Technical Interview"}
          </span>
        </div>

        {/* Center: Stage Stepper (Compact size, exactly 3 steps visible at once, horizontal scroll if > 3) */}
        <div className="hidden md:flex items-center gap-1 max-w-[480px]">
          {/* Scroll Left Button (Visible when > 3 stages) */}
          {stages.length > 3 && (
            <button
              type="button"
              onClick={() => {
                scrollContainerRef.current?.scrollBy({ left: -90, behavior: "smooth" });
                setTimeout(checkScroll, 300);
              }}
              disabled={!canScrollLeft}
              className="p-1 mb-3 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary/70 transition disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed shrink-0"
              title="Previous steps"
              aria-label="Previous steps"
            >
              <ChevronLeft className="w-3 h-3" />
            </button>
          )}

          {/* Stepper Scroll Viewport: Exactly 3 steps visible simultaneously */}
          <div
            ref={scrollContainerRef}
            onScroll={checkScroll}
            className="flex items-center overflow-x-auto scroll-smooth scrollbar-none py-1"
            style={{
              maxWidth: stages.length > 3 ? "270px" : undefined,
            }}
          >
            {stages.map((stage, idx) => {
              const isCurrent = stage.num === activeStageNum;
              const isPast = stage.num < activeStageNum;

              return (
                <div
                  key={stage.num}
                  ref={isCurrent ? activeStepRef : null}
                  className="flex items-center shrink-0"
                  style={{ width: stages.length > 3 ? "90px" : undefined }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      const cur = useInterviewStore.getState();
                      const targetIndex = stage.num - 1;
                      cur.setCurrentQuestionIndex(targetIndex);
                      cur.setActiveCategory(stage.category as any);
                      if (cur.questionsList && cur.questionsList[targetIndex]) {
                        const q = cur.questionsList[targetIndex];
                        cur.setCurrentQuestion(q, targetIndex);
                        if (q.durationMinutes) {
                          cur.setCategoryTimeRemainingSeconds(q.durationMinutes * 60);
                        }
                      }
                    }}
                    className="flex flex-col items-center hover:opacity-90 transition cursor-pointer"
                    title={stage.fullTitle}
                  >
                    <div
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold transition-all ${
                        isCurrent
                          ? "bg-foreground text-background ring-2 ring-foreground/25 shadow-xs font-bold"
                          : isPast
                          ? "bg-primary/20 text-foreground border border-primary/40 font-medium"
                          : "border border-border text-muted-foreground/60 bg-transparent font-normal"
                      }`}
                    >
                      {isPast ? <Check className="w-3 h-3 stroke-[2.5]" /> : stage.num}
                    </div>
                    <span
                      className={`text-[10px] mt-0.5 font-medium truncate max-w-[62px] ${
                        isCurrent ? "text-foreground font-semibold" : "text-muted-foreground"
                      }`}
                    >
                      {stage.label}
                    </span>
                  </button>

                  {/* Connecting Line between steps */}
                  {idx < stages.length - 1 && (
                    <div
                      className={`h-[1px] ${
                        stages.length > 3 ? "flex-1 mx-1" : "w-8 sm:w-10 mx-1.5"
                      } mb-3 transition-colors ${
                        isPast ? "bg-primary/60" : "bg-border"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Scroll Right Button (Visible when > 3 stages) */}
          {stages.length > 3 && (
            <button
              type="button"
              onClick={() => {
                scrollContainerRef.current?.scrollBy({ left: 90, behavior: "smooth" });
                setTimeout(checkScroll, 300);
              }}
              disabled={!canScrollRight}
              className="p-1 mb-3 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary/70 transition disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed shrink-0"
              title="Next steps"
              aria-label="Next steps"
            >
              <ChevronRight className="w-3 h-3" />
            </button>
          )}

          {/* Step Count indicator */}
          <span className="ml-1.5 font-mono text-[10px] text-muted-foreground/70 mb-3 whitespace-nowrap shrink-0">
            {activeStageNum} / {stages.length}
          </span>
        </div>

        {/* Right: Status Pill + Timer + Theme Toggle + Settings + End Interview */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Connected Pill */}
          <div className="hidden sm:flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-3 py-1 text-xs text-foreground">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-medium">Connected</span>
          </div>

          {/* Clock Timer */}
          <div className="flex items-center gap-2 px-3 py-1 rounded-lg border border-border bg-secondary/50">
            <Clock
              className={`h-4 w-4 ${
                timeRemainingSeconds <= 60
                  ? "text-red-500 animate-pulse"
                  : timeRemainingSeconds <= 300
                  ? "text-amber-500"
                  : "text-muted-foreground"
              }`}
            />
            <div className="flex flex-col leading-none">
              <span
                className={`font-mono text-sm font-bold tracking-tight ${
                  timeRemainingSeconds <= 60
                    ? "text-red-500"
                    : timeRemainingSeconds <= 300
                    ? "text-amber-500"
                    : "text-foreground"
                }`}
              >
                {formatTimer(timeRemainingSeconds)}
              </span>
              <span className="text-[9px] text-muted-foreground mt-0.5">
                Total Time: {duration} min
              </span>
            </div>
          </div>

          {/* Global Theme Toggle */}
          <ThemeToggle />

          {/* Settings Button */}
          <button
            type="button"
            onClick={() => setShowSettingsModal(true)}
            aria-label="Interview Settings"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground transition cursor-pointer"
          >
            <Settings className="h-4 w-4" />
          </button>

          {/* End Interview Button */}
          <button
            type="button"
            onClick={() => setShowEndModal(true)}
            className="flex items-center gap-2 rounded-lg border border-border bg-secondary/50 px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-rose-500/15 hover:border-rose-500/30 hover:text-rose-600 dark:hover:text-rose-300 transition cursor-pointer shadow-xs"
          >
            <PhoneOff className="h-3.5 w-3.5" />
            <span>End Interview</span>
          </button>
        </div>
      </header>

      {/* ─── 2. MAIN WORKSPACE (LEFT STAGE + RIGHT SIDEBAR) ───────────── */}
      <main className="flex flex-1 overflow-hidden p-4 gap-4">
        {/* ─── LEFT COLUMN: WORKSPACE CONTENT + BOTTOM DOCK ───────────── */}
        <div className="flex flex-1 flex-col justify-between overflow-hidden relative">
          {/* Main Stage Content (Children Slot) */}
          <div className="relative flex flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
            {children}
          </div>

          {/* Bottom Row: Dock Control Bar + Embedded Candidate Camera */}
          <div className="mt-3 flex items-center justify-between gap-3 shrink-0">
            {/* Centered Controls Dock */}
            <div className="flex flex-1 items-center justify-center gap-6 sm:gap-10 rounded-xl border border-border bg-card py-2 px-6 shadow-xl h-20">
              {/* Mute Button */}
              <button
                type="button"
                onClick={toggleMic}
                className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition cursor-pointer"
              >
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-lg border transition ${
                    isMicMuted
                      ? "border-rose-500/40 bg-rose-500/20 text-rose-500 dark:text-rose-300"
                      : "border-border bg-secondary/50 hover:bg-secondary text-foreground"
                  }`}
                >
                  {isMicMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </div>
                <span className="text-[11px] font-medium">{isMicMuted ? "Unmute" : "Mute"}</span>
              </button>

              {/* Camera Button */}
              <button
                type="button"
                onClick={handleToggleCamera}
                className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition cursor-pointer"
              >
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-lg border transition ${
                    isCameraOff
                      ? "border-rose-500/40 bg-rose-500/20 text-rose-500 dark:text-rose-300"
                      : "border-border bg-secondary/50 hover:bg-secondary text-foreground"
                  }`}
                >
                  {isCameraOff ? <VideoOff className="h-4 w-4" /> : <Video className="h-4 w-4" />}
                </div>
                <span className="text-[11px] font-medium">Camera</span>
              </button>

              {/* Transcript Button */}
              <button
                type="button"
                onClick={() => setActiveTab("conversation")}
                className={`flex flex-col items-center gap-1 transition cursor-pointer ${
                  activeTab === "conversation" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-lg border transition ${
                    activeTab === "conversation"
                      ? "border-primary/50 bg-primary/15 text-primary"
                      : "border-border bg-secondary/50 hover:bg-secondary text-foreground"
                  }`}
                >
                  <MessageSquare className="h-4 w-4" />
                </div>
                <span className="text-[11px] font-medium">Transcript</span>
              </button>

              {/* Stage Info Button */}
              <button
                type="button"
                onClick={() => setActiveTab("info")}
                className={`flex flex-col items-center gap-1 transition cursor-pointer ${
                  activeTab === "info" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-lg border transition ${
                    activeTab === "info"
                      ? "border-primary/50 bg-primary/15 text-primary"
                      : "border-border bg-secondary/50 hover:bg-secondary text-foreground"
                  }`}
                >
                  <Info className="h-4 w-4" />
                </div>
                <span className="text-[11px] font-medium">Stage Info</span>
              </button>

              {/* Fullscreen Button */}
              <button
                type="button"
                onClick={handleToggleFullscreen}
                className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition cursor-pointer"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-secondary/50 hover:bg-secondary text-foreground">
                  {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
                </div>
                <span className="text-[11px] font-medium">Fullscreen</span>
              </button>
            </div>

            {/* Embedded Candidate Camera Preview */}
            <div
              className={`relative shrink-0 overflow-hidden rounded-xl border border-border bg-black/90 shadow-2xl transition-all duration-300 h-20 ${
                isPipExpanded ? "w-56 sm:w-64" : "w-36 sm:w-44"
              }`}
            >
              {/* Webcam Video Stream */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`h-full w-full object-cover scale-x-[-1] ${isCameraOff ? "hidden" : "block"}`}
              />

              {/* Camera Off Placeholder */}
              {isCameraOff && (
                <div className="flex h-full w-full flex-col items-center justify-center bg-[#151722] text-white/50">
                  <VideoOff className="h-5 w-5 mb-0.5 text-white/40" />
                  <span className="text-[10px]">Camera Muted</span>
                </div>
              )}

              {/* Bottom-Left Pill: "● YOU" */}
              <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1.5 rounded-full border border-white/15 bg-black/70 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-md">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span>You</span>
              </div>

              {/* Bottom-Right Toggle Size Button */}
              <button
                type="button"
                onClick={() => setIsPipExpanded(!isPipExpanded)}
                aria-label="Expand camera preview"
                className="absolute bottom-1.5 right-1.5 rounded-md bg-black/60 p-0.5 text-white/70 hover:bg-black/90 hover:text-white transition cursor-pointer"
              >
                <Maximize2 className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>

        {/* ─── RIGHT COLUMN: CONVERSATION TABS & NEXT STAGE ───────────── */}
        <aside className="flex w-80 sm:w-96 shrink-0 flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-2xl">
          {/* Top Tabs */}
          <div className="flex items-center border-b border-border pb-3">
            <button
              type="button"
              onClick={() => setActiveTab("conversation")}
              className={`flex flex-1 items-center justify-center gap-2 pb-1 text-xs font-semibold transition cursor-pointer relative ${
                activeTab === "conversation" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span>Conversation</span>
              {activeTab === "conversation" && (
                <div className="absolute -bottom-3 left-0 right-0 h-0.5 bg-foreground rounded-full" />
              )}
            </button>



            <button
              type="button"
              onClick={() => setActiveTab("info")}
              className={`flex flex-1 items-center justify-center gap-2 pb-1 text-xs font-semibold transition cursor-pointer relative ${
                activeTab === "info" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Info className="h-3.5 w-3.5" />
              <span>Stage Info</span>
              {activeTab === "info" && (
                <div className="absolute -bottom-3 left-0 right-0 h-0.5 bg-foreground rounded-full" />
              )}
            </button>
          </div>

          {/* Tab 1: Conversation Messages */}
          {activeTab === "conversation" && (
            <div className="flex flex-1 flex-col overflow-hidden my-3">
              {/* Message List */}
              <div ref={chatScrollRef} className="flex-1 space-y-4 overflow-y-auto pr-1">
                {messages.length === 0 && (
                  <div className="flex flex-col gap-1.5 items-start">
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-secondary text-foreground">
                        <Volume2 className="h-3 w-3" />
                      </div>
                      <span className="font-semibold text-foreground">AI Interviewer</span>
                      <span>10:02 AM</span>
                    </div>
                    <div className="max-w-[90%] rounded-2xl rounded-tl-sm border border-border bg-secondary/50 p-3 text-xs leading-relaxed text-foreground">
                      Welcome to this stage of the interview! Please proceed through the challenge while explaining your technical choices.
                    </div>
                  </div>
                )}

                {messages.map((msg) => {
                  const isAssistant = msg.role === "assistant";

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col gap-1.5 ${isAssistant ? "items-start" : "items-end"}`}
                    >
                      {/* Message Header */}
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        {isAssistant ? (
                          <>
                            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-secondary text-foreground">
                              <Volume2 className="h-3 w-3" />
                            </div>
                            <span className="font-semibold text-foreground">AI Interviewer</span>
                            <span>{formatMessageTime(msg.timestamp)}</span>
                          </>
                        ) : (
                          <>
                            <span>{formatMessageTime(msg.timestamp)}</span>
                            <span className="font-semibold text-foreground">{candidateName}</span>
                            {candidatePhoto ? (
                              <img
                                src={candidatePhoto}
                                alt="You"
                                className="h-5 w-5 rounded-full object-cover border border-border"
                              />
                            ) : (
                              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-[10px]">
                                YOU
                              </div>
                            )}
                          </>
                        )}
                      </div>

                      {/* Bubble */}
                      <div
                        className={`max-w-[90%] rounded-2xl p-3 text-xs leading-relaxed shadow-xs ${
                          isAssistant
                            ? "rounded-tl-sm border border-border bg-secondary/50 text-foreground"
                            : "rounded-tr-sm bg-primary text-primary-foreground font-medium"
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Chat Input Bar */}
              <div className="mt-2 flex items-center gap-2 rounded-xl border border-border bg-secondary/40 p-1.5">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder={isMicMuted ? "Type your response..." : "Speak or type response..."}
                  className="flex-1 bg-transparent px-2.5 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden"
                />
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!inputText.trim()}
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}



          {/* Tab 3: Stage Info */}
          {activeTab === "info" && (
            <div className="flex-1 space-y-3 overflow-y-auto my-3 text-xs leading-relaxed text-foreground pr-1">
              <div className="rounded-xl border border-border bg-secondary/40 p-3 space-y-2">
                <div className="font-semibold text-foreground flex items-center gap-1.5">
                  <Info className="h-3.5 w-3.5 text-primary" />
                  <span>Stage {activeStageNum}: {stages[activeStageNum - 1]?.label}</span>
                </div>
                <p className="text-muted-foreground">
                  Topic: {problemTitle || "Algorithmic Problem & System Implementation"}
                </p>
              </div>
            </div>
          )}

          {/* ─── Bottom Widgets (Interview Focus + Next Stage Card) ─── */}
          <div className="shrink-0 space-y-4 pt-2">
            {/* Widget 1: Interview Focus Checklist */}
            <div className="border-t border-border pt-3">
              <div className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <Target className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Interview Focus</span>
              </div>

              <div className="relative pl-4 space-y-2.5 text-xs">
                {/* Vertical line connecting steps */}
                <div className="absolute left-[7px] top-1.5 bottom-1.5 w-px bg-border" />

                {focusItems.map((item, idx) => (
                  <div key={idx} className="relative flex items-center gap-2.5">
                    {item.state === "done" ? (
                      <div className="h-3 w-3 rounded-full bg-primary text-primary-foreground flex items-center justify-center z-10">
                        <Check className="w-2 h-2 stroke-[3]" />
                      </div>
                    ) : item.state === "active" ? (
                      <div className="h-2.5 w-2.5 rounded-full bg-foreground ring-2 ring-foreground/20 z-10" />
                    ) : (
                      <div className="h-2.5 w-2.5 rounded-full border border-border bg-card z-10" />
                    )}
                    <span
                      className={
                        item.state === "active"
                          ? "font-semibold text-foreground"
                          : item.state === "done"
                          ? "text-muted-foreground"
                          : "text-muted-foreground/60"
                      }
                    >
                      {item.title}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Widget 2: Next Stage Teaser Card Button */}
            <div className="border-t border-border pt-3">
              <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{activeStageNum >= stages.length ? "Finish Session" : "Next Stage"}</span>
              </div>

              <button
                type="button"
                onClick={activeStageNum >= stages.length ? onEndInterview : onNextStage}
                className="group flex w-full items-center justify-between rounded-xl border border-border bg-secondary/40 p-3 hover:bg-secondary/70 hover:border-border transition cursor-pointer shadow-xs text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground group-hover:text-foreground transition">
                    <nextStageInfo.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="block text-xs font-semibold text-foreground">{nextStageInfo.title}</span>
                    <span className="block text-[11px] text-muted-foreground">
                      {nextStageInfo.subtitle}
                    </span>
                  </div>
                </div>

                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition" />
              </button>
            </div>
          </div>
        </aside>
      </main>

      {/* ─── SETTINGS MODAL ─────────────────────────────────────────── */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-2xl text-foreground">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-foreground" />
                <h3 className="font-semibold text-foreground text-sm">Session Settings</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 py-4 text-xs">
              {/* Theme Appearance Row */}
              <div className="flex items-center justify-between rounded-xl border border-border bg-secondary/30 p-3">
                <div className="space-y-0.5">
                  <span className="font-semibold text-foreground text-xs block">Theme Appearance</span>
                  <p className="text-[11px] text-muted-foreground">Toggle between Bright and Dark mode</p>
                </div>
                <ThemeToggle showLabel />
              </div>

              <div className="space-y-1">
                <span className="font-semibold text-foreground">Microphone</span>
                <p className="text-muted-foreground">Status: {isMicMuted ? "Muted" : "Active"}</p>
              </div>
              <div className="space-y-1">
                <span className="font-semibold text-foreground">Camera Preview</span>
                <p className="text-muted-foreground">Status: {isCameraOff ? "Disabled" : "Active & Streaming"}</p>
              </div>
              <div className="space-y-1">
                <span className="font-semibold text-foreground">AI Voice Engine</span>
                <p className="text-muted-foreground">Kokoro Ultra-Fast TTS</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowSettingsModal(false)}
              className="w-full rounded-lg bg-foreground py-2 text-xs font-semibold text-background hover:opacity-90 transition cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* ─── END INTERVIEW CONFIRMATION MODAL ───────────────────────── */}
      {showEndModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl border border-rose-500/30 bg-card p-5 shadow-2xl text-foreground">
            <div className="flex items-center gap-2 text-rose-500 mb-2">
              <PhoneOff className="h-5 w-5" />
              <h3 className="font-bold text-foreground text-sm">Conclude Interview?</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed mb-5">
              Are you sure you want to end this interview session? Your performance will be submitted and evaluated to generate your executive report.
            </p>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowEndModal(false)}
                className="rounded-lg border border-border px-3.5 py-2 text-xs font-medium text-foreground hover:bg-secondary transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowEndModal(false);
                  onEndInterview();
                }}
                className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-500 transition shadow-xs cursor-pointer"
              >
                End & View Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
