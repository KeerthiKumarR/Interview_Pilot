"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { useInterviewStore } from "@/features/interview/store/interview-store";
import { useWebSpeech } from "@/hooks/use-web-speech";
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
  AlertCircle,
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
  Sparkles,
  Radio,
  Loader2,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { MiraiLogo } from "@/components/mirai-logo";
import { VoiceOrb } from "@/components/voice-orb";
import { stopAllTTSAudio } from "@/hooks/use-tts";
import { stopSpeaking } from "@/hooks/use-web-speech";
import { cleanInterviewChatText } from "@/lib/utils";

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
  onStopGeneration,
  children,
}: InterviewStageShellProps) {
  const { user } = useUser();
  const isMicMuted = useInterviewStore((s) => s.isMicMuted);
  const toggleMic = useInterviewStore((s) => s.toggleMic);
  const isCameraOff = useInterviewStore((s) => s.isCameraOff);
  const toggleCamera = useInterviewStore((s) => s.toggleCamera);
  const messages = useInterviewStore((s) => s.messages);
  const timeRemainingSeconds = useInterviewStore((s) => s.timeRemainingSeconds);
  const duration = useInterviewStore((s) => s.duration);
  const problemTitle = useInterviewStore((s) => s.problemTitle);
  const aiState = useInterviewStore((s) => s.aiState);
  const selectedVoiceId = useInterviewStore((s) => s.selectedVoiceId);
  const sttLanguage = useInterviewStore((s) => s.sttLanguage);

  const interviewerName = useMemo(() => {
    // Dynamically synchronize badge name with opening greeting if already present in transcript
    const firstAssistantMsg = messages.find((m) => m.role === "assistant")?.content || "";
    const match = firstAssistantMsg.match(/(?:I'm|I am|नाम|मैं)\s+([A-Za-z\u0900-\u097F]+)/i);
    if (match && match[1] && !["the", "your", "conducting", "here", "excited", "ready", "pleased", "thrilled"].includes(match[1].toLowerCase())) {
      return match[1];
    }
    if (firstAssistantMsg.toLowerCase().includes("arun") || firstAssistantMsg.toLowerCase().includes("aarav") || firstAssistantMsg.toLowerCase().includes("ramesh")) {
      return "Arun";
    }
    if (firstAssistantMsg.toLowerCase().includes("pooja")) {
      return "Pooja";
    }
    if (firstAssistantMsg.toLowerCase().includes("nalini")) {
      return "Nalini";
    }

    const map: Record<string, string> = {
      gnani_nalini: "Nalini",
      gnani_pooja: "Pooja",
      gnani_arun: "Arun",
      nalini: "Nalini",
      pooja: "Pooja",
      arun: "Arun",
      local_female: "Nalini",
      local_male: "Arun",
      am_adam: "Arun",
      am_michael: "Rohan",
      am_fenrir: "Vikram",
      am_puck: "Kabir",
      am_echo: "Aditya",
      af_heart: "Nalini",
      af_bella: "Diya",
      af_sarah: "Isha",
      af_nicole: "Kavya",
      af_sky: "Meera",
      if_sara: "Priya",
      minimax_male_presenter: "Arun",
      minimax_female_shaonv: "Pooja",
      minimax_female_yujie: "Nalini",
      gemini_alloy: "Arun",
      gemini_echo: "Arun",
      gemini_onyx: "Arun",
      gemini_nova: "Pooja",
      gemini_shimmer: "Nalini",
    };
    return (selectedVoiceId && map[selectedVoiceId]) || "Nalini";
  }, [selectedVoiceId, messages]);

  // Active Tab in Right Sidebar: "voice" | "chat" | "info" (Defaults to Live Spoken Viva)
  const [activeTab, setActiveTab] = useState<"voice" | "chat" | "info">("voice");

  // Local media & UI states
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPipExpanded, setIsPipExpanded] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [inputText, setInputText] = useState("");
  const [isSpeechListening, setIsSpeechListening] = useState(false);

  // Real-time continuous voice-to-voice viva mode
  const [isLiveVoiceMode, setIsLiveVoiceMode] = useState(true);
  const [liveSpeech, setLiveSpeech] = useState("");
  const [liveInterim, setLiveInterim] = useState("");
  const [isAutoSending, setIsAutoSending] = useState(false);
  const [micVolume, setMicVolume] = useState(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const speechAccumulatorRef = useRef<string>("");
  const liveInterimRef = useRef<string>("");
  const lastVocalTimeRef = useRef<number>(0);
  const finalizeAndSendSpeechRef = useRef<() => void>(() => {});
  const stopListeningRef = useRef<() => void>(() => {});
  const audioContextRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const latestAssistantMsg = useMemo(() => {
    return [...messages].reverse().find((m) => m.role === "assistant");
  }, [messages]);

  const scheduleSilenceSubmission = useCallback(
    (delayMs: number) => {
      if (!isLiveVoiceMode || isMicMuted) return;
      if (aiState === "speaking" || aiState === "thinking") return;

      const hasText =
        speechAccumulatorRef.current.trim().length >= 2 ||
        liveInterimRef.current.trim().length >= 2;
      if (!hasText) return;

      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }

      silenceTimeoutRef.current = setTimeout(() => {
        silenceTimeoutRef.current = null;
        setIsAutoSending(true);
        finalizeAndSendSpeechRef.current();
      }, delayMs);
    },
    [isLiveVoiceMode, isMicMuted, aiState]
  );

  const finalizeAndSendSpeech = useCallback(() => {
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
    const currentAccum = speechAccumulatorRef.current.trim();
    const interim = liveInterimRef.current.trim();
    let combined = currentAccum;
    if (interim && !currentAccum.toLowerCase().endsWith(interim.toLowerCase())) {
      combined = currentAccum ? `${currentAccum} ${interim}` : interim;
    }

    // Deduplicate repeated sentences e.g. "I don't know man I don't know man"
    const words = combined.split(/\s+/);
    if (words.length >= 4 && words.length % 2 === 0) {
      const half = words.length / 2;
      const firstHalf = words.slice(0, half).join(" ");
      const secondHalf = words.slice(half).join(" ");
      if (firstHalf.toLowerCase() === secondHalf.toLowerCase()) {
        combined = firstHalf;
      }
    }

    const fullTranscript = combined.trim();
    if (!fullTranscript || fullTranscript.length < 2) {
      setLiveSpeech("");
      setLiveInterim("");
      liveInterimRef.current = "";
      speechAccumulatorRef.current = "";
      setIsAutoSending(false);
      return;
    }

    // Stop microphone temporarily while the AI processes and speaks
    stopListeningRef.current();
    setIsSpeechListening(false);
    setIsAutoSending(false);
    speechAccumulatorRef.current = "";
    liveInterimRef.current = "";
    setLiveSpeech("");
    setLiveInterim("");
    setInputText("");

    onSendMessage(fullTranscript);
  }, [onSendMessage]);

  useEffect(() => {
    finalizeAndSendSpeechRef.current = finalizeAndSendSpeech;
  }, [finalizeAndSendSpeech]);

  // Browser-native speech recognition for live speech-to-text
  const { startListening, stopListening, isSupported: isSpeechSupported } = useWebSpeech({
    interimResults: true,
    continuous: true,
    language: sttLanguage || "en-IN",
    onError: (err) => {
      console.warn("[StageShell] Speech recognition event:", err);
      if (err === "not-allowed") {
        setLiveSpeech("Microphone access blocked. Please check browser permissions.");
      }
    },
    onInterimResult: (interim) => {
      if (aiState === "speaking" || aiState === "thinking") return;
      liveInterimRef.current = interim;
      setLiveInterim(interim);
      lastVocalTimeRef.current = Date.now();
      setIsAutoSending(false);

      // Adaptive silence fallback: if candidate stopped speaking mid-stream
      // and WebSpeech doesn't emit isFinal (common with background noise or continuous speech),
      // auto-submit after 1600ms of quiet so candidate is never stuck!
      if (interim.trim().length >= 2) {
        scheduleSilenceSubmission(1600);
      }
    },
    onResult: (transcript) => {
      if (aiState === "speaking" || aiState === "thinking") return;
      const prev = speechAccumulatorRef.current.trim();
      const curr = transcript.trim();
      let combined = curr;
      if (prev) {
        if (prev.toLowerCase() === curr.toLowerCase() || prev.toLowerCase().endsWith(curr.toLowerCase())) {
          combined = prev;
        } else if (curr.toLowerCase().startsWith(prev.toLowerCase())) {
          combined = curr;
        } else {
          combined = `${prev} ${curr}`;
        }
      }
      speechAccumulatorRef.current = combined;
      liveInterimRef.current = "";
      setLiveSpeech(combined);
      setLiveInterim("");
      lastVocalTimeRef.current = Date.now();

      if (!isLiveVoiceMode) {
        setInputText(combined);
      }

      if (isLiveVoiceMode) {
        // Adaptive silence pause:
        // If candidate completed a sentence (. ? ! or stop words), wait 1100ms.
        // If mid-sentence pause, give 1600ms breathing room.
        const trimmed = combined.trim();
        const isSentenceComplete =
          /[.?!]$/.test(trimmed) ||
          /\b(that's all|that's it|i am done|i'm done|thank you|what do you think|your thoughts|over to you)\b$/i.test(trimmed);
        const pauseDelay = isSentenceComplete ? 1100 : 1600;

        scheduleSilenceSubmission(pauseDelay);
      }
    },
  });

  stopListeningRef.current = stopListening;

  const toggleSpeechRecognition = () => {
    if (isSpeechListening) {
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = null;
      }
      stopListening();
      setIsSpeechListening(false);
      setIsAutoSending(false);
    } else {
      startListening();
      setIsSpeechListening(true);
    }
  };

  // Seamless Continuous Voice Viva Loop:
  // When AI finishes speaking -> auto-start listening to candidate!
  // When AI starts speaking/thinking -> auto-pause listening!
  useEffect(() => {
    if (!isLiveVoiceMode || isMicMuted) return;

    if (aiState === "speaking" || aiState === "thinking") {
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = null;
      }
      stopListening();
      setIsSpeechListening(false);
      setIsAutoSending(false);
    } else if (aiState === "idle" || aiState === "listening") {
      const t = setTimeout(() => {
        if (!isSpeechListening && isLiveVoiceMode && !isMicMuted) {
          startListening();
          setIsSpeechListening(true);
        }
      }, 500);
      return () => clearTimeout(t);
    }
  }, [aiState, isLiveVoiceMode, isMicMuted, isSpeechListening, startListening, stopListening]);

  // 🎙️ High-Performance Hardware Microphone Monitor & AGC (Auto Gain Control)
  // Engages browser DSP (Auto Gain, Noise Suppression, Echo Cancellation) to amplify soft speech
  // and dynamically tracks real-time voice volume for the visualizer.
  useEffect(() => {
    if (typeof window === "undefined" || !navigator.mediaDevices) return;
    if (isMicMuted) {
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((t) => t.stop());
        micStreamRef.current = null;
      }
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
      setMicVolume(0);
      return;
    }

    let isMounted = true;

    async function initHardwareMic() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            autoGainControl: true,
            noiseSuppression: true,
            echoCancellation: true,
          },
        });

        if (!isMounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        micStreamRef.current = stream;

        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) return;

        const audioCtx = new AudioContextClass();
        audioContextRef.current = audioCtx;

        if (audioCtx.state === "suspended") {
          await audioCtx.resume();
        }

        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 128;
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const trackAudioLevel = () => {
          if (!isMounted) return;
          analyser.getByteFrequencyData(dataArray);

          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          // Scale human vocal frequencies smoothly
          const level = Math.min(100, Math.round((avg / 80) * 100));
          setMicVolume(level);

          const hasPendingSpeech =
            speechAccumulatorRef.current.trim().length >= 2 ||
            liveInterimRef.current.trim().length >= 2;

          if (level > 12) {
            // If the candidate is actively vocalizing (level > 12),
            // postpone any pending silence auto-submission so they are never interrupted!
            lastVocalTimeRef.current = Date.now();
            if (silenceTimeoutRef.current) {
              clearTimeout(silenceTimeoutRef.current);
              silenceTimeoutRef.current = null;
              setIsAutoSending(false);
            }
          } else if (hasPendingSpeech) {
            // Human voice level dropped to silence (<12).
            // If candidate has unsubmitted speech and at least 350ms of quiet,
            // ensure the silence countdown is armed!
            const quietDuration = Date.now() - lastVocalTimeRef.current;
            if (!silenceTimeoutRef.current && quietDuration > 350) {
              scheduleSilenceSubmission(1300);
            }
          }

          animFrameRef.current = requestAnimationFrame(trackAudioLevel);
        };

        animFrameRef.current = requestAnimationFrame(trackAudioLevel);
      } catch (err) {
        console.warn("[StageShell] Hardware mic AGC setup notice:", err);
      }
    }

    initHardwareMic();

    return () => {
      isMounted = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((t) => t.stop());
        micStreamRef.current = null;
      }
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
    };
  }, [isMicMuted]);

  // Sync camera stream to PiP element
  useEffect(() => {
    if (videoRef.current) {
      if (isCameraOff || !cameraStream) {
        try {
          videoRef.current.pause();
          videoRef.current.srcObject = null;
        } catch {}
      } else {
        videoRef.current.srcObject = cameraStream;
        videoRef.current.play().catch(() => {});
      }
    }
  }, [cameraStream, isCameraOff]);

  // Ensure camera hardware tracks are released on unmount
  useEffect(() => {
    return () => {
      if (videoRef.current) {
        try {
          videoRef.current.pause();
          videoRef.current.srcObject = null;
        } catch {}
      }
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch {}
        });
      }
    };
  }, [cameraStream]);

  // Auto-scroll chat on message change
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages]);

  // 🚀 ULTRA-LOW LATENCY: Press Enter anytime to instantly send speech with 0ms delay!
  useEffect(() => {
    if (!isLiveVoiceMode) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        const activeTag = (document.activeElement?.tagName || "").toLowerCase();
        const isMonaco = document.activeElement?.classList?.contains("inputarea");
        if (activeTag === "input" || activeTag === "textarea" || isMonaco) return;

        if (
          speechAccumulatorRef.current.trim() ||
          liveInterimRef.current.trim() ||
          liveSpeech ||
          liveInterim
        ) {
          e.preventDefault();
          finalizeAndSendSpeechRef.current();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isLiveVoiceMode, liveSpeech, liveInterim]);

  const handleToggleCamera = () => {
    if (!isCameraOff) {
      // Immediately detach video preview & release hardware tracks so green light turns off
      if (videoRef.current) {
        try {
          videoRef.current.pause();
          videoRef.current.srcObject = null;
        } catch {}
      }
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch {}
        });
      }
    }
    toggleCamera();
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
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
    if (isSpeechListening) {
      stopListening();
      setIsSpeechListening(false);
      setIsAutoSending(false);
    }
    speechAccumulatorRef.current = "";
    liveInterimRef.current = "";
    setLiveSpeech("");
    setLiveInterim("");
    onSendMessage(inputText.trim());
    setInputText("");
  };

  const handleOpenEndModal = useCallback(() => {
    // 1. Immediately pause/stop agent speech & generation so user isn't talked over
    onStopGeneration?.();
    stopAllTTSAudio();
    stopSpeaking();
    setShowEndModal(true);
  }, [onStopGeneration]);

  const handleConfirmEndInterview = useCallback(() => {
    setIsExiting(true);

    // 1. Immediately stop agent generation & audio
    onStopGeneration?.();
    stopAllTTSAudio();
    stopSpeaking();

    // 2. Immediately stop local microphone recognition & audio processing
    try {
      stopListening();
    } catch {}
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      try {
        audioContextRef.current.close();
      } catch {}
      audioContextRef.current = null;
    }

    // 3. Immediately detach video preview & release hardware tracks so green light turns off
    if (videoRef.current) {
      try {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
      } catch {}
    }
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {}
      });
    }

    // 4. Close modal and execute graceful end in parent
    setShowEndModal(false);
    onEndInterview();
  }, [onStopGeneration, stopListening, onEndInterview, cameraStream]);

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

  const isViva = useMemo(() => {
    return (
      !interview?.jobRoleId ||
      interview?.problemTitle?.toLowerCase().includes("viva") ||
      interview?.problemTitle?.toLowerCase().includes("placement") ||
      interview?.problemTitle?.toLowerCase().includes("project")
    );
  }, [interview]);

  // Dynamic Stages Definition derived from viva or structured role questions
  const stages = useMemo(() => {
    if (isViva) {
      return [
        { num: 1, label: "Intro", fullTitle: "1. Intro & Background", category: "code_editor" },
        { num: 2, label: "Projects", fullTitle: "2. Project Deep Dive", category: "code_editor" },
        { num: 3, label: "System", fullTitle: "3. Architecture & Code", category: "code_editor" },
        { num: 4, label: "Summary", fullTitle: "4. Summary & Feedback", category: "code_editor" },
      ];
    }

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
  }, [questionsList, isViva]);

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
    if (isViva) {
      const projectTitle = interview?.problemTitle?.includes(":")
        ? interview.problemTitle.split(":")[1]?.trim()
        : null;
      const projectRef = projectTitle || "Featured Project";

      switch (activeStageNum) {
        case 1:
          return [
            { title: "Self Introduction & Role Alignment", state: "active" as const },
            { title: "Technical Background & Core Stack", state: "pending" as const },
            { title: `Project Overview (${projectRef})`, state: "pending" as const },
            { title: "Communication & Articulation", state: "pending" as const },
          ];
        case 2:
          return [
            { title: "Self Introduction & Role Alignment", state: "done" as const },
            { title: `${projectRef} System Architecture`, state: "active" as const },
            { title: "State Management & REST APIs", state: "pending" as const },
            { title: "Database Schema & Deployment", state: "pending" as const },
          ];
        case 3:
          return [
            { title: "Self Introduction & Role Alignment", state: "done" as const },
            { title: `${projectRef} System Architecture`, state: "done" as const },
            { title: "Handling Scale & Optimization", state: "active" as const },
            { title: "Technical Scratchpad Demonstration", state: "pending" as const },
          ];
        case 4:
        default:
          return [
            { title: "Self Introduction & Role Alignment", state: "done" as const },
            { title: `${projectRef} System Architecture`, state: "done" as const },
            { title: "Handling Scale & Optimization", state: "done" as const },
            { title: "Behavioral & Placement Scoring", state: "active" as const },
          ];
      }
    }

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
      const icon = isViva
        ? Code2
        : nextStage.category === "code_editor"
        ? Code2
        : nextStage.category === "drawing"
        ? Network
        : nextStage.category === "option_quiz"
        ? Layers
        : MessageSquare;

      const subtitle = isViva
        ? nextStage.num === 2
          ? "Featured Project Architecture & Trade-offs"
          : nextStage.num === 3
          ? "System Scalability & Code Scratchpad"
          : "Summary & Feedback"
        : nextStage.category === "code_editor"
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
      title: isViva ? "Viva Completed" : "Interview Complete",
      subtitle: isViva ? "Ready for placement score evaluation" : "All stages finished",
      actionText: "Conclude",
    };
  };

  const nextStageInfo = getNextStageCard();
  const focusItems = getFocusItems();
  const candidateName = user?.fullName || user?.firstName || "Candidate";
  const candidatePhoto = user?.imageUrl || null;

  return (
    <div className="flex h-screen w-screen flex-col bg-background text-foreground select-none overflow-hidden font-sans transition-colors duration-200">
      {/* Top Google Tech 4-Color Accent Stripe (Inspired by Image 2) */}
      <div className="h-1.5 w-full grid grid-cols-4 shrink-0 border-b border-border/80 z-40">
        <div className="bg-[#4285F4]"></div>
        <div className="bg-[#EA4335]"></div>
        <div className="bg-[#FBBC05]"></div>
        <div className="bg-[#34A853]"></div>
      </div>

      {/* ─── 1. TOP HEADER BAR ────────────────────────────────────────── */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-card/85 backdrop-blur-md px-6 z-30">
        {/* Left: Mirai Copilot Logo + Role Title */}
        <div className="flex items-center gap-3">
          <MiraiLogo size={26} showText={true} textClassName="text-base font-bold tracking-tight text-foreground" />

          <div className="h-5 w-px bg-border mx-1" />

          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">
              {interview?.problemTitle ? (
                interview.problemTitle.includes(":") ? (
                  <>
                    <span>{interview.problemTitle.split(":")[0]}</span>
                    <span className="text-muted-foreground mx-1">•</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-medium">
                      {interview.problemTitle.split(":")[1]?.trim()}
                    </span>
                  </>
                ) : (
                  interview.problemTitle
                )
              ) : (
                interview?.jobRole?.title || "Placement Viva"
              )}
            </span>
          </div>
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

          {/* End Interview Button */}
          <button
            type="button"
            onClick={handleOpenEndModal}
            className="flex items-center gap-2 rounded-lg border border-border bg-secondary/50 px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-rose-500/15 hover:border-rose-500/30 hover:text-rose-600 dark:hover:text-rose-300 transition cursor-pointer shadow-xs"
          >
            <PhoneOff className="h-3.5 w-3.5" />
            <span>End Interview</span>
          </button>
        </div>
      </header>

      {/* ─── 2. MAIN WORKSPACE (LEFT STAGE + RIGHT SIDEBAR) ───────────── */}
      <main className="flex flex-1 overflow-hidden p-4 gap-4 bg-dot-grid-subtle">
        {/* ─── LEFT COLUMN: WORKSPACE CONTENT + BOTTOM DOCK ───────────── */}
        <div className="flex flex-1 flex-col justify-between overflow-hidden relative">
          {/* Main Stage Content (Children Slot) */}
          <div className="relative flex flex-1 flex-col overflow-hidden rounded-2xl border-2 border-border bg-card neo-shadow">
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

              {/* Transcript / Chat Button */}
              <button
                type="button"
                onClick={() => setActiveTab((prev) => (prev === "chat" ? "voice" : "chat"))}
                className={`flex flex-col items-center gap-1 transition cursor-pointer ${
                  activeTab === "chat" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-lg border transition ${
                    activeTab === "chat"
                      ? "border-primary/50 bg-primary/15 text-primary"
                      : "border-border bg-secondary/50 hover:bg-secondary text-foreground"
                  }`}
                >
                  <MessageSquare className="h-4 w-4" />
                </div>
                <span className="text-[11px] font-medium">Chat Log</span>
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
        <aside className="flex w-80 sm:w-96 shrink-0 flex-col justify-between overflow-hidden rounded-2xl border-2 border-border bg-card p-3 sm:p-3.5 neo-shadow">
          {/* Top Tabs: Live Voice Viva (Primary), Chat Transcript, Stage Info */}
          <div className="flex items-center border-b border-border pb-2 gap-1">
            <button
              type="button"
              onClick={() => setActiveTab("voice")}
              className={`flex flex-1 items-center justify-center gap-1.5 pb-1 text-xs font-semibold transition cursor-pointer relative ${
                activeTab === "voice" ? "text-foreground font-bold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Radio className={`h-3.5 w-3.5 ${activeTab === "voice" ? "text-emerald-500 animate-pulse" : ""}`} />
              <span>Live Spoken Viva</span>
              {activeTab === "voice" && (
                <div className="absolute -bottom-2 left-0 right-0 h-0.5 bg-emerald-500 rounded-full" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("chat")}
              className={`flex flex-1 items-center justify-center gap-1.5 pb-1 text-xs font-semibold transition cursor-pointer relative ${
                activeTab === "chat" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span>Chat Log</span>
              {activeTab === "chat" && (
                <div className="absolute -bottom-2 left-0 right-0 h-0.5 bg-foreground rounded-full" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("info")}
              className={`flex flex-1 items-center justify-center gap-1.5 pb-1 text-xs font-semibold transition cursor-pointer relative ${
                activeTab === "info" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Info className="h-3.5 w-3.5" />
              <span>Stage Info</span>
              {activeTab === "info" && (
                <div className="absolute -bottom-2 left-0 right-0 h-0.5 bg-foreground rounded-full" />
              )}
            </button>
          </div>

          {/* ─── TAB 1: LIVE SPOKEN VIVA (VOICE-TO-VOICE ROOM) ───────────── */}
          {activeTab === "voice" && (
            <div className="flex flex-1 flex-col overflow-y-auto pr-0.5 my-1.5 space-y-2">
              {/* 1. TOP INTERACTIVE CARD: CANDIDATE SPOKEN ANSWER & ENTER BUTTON (ZERO SCROLL UX) */}
              <div className="rounded-2xl border border-border bg-card p-2.5 shadow-xs space-y-2">
                {/* Header Row: Microphone status & Quick controls */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <div
                      className={`flex h-5 w-5 items-center justify-center rounded-full ${
                        isSpeechListening && !isMicMuted
                          ? "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <Mic className="h-3 w-3" />
                    </div>
                    <span className="font-semibold text-foreground text-xs">Your Spoken Answer</span>
                    {isSpeechListening && !isMicMuted ? (
                      <div className="flex items-center gap-1.5 ml-1">
                        <div className="flex items-end gap-0.5 h-3" title={`Microphone Level: ${micVolume}%`}>
                          {[10, 25, 45, 70].map((threshold, idx) => (
                            <div
                              key={idx}
                              className={`w-1 rounded-full transition-all duration-75 ${
                                micVolume >= threshold
                                  ? idx === 3
                                    ? "h-3 bg-amber-400"
                                    : "h-2.5 bg-emerald-500"
                                  : "h-1 bg-muted-foreground/30"
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {micVolume >= 12 ? `${micVolume}%` : "Clear"}
                        </span>
                      </div>
                    ) : isMicMuted ? (
                      <span className="text-[10px] text-rose-500 font-medium ml-1">Muted</span>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Interrupt Button (Visible while AI is speaking) */}
                    {aiState === "speaking" && onStopGeneration && (
                      <button
                        type="button"
                        onClick={onStopGeneration}
                        className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 border border-rose-500/30 transition cursor-pointer"
                        title={`Interrupt ${interviewerName} to speak`}
                      >
                        Interrupt
                      </button>
                    )}

                    {/* Mute/Unmute Mic Toggle */}
                    <button
                      type="button"
                      onClick={toggleMic}
                      className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[10px] font-medium transition cursor-pointer ${
                        isMicMuted
                          ? "border-rose-500/30 bg-rose-500/10 text-rose-500"
                          : "border-border bg-secondary/50 text-foreground hover:bg-secondary"
                      }`}
                      title={isMicMuted ? "Unmute microphone" : "Mute microphone"}
                    >
                      {isMicMuted ? <MicOff className="h-2.5 w-2.5" /> : <Mic className="h-2.5 w-2.5" />}
                      <span>{isMicMuted ? "Unmute" : "Mute"}</span>
                    </button>
                  </div>
                </div>

                {/* PROMINENT TOP ENTER BUTTON: Immediately visible at top, zero scrolling */}
                <div>
                  <button
                    type="button"
                    onClick={finalizeAndSendSpeech}
                    disabled={!(liveSpeech || liveInterim)}
                    className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 border shadow-xs ${
                      liveSpeech || liveInterim
                        ? "bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white border-emerald-400/40 cursor-pointer shadow-emerald-500/25"
                        : "bg-secondary/40 text-muted-foreground/60 border-border/60 cursor-not-allowed"
                    }`}
                    title={
                      liveSpeech || liveInterim
                        ? "Click or press Enter ↵ to send your spoken response"
                        : "Start speaking into the mic to activate Send button"
                    }
                  >
                    <Send className={`h-3.5 w-3.5 ${liveSpeech || liveInterim ? "text-white animate-pulse" : "opacity-40"}`} />
                    <span>Send Answer</span>
                    <kbd
                      className={`px-1.5 py-0.5 text-[10px] rounded font-mono ${
                        liveSpeech || liveInterim
                          ? "bg-emerald-950/60 border border-emerald-400/30 text-white"
                          : "bg-muted text-muted-foreground/60 border border-border/40"
                      }`}
                    >
                      Enter ↵
                    </kbd>
                    {isAutoSending && (
                      <span className="text-[10px] text-amber-200 animate-pulse ml-1 font-normal">
                        (auto-submitting...)
                      </span>
                    )}
                    {!(liveSpeech || liveInterim) && (
                      <span className="text-[10px] text-muted-foreground/50 font-normal ml-0.5">
                        • Speak to activate
                      </span>
                    )}
                  </button>
                </div>

                {/* Real-time Candidate Spoken Transcript Pill */}
                <div className="min-h-[2.5rem] max-h-20 overflow-y-auto rounded-xl border border-border/80 bg-secondary/30 p-2 text-xs leading-relaxed">
                  {liveSpeech || liveInterim ? (
                    <div>
                      <p className="text-foreground font-medium text-[11px] leading-snug">
                        "{liveSpeech} <span className="text-muted-foreground italic">{liveInterim}</span>"
                      </p>
                      {micVolume < 10 && (liveInterim || liveSpeech) && (
                        <p className="text-[9px] text-amber-500/90 font-normal mt-0.5">
                          💡 Tip: Speak closer or louder for maximum clarity
                        </p>
                      )}
                    </div>
                  ) : isSpeechListening && !isMicMuted ? (
                    <div className="flex items-center justify-center gap-1.5 text-center text-muted-foreground py-1">
                      <Sparkles className="h-3 w-3 text-primary animate-pulse" />
                      <span className="text-[11px] text-foreground font-medium">Listening to your voice...</span>
                      <span className="text-[10px] text-muted-foreground">Speak or press Enter ↵</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center text-center text-muted-foreground py-1">
                      <p className="text-[11px]">Microphone is currently paused.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* 2. INTERVIEWER PRESENCE & CLOSED CAPTION CARD (COMPACT) */}
              <div className={`relative rounded-2xl border border-border bg-gradient-to-b from-secondary/40 via-card to-background p-2.5 shrink-0 shadow-md space-y-2 transition-all duration-700 ${
                isExiting ? "opacity-0 scale-95 pointer-events-none" : "opacity-100 scale-100"
              }`}>
                {/* Central Acoustic Voice Orb (Scaled size 76) */}
                <VoiceOrb
                  state={
                    isExiting
                      ? "idle"
                      : aiState === "speaking"
                      ? "speaking"
                      : aiState === "thinking" || isAutoSending
                      ? "thinking"
                      : isSpeechListening && !isMicMuted
                      ? "listening"
                      : "idle"
                  }
                  audioLevel={
                    isExiting
                      ? 0
                      : aiState === "speaking"
                      ? 65
                      : isSpeechListening && !isMicMuted
                      ? Math.max(micVolume * 1.5, liveInterim ? 45 : 0)
                      : 0
                  }
                  examinerName={interviewerName}
                  size={76}
                />

                {/* Live Spoken Closed Caption (Interviewer's prompt) */}
                <div className="rounded-xl border border-border/60 bg-background/50 p-2 max-h-20 overflow-y-auto">
                  <div className="flex items-center gap-1 text-[9px] text-muted-foreground font-semibold uppercase tracking-wider mb-0.5">
                    <Volume2 className="h-3 w-3 text-emerald-500" />
                    <span>Live Spoken Subtitle</span>
                  </div>
                  <p className="text-[11px] leading-snug text-foreground font-normal">
                    {latestAssistantMsg?.content
                      ? cleanInterviewChatText(latestAssistantMsg.content)
                      : `${interviewerName} is ready to conduct your placement viva.`}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ─── TAB 2: CHAT TRANSCRIPT (FULL MESSAGE HISTORY) ───────────── */}
          {activeTab === "chat" && (
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
                      <span>Just now</span>
                    </div>
                    <div className="max-w-[90%] rounded-2xl rounded-tl-sm border border-border bg-secondary/50 p-3 text-xs leading-relaxed text-foreground">
                      Welcome to your placement viva. The AI interviewer is ready.
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
                            <span className="font-semibold text-foreground">{interviewerName}</span>
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
                        {isAssistant ? cleanInterviewChatText(msg.content) : msg.content}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Chat Input Bar */}
              <div className="mt-2 flex items-center gap-2 rounded-xl border border-border bg-secondary/40 p-1.5">
                {isSpeechSupported && (
                  <button
                    type="button"
                    onClick={toggleSpeechRecognition}
                    className={`flex h-7 w-7 items-center justify-center rounded-lg border transition cursor-pointer ${
                      isSpeechListening
                        ? "border-rose-500/60 bg-rose-500 text-white animate-pulse"
                        : "border-border bg-card text-muted-foreground hover:text-foreground"
                    }`}
                    title={isSpeechListening ? "Stop listening" : "Click to speak"}
                    aria-label={isSpeechListening ? "Stop voice input" : "Start voice input"}
                  >
                    <Mic className="h-3.5 w-3.5" />
                  </button>
                )}
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder={
                    isSpeechListening
                      ? "Listening to your voice... speak now"
                      : isMicMuted
                      ? "Type your response..."
                      : "Speak or type response..."
                  }
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
          <div className="shrink-0 space-y-2 pt-1">
            {/* Widget 1: Interview Focus Checklist */}
            <div className="border-t border-border pt-1.5">
              <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <Target className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Interview Focus</span>
              </div>

              <div className="relative pl-3.5 space-y-1 text-[11px]">
                {/* Vertical line connecting steps */}
                <div className="absolute left-[6px] top-1 bottom-1 w-px bg-border" />

                {focusItems.map((item, idx) => (
                  <div key={idx} className="relative flex items-center gap-2">
                    {item.state === "done" ? (
                      <div className="h-3 w-3 rounded-full bg-primary text-primary-foreground flex items-center justify-center z-10">
                        <Check className="w-2 h-2 stroke-[3]" />
                      </div>
                    ) : item.state === "active" ? (
                      <div className="h-2 w-2 rounded-full bg-foreground ring-2 ring-foreground/20 z-10" />
                    ) : (
                      <div className="h-2 w-2 rounded-full border border-border bg-card z-10" />
                    )}
                    <span
                      className={
                        item.state === "active"
                          ? "font-semibold text-foreground truncate"
                          : item.state === "done"
                          ? "text-muted-foreground truncate"
                          : "text-muted-foreground/60 truncate"
                      }
                    >
                      {item.title}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Widget 2: Next Stage Teaser Card Button */}
            <div className="border-t border-border pt-1.5">
              <div className="mb-1 flex items-center gap-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                <span>{activeStageNum >= stages.length ? "Finish Session" : "Next Stage"}</span>
              </div>

              <button
                type="button"
                onClick={activeStageNum >= stages.length ? handleOpenEndModal : onNextStage}
                className="group flex w-full items-center justify-between rounded-xl border border-border bg-secondary/40 p-2 hover:bg-secondary/70 hover:border-border transition cursor-pointer shadow-xs text-left"
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground group-hover:text-foreground transition shrink-0">
                    <nextStageInfo.icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="truncate">
                    <span className="block text-xs font-semibold text-foreground truncate">{nextStageInfo.title}</span>
                    <span className="block text-[10px] text-muted-foreground truncate">
                      {nextStageInfo.subtitle}
                    </span>
                  </div>
                </div>

                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition shrink-0 ml-1" />
              </button>
            </div>
          </div>
        </aside>
      </main>

      {/* ─── END INTERVIEW CONFIRMATION MODAL ───────────────────────── */}
      {showEndModal && (() => {
        const candidateMessageCount = messages.filter((m) => m.role === "user").length;
        const isIntroPhase = candidateMessageCount < 3 || currentStageNumber === 1;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-2xl text-foreground">
              <div className="flex items-center gap-2 text-rose-500 mb-2">
                <PhoneOff className="h-5 w-5" />
                <h3 className="font-bold text-foreground text-sm">Conclude Interview?</h3>
              </div>

              {isIntroPhase ? (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 mb-4 text-xs text-amber-200">
                  <p className="font-semibold text-amber-300 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                    Still in Introduction Stage
                  </p>
                  <p className="mt-1 text-[11px] text-amber-200/90 leading-relaxed">
                    You have only exchanged {candidateMessageCount} response{candidateMessageCount === 1 ? "" : "s"}. Ending now will conclude this session as an <strong>Incomplete Early Exit</strong> before technical problem solving and coding begin.
                  </p>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground leading-relaxed mb-5">
                  Are you sure you want to end this interview session? Your performance will be submitted and evaluated to generate your executive report.
                </p>
              )}

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={isExiting}
                  onClick={() => {
                    stopAllTTSAudio();
                    setShowEndModal(false);
                  }}
                  className="rounded-lg border border-border px-3.5 py-2 text-xs font-medium text-foreground hover:bg-secondary transition cursor-pointer disabled:opacity-50"
                >
                  Continue Interview
                </button>
                <button
                  type="button"
                  disabled={isExiting}
                  onClick={handleConfirmEndInterview}
                  className={`rounded-lg px-4 py-2 text-xs font-semibold text-white transition shadow-xs cursor-pointer disabled:opacity-50 ${
                    isIntroPhase ? "bg-amber-600 hover:bg-amber-500" : "bg-rose-600 hover:bg-rose-500"
                  }`}
                >
                  {isExiting ? (
                    <div className="flex items-center gap-1.5">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Ending...</span>
                    </div>
                  ) : isIntroPhase ? (
                    "End Early (Incomplete)"
                  ) : (
                    "End & View Report"
                  )}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ─── 4. GRACEFUL EXIT & PLACEMENT DOSSIER GENERATION SCREEN ─── */}
      {isExiting && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/85 backdrop-blur-md animate-in fade-in duration-300">
          <div className="flex flex-col items-center text-center max-w-sm px-6 space-y-4">
            {/* Smooth pulsing beacon */}
            <div className="relative flex items-center justify-center">
              <div className="absolute size-20 rounded-full bg-primary/20 animate-ping opacity-60" />
              <div className="relative size-16 rounded-full border-2 border-primary/50 bg-primary/10 flex items-center justify-center text-primary shadow-lg">
                <Sparkles className="size-8 text-primary animate-pulse" />
              </div>
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg font-black tracking-tight text-foreground">
                Concluding Viva Defense...
              </h3>
              <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                Silencing audio streams, finalizing candidate code, and compiling your placement evaluation report.
              </p>
            </div>

            {/* Smooth Progress Shimmer */}
            <div className="w-52 h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full animate-pulse w-4/5 transition-all duration-1000" />
            </div>

            <span className="text-[10px] font-mono text-muted-foreground/80 tracking-wider uppercase">
              Redirecting to Placement Dossier
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
