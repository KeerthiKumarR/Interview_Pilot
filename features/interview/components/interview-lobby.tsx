"use client";

import { useState, useEffect, useRef } from "react";
import { Sparkles, Globe, ArrowRight, MessageSquare, Code2, Layers, Award, CheckCircle2 } from "lucide-react";
import { useInterviewStore } from "@/features/interview/store/interview-store";
import { getAvailableVoices, STT_LANGUAGES, type VoiceOption } from "@/hooks/use-web-speech";
import { speakTestBackend } from "@/hooks/use-tts";
import { readCache, writeCache } from "@/lib/client-cache";

function LobbyVideoPreview({ stream }: { stream: MediaStream | null }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !stream) return;

    // Check if stream has live tracks
    const videoTracks = stream.getVideoTracks();
    if (videoTracks.length === 0 || videoTracks[0].readyState === "ended") {
      console.warn("LobbyVideoPreview: Stream tracks are ended or missing");
      return;
    }

    video.srcObject = stream;

    const playVideo = () => {
      video
        .play()
        .catch((err) => console.log("Lobby video play error:", err));
    };

    if (video.readyState >= 2) {
      playVideo();
    } else {
      video.onloadedmetadata = () => {
        playVideo();
      };
    }
  }, [stream]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      className="h-full w-full object-cover -scale-x-100 rounded-md"
    />
  );
}
function playSpeakerTestChime() {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
    osc.frequency.exponentialRampToValueAtTime(659.25, ctx.currentTime + 0.25); // E5

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.6);
  } catch {
    // Ignore if audio context is blocked
  }
}

export function InterviewLobby({
  onReady,
  jobRole,
  problemTitle,
  problemDescription,
}: {
  onReady: (style: string) => void;
  jobRole?: {
    id?: string;
    title: string;
    targetSkills?: string | null;
  } | null;
  problemTitle?: string;
  problemDescription?: string;
}) {
  const [micStatus, setMicStatus] = useState<"checking" | "ok" | "error">("checking");
  const [cameraStatus, setCameraStatus] = useState<"checking" | "ok" | "error">("checking");
  const [camStream, setCamStream] = useState<MediaStream | null>(null);
  const [speakerTested, setSpeakerTested] = useState(false);
  const [isPlayingTest, setIsPlayingTest] = useState(false);
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [interviewStyle, setInterviewStyle] = useState("Standard");
  const testAudioRef = useRef<HTMLAudioElement | null>(null);
  const camStreamRef = useRef<MediaStream | null>(null);

  // Profile dossier state
  const [profile, setProfile] = useState<{
    targetRole?: string | null;
    skills?: string[];
    projects?: Array<{
      title: string;
      liveUrl?: string | null;
      repoUrl?: string | null;
      techStack?: any;
    }>;
  } | null>(null);

  useEffect(() => {
    let ignore = false;
    const cachedProfile = readCache<any>("/api/profile");
    if (cachedProfile?.profile) {
      setProfile(cachedProfile.profile);
    }

    fetch("/api/profile")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!ignore && data?.profile) {
          writeCache("/api/profile", data);
          setProfile(data.profile);
        }
      })
      .catch(() => {});
    return () => {
      ignore = true;
    };
  }, []);

  const mode = useInterviewStore((s) => s.mode);
  const setMode = useInterviewStore((s) => s.setMode);
  const interviewId = useInterviewStore((s) => s.interviewId);
  const selectedVoiceId = useInterviewStore((s) => s.selectedVoiceId);
  const setSelectedVoiceId = useInterviewStore((s) => s.setSelectedVoiceId);
  const sttLanguage = useInterviewStore((s) => s.sttLanguage);
  const setSttLanguage = useInterviewStore((s) => s.setSttLanguage);
  const isResuming = useInterviewStore((s) => s.status === "in_progress");
  const duration = useInterviewStore((s) => s.duration);
  const mounted = useRef(false);

  // Resume immediately if resuming
  useEffect(() => {
    if (isResuming && !mounted.current) {
      mounted.current = true;
      const timer = setTimeout(() => {
        onReady(interviewStyle);
      }, 500); // Small delay to show "Resuming" toast effect
      return () => clearTimeout(timer);
    }
  }, [isResuming, onReady, interviewStyle]);

  // Load available voices filtered by active Admin TTS Model setting
  useEffect(() => {
    let isMounted = true;
    const loadVoices = async () => {
      let activeModel = "auto";
      const cachedTts = readCache<any>("/api/tts/settings");
      if (cachedTts?.ttsModel) {
        activeModel = cachedTts.ttsModel;
      } else {
        try {
          const res = await fetch("/api/tts/settings");
          if (res.ok) {
            const data = await res.json();
            writeCache("/api/tts/settings", data);
            activeModel = data.ttsModel || "auto";
          }
        } catch {
          /* fallback to auto */
        }
      }

      if (!isMounted) return;

      const available = getAvailableVoices(activeModel);
      setVoices(available);
      
      const currentVoice = useInterviewStore.getState().selectedVoiceId;
      const voiceExists = available.some((v) => v.id === currentVoice);

      if (!voiceExists && available.length > 0) {
        const defaultNalini = available.find((v) => v.id === "gnani_nalini") || available.find((v) => v.gender === "female") || available[0];
        setSelectedVoiceId(defaultNalini.id);
      }
    };

    loadVoices();

    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
      return () => {
        isMounted = false;
        window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
      };
    }
  }, [setSelectedVoiceId]);

  // Request mic and camera permissions with leak-proof stream lifecycle management
  useEffect(() => {
    if (isResuming) return;

    let isSubscribed = true;

    async function checkDevices() {
      // 1. Check Mic
      try {
        const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (isSubscribed) {
          setMicStatus("ok");
        }
        // Stop temporary mic test tracks
        micStream.getTracks().forEach((track) => track.stop());
      } catch (err) {
        console.error("Mic check failed:", err);
        if (isSubscribed) {
          setMicStatus("error");
        }
      }

      // 2. Check Camera
      try {
        // Reuse active camera stream if available and live
        if (camStreamRef.current && camStreamRef.current.active) {
          const videoTracks = camStreamRef.current.getVideoTracks();
          if (videoTracks.length > 0 && videoTracks[0].readyState === "live") {
            if (isSubscribed) {
              setCamStream(camStreamRef.current);
              setCameraStatus("ok");
            }
            return;
          }
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: "user",
          },
        });

        if (isSubscribed) {
          camStreamRef.current = stream;
          setCamStream(stream);
          setCameraStatus("ok");
        } else {
          // If component unmounted while requesting, stop stream
          stream.getTracks().forEach((track) => track.stop());
        }
      } catch (err) {
        console.error("Camera check failed:", err);
        if (isSubscribed) {
          setCameraStatus("error");
        }
      }
    }

    checkDevices();

    return () => {
      isSubscribed = false;
    };
  }, [isResuming]);

  // Instant Launch on Enter Key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) {
        return;
      }
      if (e.key === "Enter" && !(mode === "voice" && micStatus === "error")) {
        e.preventDefault();
        onReady(interviewStyle);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onReady, interviewStyle, mode, micStatus]);

  // Clean up camera stream on unmount
  useEffect(() => {
    return () => {
      if (camStreamRef.current) {
        camStreamRef.current.getTracks().forEach((track) => track.stop());
        camStreamRef.current = null;
      }
    };
  }, []);

  // Cleanup test audio on unmount
  useEffect(() => {
    return () => {
      if (testAudioRef.current) {
        testAudioRef.current.pause();
        testAudioRef.current = null;
      }
    };
  }, []);

  const handleTestSpeaker = async () => {
    if (isPlayingTest) {
      handleStopSpeaker();
      return;
    }

    setSpeakerTested(true);
    setIsPlayingTest(true);
    playSpeakerTestChime();

    if (selectedVoiceId?.startsWith("local_")) {
      try {
        const { speak, getBestFemaleVoice, getBestMaleVoice, getVoiceGender } = await import("@/hooks/use-web-speech");
        const gender = getVoiceGender(selectedVoiceId);
        const isFemale = gender === "female";
        const voices = typeof window !== "undefined" ? window.speechSynthesis.getVoices() : [];
        const matchedVoice = isFemale ? getBestFemaleVoice(voices) : getBestMaleVoice(voices);

        speak("Hello! I am your local AI interviewer. Your speaker is working.", {
          pitch: isFemale ? 1.05 : 0.92,
          gender,
          voiceName: matchedVoice?.name || null,
          onEnd: () => setIsPlayingTest(false),
          onError: () => setIsPlayingTest(false)
        });
      } catch (err) {
        console.error("Local Test speaker failed:", err);
        setIsPlayingTest(false);
      }
      return;
    }

    if (interviewId) {
      try {
        const audio = await speakTestBackend(
          "Hello! I am your AI interviewer. Your speaker is working.",
          selectedVoiceId || "",
          interviewId,
          () => setIsPlayingTest(false), // onEnd
          () => setIsPlayingTest(false)  // onError
        );
        if (audio) {
          testAudioRef.current = audio;
        }
      } catch (err) {
        console.error("Test speaker failed:", err);
        setIsPlayingTest(false);
      }
    } else {
      setIsPlayingTest(false);
    }
  };

  const handleStopSpeaker = () => {
    if (testAudioRef.current) {
      testAudioRef.current.pause();
      testAudioRef.current = null;
    }
    if (selectedVoiceId?.startsWith("local_")) {
      import("@/hooks/use-web-speech").then(({ stopSpeaking }) => stopSpeaking());
    }
    setIsPlayingTest(false);
  };

  if (isResuming) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-background/80 backdrop-blur-sm z-50 fixed inset-0">
        <div className="flex flex-col items-center gap-4 p-8 rounded-xl bg-card border border-border shadow-xl">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <h2 className="text-lg font-semibold">Resuming your interview...</h2>
          <p className="text-sm text-muted-foreground">Restoring state and transcript</p>
        </div>
      </div>
    );
  }

  let introTime = Math.round(duration * 0.15);
  let problemTime = Math.round(duration * 0.35);
  let codeTime = Math.round(duration * 0.35);
  let wrapTime = duration - introTime - problemTime - codeTime;

  // Provide cleaner, realistic presets for common standard durations
  if (duration === 20) {
    introTime = 3;
    problemTime = 7;
    codeTime = 7;
    wrapTime = 3;
  } else if (duration === 30) {
    introTime = 4;
    problemTime = 11;
    codeTime = 11;
    wrapTime = 4;
  } else if (duration === 45) {
    introTime = 5;
    problemTime = 15;
    codeTime = 20;
    wrapTime = 5;
  } else if (duration === 60) {
    introTime = 5;
    problemTime = 20;
    codeTime = 25;
    wrapTime = 10;
  }

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4 sm:p-8 bg-dot-grid-subtle">
      <div className="w-full max-w-3xl overflow-hidden rounded-2xl border-2 border-border bg-card neo-shadow">
        {/* Top Google Tech 4-Color Accent Stripe (Inspired by Image 2) */}
        <div className="h-1.5 w-full grid grid-cols-4 shrink-0 border-b border-border/80">
          <div className="bg-[#4285F4]"></div>
          <div className="bg-[#EA4335]"></div>
          <div className="bg-[#FBBC05]"></div>
          <div className="bg-[#34A853]"></div>
        </div>

        {/* Top Header with Instant Enter Action (Zero scroll required) */}
        <div className="border-b-2 border-border bg-muted/20 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">Pre-Interview Check</h1>
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-500">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Setup
              </span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground font-medium">
              Verify your setup and review the session outline before entering the room.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onReady(interviewStyle)}
              disabled={mode === "voice" && micStatus === "error"}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-extrabold text-primary-foreground border-2 border-primary/80 neo-shadow-sm transition-all hover:translate-x-0.5 hover:-translate-y-0.5 disabled:opacity-50 cursor-pointer w-full sm:w-auto"
            >
              <span>Enter Interview Room</span>
              <span className="hidden sm:inline text-xs opacity-75 font-mono">(↵ Enter)</span>
              <ArrowRight className="size-4" />
            </button>
          </div>
        </div>

        <div className="p-6 sm:p-8">
          <div className="grid gap-8 sm:grid-cols-2">
            
            {/* Device Check Section */}
            <div className="space-y-6">
              <div>
                <h3 className="mb-3 text-sm font-medium text-foreground">1. Device Check</h3>
                
                <div className="space-y-3">
                  
                  {/* Camera */}
                  <div className="flex flex-col gap-3 rounded-lg border border-border bg-background p-3">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full ${cameraStatus === 'ok' ? 'bg-emerald-500/20 text-emerald-500' : cameraStatus === 'error' ? 'bg-red-500/20 text-red-500' : 'bg-secondary text-muted-foreground animate-pulse'}`}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M23 7l-7 5 7 5V7z" />
                          <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Camera</p>
                        <p className="text-[11px] text-muted-foreground">
                          {cameraStatus === 'ok' ? 'Permission granted' : cameraStatus === 'error' ? 'Permission denied' : 'Checking...'}
                        </p>
                      </div>
                    </div>
                    {cameraStatus === 'ok' && camStream && (
                      <div className="mt-2 overflow-hidden rounded-md bg-black/10 aspect-video w-full flex items-center justify-center border border-border/50">
                        <LobbyVideoPreview stream={camStream} />
                      </div>
                    )}
                  </div>

                  {/* Microphone */}
                  <div className="flex items-center justify-between rounded-lg border border-border bg-background p-3">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full ${micStatus === 'ok' ? 'bg-emerald-500/20 text-emerald-500' : micStatus === 'error' ? 'bg-red-500/20 text-red-500' : 'bg-secondary text-muted-foreground animate-pulse'}`}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                          <line x1="12" x2="12" y1="19" y2="22" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Microphone</p>
                        <p className="text-[11px] text-muted-foreground">
                          {micStatus === 'ok' ? 'Permission granted' : micStatus === 'error' ? 'Permission denied' : 'Checking...'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Speaker */}
                  <div className="flex items-center justify-between rounded-lg border border-border bg-background p-3">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full ${speakerTested ? 'bg-emerald-500/20 text-emerald-500' : 'bg-secondary text-muted-foreground'}`}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                          <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                          <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Speaker</p>
                        <p className="text-[11px] text-muted-foreground">
                          {speakerTested ? 'Tested successfully' : 'Not tested yet'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleTestSpeaker}
                      className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                        isPlayingTest
                          ? "bg-red-500/20 text-red-500 hover:bg-red-500/30"
                          : "bg-secondary text-foreground hover:bg-secondary/80"
                      }`}
                    >
                      {isPlayingTest ? "Stop" : "Test"}
                    </button>
                  </div>

                  {/* Voice Selector */}
                  <div className="flex items-center justify-between rounded-lg border border-border bg-background p-3">
                    <div className="flex items-center gap-3 w-full">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <p className="text-sm font-medium">Interviewer Voice</p>
                        <select 
                          value={selectedVoiceId || ""}
                          onChange={(e) => setSelectedVoiceId(e.target.value)}
                          className="mt-1 block w-full rounded-md border-0 py-1 pl-2 pr-8 text-[11px] text-muted-foreground bg-secondary focus:ring-1 focus:ring-primary outline-none cursor-pointer truncate"
                        >
                          <optgroup label="Female Voices (Default: Nalini)">
                            {voices.filter(v => v.gender === "female").map(v => (
                              <option key={v.id} value={v.id}>{v.label}</option>
                            ))}
                          </optgroup>
                          <optgroup label="Male Voices">
                            {voices.filter(v => v.gender === "male").map(v => (
                              <option key={v.id} value={v.id}>{v.label}</option>
                            ))}
                          </optgroup>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Regional Spoken Viva Language Selector */}
                  <div className="flex items-center justify-between rounded-lg border border-border bg-background p-3">
                    <div className="flex items-center gap-3 w-full">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
                        <Globe className="size-4" />
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <p className="text-sm font-medium">Spoken Viva Language</p>
                        <select 
                          value={sttLanguage || "en-IN"}
                          onChange={(e) => {
                            const langCode = e.target.value;
                            setSttLanguage(langCode);
                            if (typeof window !== "undefined") {
                              try {
                                localStorage.setItem("interview_pilot_stt_lang", langCode);
                              } catch {}
                            }
                          }}
                          className="mt-1 block w-full rounded-md border-0 py-1 pl-2 pr-8 text-[11px] text-muted-foreground bg-secondary focus:ring-1 focus:ring-primary outline-none cursor-pointer truncate"
                        >
                          {STT_LANGUAGES.map((lang) => (
                            <option key={lang.code} value={lang.code}>
                              {lang.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mode Selection */}
              <div>
                <h3 className="mb-3 text-sm font-medium text-foreground">2. Interview Mode</h3>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setMode("voice")}
                    className={`flex flex-col items-center gap-2 rounded-lg border p-3 transition-colors ${mode === "voice" ? "border-primary bg-primary/10" : "border-border bg-background hover:bg-secondary/50"}`}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={mode === "voice" ? "text-primary" : "text-muted-foreground"}>
                      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                      <line x1="12" x2="12" y1="19" y2="22" />
                    </svg>
                    <span className={`text-xs font-medium ${mode === "voice" ? "text-foreground" : "text-muted-foreground"}`}>Voice (Realistic)</span>
                  </button>
                  <button
                    onClick={() => setMode("text")}
                    className={`flex flex-col items-center gap-2 rounded-lg border p-3 transition-colors ${mode === "text" ? "border-primary bg-primary/10" : "border-border bg-background hover:bg-secondary/50"}`}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={mode === "text" ? "text-primary" : "text-muted-foreground"}>
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                    <span className={`text-xs font-medium ${mode === "text" ? "text-foreground" : "text-muted-foreground"}`}>Text Chat</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: Session Overview & Structure */}
            <div className="space-y-5">
              {/* Profile Focus Card */}
              {(() => {
                // ─── Extract Job-Specific Role, Company & Tech Stack ──────────
                let roleFromMeta = jobRole?.title || "";
                let companyFromMeta = "";
                let stackFromMeta: string[] = [];

                if (jobRole?.targetSkills) {
                  stackFromMeta = jobRole.targetSkills
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean);
                }

                if (problemDescription) {
                  const roleMatch = problemDescription.match(/\-\s*\*\*Role Focus\*\*:\s*([^\n\r]+)/i);
                  if (roleMatch && roleMatch[1]?.trim()) roleFromMeta = roleMatch[1].trim();
                  const compMatch = problemDescription.match(/\-\s*\*\*Target Company\*\*:\s*([^\n\r]+)/i);
                  if (compMatch && compMatch[1]?.trim()) companyFromMeta = compMatch[1].trim();
                  const stackMatch = problemDescription.match(/\-\s*\*\*Required Stack\*\*:\s*([^\n\r]+)/i);
                  if (stackMatch && stackMatch[1]?.trim()) {
                    const parsed = stackMatch[1].split(",").map((s) => s.trim()).filter(Boolean);
                    if (parsed.length > 0) stackFromMeta = parsed;
                  }
                }

                if (problemTitle) {
                  if (problemTitle.includes("Technical Viva:")) {
                    const parts = problemTitle.split("Technical Viva:");
                    if (!companyFromMeta) companyFromMeta = parts[0]?.trim();
                    if (!roleFromMeta && parts[1]?.trim()) roleFromMeta = parts[1].trim();
                  } else if (problemTitle.includes(":")) {
                    const parts = problemTitle.split(":");
                    if (!companyFromMeta) companyFromMeta = parts[0]?.trim();
                    if (!roleFromMeta && parts[1]?.trim()) roleFromMeta = parts[1].trim();
                  }
                }

                const effectiveRole = roleFromMeta || profile?.targetRole || "Software Engineer";
                const displayStack = stackFromMeta.length > 0
                  ? stackFromMeta
                  : (Array.isArray(profile?.skills) ? profile!.skills : []);

                return (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                        <Sparkles className="size-4 text-primary" />
                        <span>3. Session Overview</span>
                      </h3>
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-500">
                        <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Verified
                      </span>
                    </div>

                    <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 space-y-2.5">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-lg bg-background/80 border border-border/50 p-2">
                          <span className="text-[10px] font-medium text-muted-foreground block uppercase tracking-wider">
                            Target Role
                          </span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="font-semibold text-foreground truncate" title={effectiveRole}>
                              {effectiveRole}
                            </span>
                            {companyFromMeta && (
                              <span className="text-[9px] font-semibold text-primary px-1.5 py-0.5 rounded bg-primary/10 border border-primary/20 shrink-0">
                                {companyFromMeta}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="rounded-lg bg-background/80 border border-border/50 p-2">
                          <span className="text-[10px] font-medium text-muted-foreground block uppercase tracking-wider">
                            Featured Project
                          </span>
                          <div className="flex items-center gap-1 mt-0.5 truncate">
                            <span className="font-semibold text-foreground truncate">
                              {profile?.projects?.[0]?.title || "System Architecture"}
                            </span>
                            {profile?.projects?.[0]?.liveUrl && (
                              <span className="inline-flex items-center gap-0.5 text-[9px] text-emerald-500 font-medium shrink-0 ml-1">
                                <Globe className="size-2.5" />
                                Live
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {displayStack.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap pt-0.5">
                          <span className="text-[10px] text-muted-foreground">
                            {stackFromMeta.length > 0 ? "Role Tech Stack:" : "Key Skills:"}
                          </span>
                          {displayStack.slice(0, 5).map((s, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center rounded bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-foreground"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      )}

                      <p className="text-[11px] text-muted-foreground leading-tight pt-0.5">
                        {companyFromMeta
                          ? `Questions will evaluate your technical architecture, code modularity, and trade-offs for ${effectiveRole} at ${companyFromMeta}.`
                          : "Questions will focus on your system design, technical decisions, and implementation depth."}
                      </p>
                    </div>
                  </div>
                );
              })()}

              {/* Interview Structure (Directly styled with Image 2 Neo-Brutalist Cards) */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <h3 className="text-xs sm:text-sm font-black text-foreground tracking-tight flex items-center gap-1.5">
                    <span>Interview Roadmap ({duration} mins):</span>
                    <span className="bg-[#FF4D4D] text-white px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider shadow-xs">
                      4 Stages
                    </span>
                  </h3>
                </div>

                <div className="space-y-2">
                  {/* Stage 1 */}
                  <div className="rounded-xl border-2 border-border bg-card p-2.5 neo-shadow-sm flex items-start gap-2.5">
                    <div className="size-8 rounded-lg border-2 border-border bg-[#FFE4E6] flex items-center justify-center text-stone-900 shrink-0 mt-0.5">
                      <MessageSquare className="size-3.5" />
                    </div>
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-black uppercase tracking-wider text-[#FF4D4D]">Stage 1</span>
                        <span className="text-[10px] text-muted-foreground font-semibold">• ~{introTime} min</span>
                      </div>
                      <h4 className="text-xs font-black text-foreground tracking-tight truncate">
                        Introduction & Role Alignment
                      </h4>
                      <p className="text-[11px] text-muted-foreground leading-snug">
                        Career goals, background, & technical interests
                      </p>
                    </div>
                  </div>

                  {/* Stage 2 */}
                  <div className="rounded-xl border-2 border-border bg-card p-2.5 neo-shadow-sm flex items-start gap-2.5">
                    <div className="size-8 rounded-lg border-2 border-border bg-[#EDE9FE] flex items-center justify-center text-stone-900 shrink-0 mt-0.5">
                      <Layers className="size-3.5" />
                    </div>
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-black uppercase tracking-wider text-[#FF4D4D]">Stage 2</span>
                        <span className="text-[10px] text-muted-foreground font-semibold">• ~{problemTime} min</span>
                      </div>
                      <h4 className="text-xs font-black text-foreground tracking-tight truncate">
                        Project Architecture & Deep Dive
                      </h4>
                      <p className="text-[11px] text-muted-foreground leading-snug truncate">
                        Technical design of {profile?.projects?.[0]?.title || "featured project"}, APIs & database
                      </p>
                    </div>
                  </div>

                  {/* Stage 3 */}
                  <div className="rounded-xl border-2 border-border bg-card p-2.5 neo-shadow-sm flex items-start gap-2.5">
                    <div className="size-8 rounded-lg border-2 border-border bg-[#E0F2FE] flex items-center justify-center text-stone-900 shrink-0 mt-0.5">
                      <Code2 className="size-3.5" />
                    </div>
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-black uppercase tracking-wider text-[#FF4D4D]">Stage 3</span>
                        <span className="text-[10px] text-muted-foreground font-semibold">• ~{codeTime} min</span>
                      </div>
                      <h4 className="text-xs font-black text-foreground tracking-tight truncate">
                        Technical Trade-offs & Problem Solving
                      </h4>
                      <p className="text-[11px] text-muted-foreground leading-snug">
                        Practical problem solving, edge cases, & coding approach
                      </p>
                    </div>
                  </div>

                  {/* Stage 4 */}
                  <div className="rounded-xl border-2 border-border bg-card p-2.5 neo-shadow-sm flex items-start gap-2.5">
                    <div className="size-8 rounded-lg border-2 border-border bg-[#FEF3C7] flex items-center justify-center text-stone-900 shrink-0 mt-0.5">
                      <Award className="size-3.5" />
                    </div>
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-black uppercase tracking-wider text-[#FF4D4D]">Stage 4</span>
                        <span className="text-[10px] text-muted-foreground font-semibold">• ~{wrapTime} min</span>
                      </div>
                      <h4 className="text-xs font-black text-foreground tracking-tight truncate">
                        Feedback & Performance Summary
                      </h4>
                      <p className="text-[11px] text-muted-foreground leading-snug">
                        Comprehensive scorecard, strengths, & top priority improvements
                      </p>
                    </div>
                  </div>
                </div>

                {/* High-Contrast "Remember" Banner (From Image 2) */}
                <div className="mt-3 rounded-xl border-2 border-border bg-neutral-950 p-2.5 text-white flex items-center gap-2.5 neo-shadow-sm">
                  <span className="shrink-0 bg-[#FF4D4D] text-white font-black text-[9px] px-2 py-0.5 rounded-md border border-black uppercase tracking-wider">
                    Remember
                  </span>
                  <p className="text-[10px] sm:text-[11px] font-medium text-stone-200 leading-tight">
                    Technical viva evaluates your reasoning process and communication clarity, not just silent code output.
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>

        <div className="border-t border-border bg-muted/30 p-5 sm:p-6 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p className="text-xs text-muted-foreground text-center sm:text-left">
            Make sure you&apos;re in a quiet environment with a working microphone.
          </p>
          <button
            type="button"
            onClick={() => onReady(interviewStyle)}
            disabled={mode === "voice" && micStatus === "error"}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow transition-colors hover:bg-primary/90 disabled:opacity-50 cursor-pointer w-full sm:w-auto"
          >
            <span>Enter Interview Room</span>
            <span className="hidden sm:inline text-xs opacity-75 font-mono">(↵ Enter)</span>
            <ArrowRight className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
