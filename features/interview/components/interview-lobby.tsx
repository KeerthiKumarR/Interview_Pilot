"use client";

import { useState, useEffect, useRef } from "react";
import { Sparkles, Globe } from "lucide-react";
import { useInterviewStore } from "@/features/interview/store/interview-store";
import { getAvailableVoices, type VoiceOption } from "@/hooks/use-web-speech";
import { speakTestBackend } from "@/hooks/use-tts";

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

export function InterviewLobby({
  onReady,
}: {
  onReady: (style: string) => void;
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
    fetch("/api/profile")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!ignore && data?.profile) {
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
      try {
        const res = await fetch("/api/tts/settings");
        if (res.ok) {
          const data = await res.json();
          activeModel = data.ttsModel || "auto";
        }
      } catch {
        /* fallback to auto */
      }

      if (!isMounted) return;

      const available = getAvailableVoices(activeModel);
      setVoices(available);
      
      const currentVoice = useInterviewStore.getState().selectedVoiceId;
      const voiceExists = available.some((v) => v.id === currentVoice);

      if (!voiceExists && available.length > 0) {
        const defaultAnanya = available.find((v) => v.name === "Ananya") || available.find((v) => v.gender === "female") || available[0];
        setSelectedVoiceId(defaultAnanya.id);
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

    if (selectedVoiceId?.startsWith("local_")) {
      try {
        const { speak } = await import("@/hooks/use-web-speech");
        const gender = selectedVoiceId === "local_female" ? "female" : "male";
        const voices = typeof window !== "undefined" ? window.speechSynthesis.getVoices() : [];
        const matchedVoice = voices.find(v => {
          const nameLower = v.name.toLowerCase();
          const isFemale = nameLower.includes("female") || nameLower.includes("zira") || nameLower.includes("samantha") || nameLower.includes("hazel") || nameLower.includes("siri");
          return gender === "female" ? isFemale : !isFemale;
        });

        speak("Hello! I am your local AI interviewer. Your speaker is working.", {
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
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4 sm:p-8">
      <div className="w-full max-w-3xl overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
        <div className="border-b border-border bg-muted/30 p-6 text-center">
          <h1 className="text-2xl font-bold tracking-tight">Pre-Interview Check</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Let&apos;s make sure your setup is ready before we start the timer.
          </p>
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
                          <optgroup label="Female Voices (Default: Ananya)">
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

            {/* Right Column: Placement Viva Dossier & Evaluation Structure */}
            <div className="space-y-5">
              {/* Profile Anchor Dossier Card */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                    <Sparkles className="size-4 text-primary" />
                    <span>3. Placement Dossier Anchored</span>
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
                      <span className="font-semibold text-foreground truncate block mt-0.5">
                        {profile?.targetRole || "Software Engineer"}
                      </span>
                    </div>

                    <div className="rounded-lg bg-background/80 border border-border/50 p-2">
                      <span className="text-[10px] font-medium text-muted-foreground block uppercase tracking-wider">
                        Project in Defense
                      </span>
                      <div className="flex items-center gap-1 mt-0.5 truncate">
                        <span className="font-semibold text-foreground truncate">
                          {profile?.projects?.[0]?.title || "Skills & Track Defense"}
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

                  {Array.isArray(profile?.skills) && profile.skills.length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap pt-0.5">
                      <span className="text-[10px] text-muted-foreground">Probed Stack:</span>
                      {profile.skills.slice(0, 4).map((s, idx) => (
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
                    The AI interviewer will probe your actual project architecture, API latency, and tech stack decisions.
                  </p>
                </div>
              </div>

              {/* Placement Viva Structure */}
              <div>
                <h3 className="mb-2 text-sm font-semibold text-foreground">
                  Viva Evaluation Format ({duration} Mins)
                </h3>
                <div className="rounded-xl border border-border bg-background p-3.5">
                  <div className="relative border-l border-border/80 ml-2 pl-4 space-y-4">
                    {/* Stage 1 */}
                    <div className="relative">
                      <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-blue-500 ring-4 ring-background" />
                      <h4 className="text-xs font-semibold text-foreground">
                        1. Profile & Experience Intro
                      </h4>
                      <p className="text-[11px] text-muted-foreground">
                        ~{introTime} min • Background review, achievements, & role motivation
                      </p>
                    </div>

                    {/* Stage 2 */}
                    <div className="relative">
                      <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-purple-500 ring-4 ring-background" />
                      <h4 className="text-xs font-semibold text-foreground">
                        2. Project Defense & Architecture
                      </h4>
                      <p className="text-[11px] text-muted-foreground">
                        ~{problemTime} min • Deep probe into {profile?.projects?.[0]?.title || "project architecture"}, API latency, & DB schema
                      </p>
                    </div>

                    {/* Stage 3 */}
                    <div className="relative">
                      <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-4 ring-background" />
                      <h4 className="text-xs font-semibold text-foreground">
                        3. System Trade-offs & Code
                      </h4>
                      <p className="text-[11px] text-muted-foreground">
                        ~{codeTime} min • Live technical problem solving & modularity discussion
                      </p>
                    </div>

                    {/* Stage 4 */}
                    <div className="relative">
                      <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-amber-500 ring-4 ring-background" />
                      <h4 className="text-xs font-semibold text-foreground">
                        4. Recruiter Verdict & Scorecard
                      </h4>
                      <p className="text-[11px] text-muted-foreground">
                        ~{wrapTime} min • Placement tier evaluation (0–100) & top 5 fixes
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        <div className="border-t border-border bg-muted/30 p-6 flex justify-between items-center">
          <p className="text-xs text-muted-foreground">
            Make sure you&apos;re in a quiet environment.
          </p>
          <button
            onClick={() => onReady(interviewStyle)}
            disabled={mode === "voice" && micStatus === "error"}
            className="rounded-md bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow transition-colors hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
          >
            I&apos;m Ready, Start
          </button>
        </div>
      </div>
    </div>
  );
}
