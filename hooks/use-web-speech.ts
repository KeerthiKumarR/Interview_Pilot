"use client";

import { useEffect, useRef, useCallback, useState } from "react";

interface UseWebSpeechOptions {
  onResult: (transcript: string) => void;
  onInterimResult?: (interim: string) => void;
  onError?: (error: string) => void;
  continuous?: boolean;
  interimResults?: boolean;
  language?: string;
}

/**
 * Web Speech API hook for speech-to-text recognition.
 * Uses browser-native SpeechRecognition API ($0 cost).
 *
 * IMPORTANT: This hook uses a session-based architecture to prevent
 * race conditions between start/stop/restart cycles. Each call to
 * startListening() creates a new session ID, and onend only restarts
 * if the session is still active.
 */
export function useWebSpeech({
  onResult,
  onInterimResult,
  onError,
  continuous = true,
  interimResults = false,
  language = "en-US",
}: UseWebSpeechOptions) {
  const [isListening, setIsListening] = useState(false);
  const isSupported =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  // Session counter: incremented on every start, checked in onend to prevent stale restarts
  const sessionIdRef = useRef(0);
  // Set to true when we explicitly want to stop — checked synchronously in onend
  const stoppedRef = useRef(true);

  // Store callbacks in refs to avoid stale closures
  const onResultRef = useRef(onResult);
  const onInterimResultRef = useRef(onInterimResult);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onResultRef.current = onResult;
    onInterimResultRef.current = onInterimResult;
    onErrorRef.current = onError;
  }, [onResult, onInterimResult, onError]);

  /**
   * Safely abort and discard the current recognition instance.
   * Sets recognitionRef to null so no stale reference can restart.
   */
  const destroyRecognition = useCallback(() => {
    const rec = recognitionRef.current;
    if (rec) {
      // Remove event handlers to prevent any further callbacks
      rec.onresult = null;
      rec.onerror = null;
      rec.onend = null;
      try {
        rec.abort();
      } catch {
        /* already stopped */
      }
      recognitionRef.current = null;
    }
  }, []);

  const startListening = useCallback(() => {
    if (!isSupported) {
      onErrorRef.current?.("Speech recognition not supported in this browser");
      return;
    }

    // Destroy any existing instance first
    destroyRecognition();

    // Create fresh recognition instance
    const SpeechRecognitionAPI =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) return;

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = continuous;
    recognition.interimResults = interimResults;
    recognition.lang = language;

    // Capture session ID for this start cycle
    const mySession = ++sessionIdRef.current;
    stoppedRef.current = false;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      // If stopped since we started, ignore
      if (stoppedRef.current) return;

      let interim = "";
      let final = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const item = event.results[i];
        if (item.isFinal) {
          final += item[0].transcript;
        } else {
          interim += item[0].transcript;
        }
      }

      if (interim.trim() && onInterimResultRef.current) {
        onInterimResultRef.current(interim.trim());
      }
      if (final.trim() && onResultRef.current) {
        onResultRef.current(final.trim());
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error("Speech recognition error:", event.error);
      // Don't report aborted (we cause this) or no-speech (normal silence)
      if (event.error !== "aborted" && event.error !== "no-speech") {
        onErrorRef.current?.(event.error);
      }
    };

    recognition.onend = () => {
      // CRITICAL: Check both the stopped flag AND session ID.
      // If either doesn't match, do NOT restart — it means stopListening
      // was called or a newer session superseded this one.
      if (stoppedRef.current || sessionIdRef.current !== mySession) {
        setIsListening(false);
        return;
      }

      // Auto-restart for continuous listening with safe debounce
      setTimeout(() => {
        if (!stoppedRef.current && sessionIdRef.current === mySession) {
          try {
            recognition.start();
            setIsListening(true);
          } catch {
            // If Chrome has put the instance into a non-restartable state, spin up a fresh one
            if (!stoppedRef.current) {
              startListening();
            }
          }
        }
      }, 120);
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
      setIsListening(true);
    } catch (error) {
      console.error("Failed to start speech recognition:", error);
      setIsListening(false);
      stoppedRef.current = true;
    }
  }, [isSupported, continuous, language, destroyRecognition]);

  const stopListening = useCallback(() => {
    // Set stopped flag FIRST — this prevents onend from restarting
    stoppedRef.current = true;
    // Increment session to invalidate any pending onend callbacks
    sessionIdRef.current++;
    destroyRecognition();
    setIsListening(false);
  }, [destroyRecognition]);

  // Cleanup on unmount — always release the microphone
  useEffect(() => {
    return () => {
      stoppedRef.current = true;
      sessionIdRef.current++;
      const rec = recognitionRef.current;
      if (rec) {
        rec.onresult = null;
        rec.onerror = null;
        rec.onend = null;
        try {
          rec.abort();
        } catch {
          /* ignore */
        }
        recognitionRef.current = null;
      }
    };
  }, []);

  return {
    isListening,
    isSupported,
    startListening,
    stopListening,
  };
}

// ─── Voice Catalog ───────────────────────────

export interface VoiceOption {
  id: string;
  name: string;
  label: string;
  gender: "male" | "female";
  engine?: string;
}

/**
 * Returns supported Indic voice models exclusively powered by Gnani.ai Timbre.
 */
export function getAvailableVoices(_model?: string): VoiceOption[] {
  return [
    // ── Real Indic Voice Personas (Gnani Timbre & Web Speech) ─────────────────
    { id: "gnani_nalini", name: "Nalini", label: "Nalini (Female · Professional & Clear)", gender: "female", engine: "Gnani Timbre" },
    { id: "gnani_arun", name: "Arun", label: "Arun (Male · Technical Lead & Confident)", gender: "male", engine: "Gnani Timbre" },
    { id: "gnani_pooja", name: "Pooja", label: "Pooja (Female · Conversational & Warm)", gender: "female", engine: "Gnani Timbre" },
  ];
}

function getDefaultVoiceList(): VoiceOption[] {
  return getAvailableVoices();
}

// Prime the voices loading asynchronously at import time
if (typeof window !== "undefined" && "speechSynthesis" in window) {
  window.speechSynthesis.getVoices();
}

/**
 * Returns whether a voiceId corresponds to a male or female persona.
 */
export function getVoiceGender(voiceId?: string | null): "male" | "female" {
  if (!voiceId) return "female";
  const found = getAvailableVoices().find((v) => v.id === voiceId);
  if (found) return found.gender;

  const lower = voiceId.toLowerCase();
  if (
    lower.startsWith("af_") ||
    lower.startsWith("if_") ||
    lower.startsWith("bf_") ||
    lower.includes("female") ||
    lower === "gemini_nova" ||
    lower === "gemini_shimmer" ||
    lower.includes("nalini") ||
    lower.includes("pooja") ||
    lower.includes("diya") ||
    lower.includes("isha") ||
    lower.includes("kavya") ||
    lower.includes("meera") ||
    lower.includes("priya") ||
    lower.includes("tara") ||
    lower.includes("neha") ||
    lower.includes("riya") ||
    lower.includes("sanya")
  ) {
    return "female";
  }

  return "male";
}

/**
 * Resolves the interviewer persona name based on voiceId and gender.
 * Female voices -> Nalini (or Pooja)
 * Male voices -> Arun
 */
export function getInterviewerNameForVoice(voiceId?: string | null): string {
  if (!voiceId) return "Nalini";
  const lower = voiceId.toLowerCase();
  if (lower.includes("pooja")) return "Pooja";
  if (getVoiceGender(voiceId) === "male") return "Arun";
  return "Nalini";
}

/**
 * Guaranteed selector for natural male voices (prioritizing Indian English and clear male voices).
 * Ensures Arun, Rohan, Vikram, Dev, and Ramesh sound like clear, confident male interviewers.
 */
export function getBestMaleVoice(voices?: SpeechSynthesisVoice[], preferredLang?: string): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  const list = voices && voices.length > 0 ? voices : window.speechSynthesis.getVoices();
  if (!list || list.length === 0) return null;

  // Strict list of female names to NEVER assign to a male interviewer
  const femaleNames = [
    "nalini", "pooja", "diya", "isha", "kavya", "meera", "priya", "tara", "neha", "riya", "sanya",
    "samantha", "victoria", "karen", "kathy", "shelley", "flo", "sandy", "moira", "tessa",
    "fiona", "zira", "hazel", "catherine", "allison", "ava", "stephanie", "zoe", "jenny", "aria",
    "female", "veena", "sangeeta", "aditi", "lekha", "serena"
  ];

  const isFemaleVoice = (voiceName: string) => {
    const lower = voiceName.toLowerCase();
    return femaleNames.some((f) => lower.includes(f));
  };

  // 0. High priority: Regional language voice matching preferredLang (e.g. Hindi, Kannada, Tamil, etc.)
  if (preferredLang && !preferredLang.startsWith("en")) {
    const langPrefix = preferredLang.split("-")[0].toLowerCase();
    const regionalVoice = list.find((v) => {
      const l = v.lang.toLowerCase();
      return (l.startsWith(langPrefix) || l.includes(langPrefix)) && !isFemaleVoice(v.name);
    });
    if (regionalVoice) return regionalVoice;
  }

  // 1. High priority: Verified Indian English male voices (e.g. Rishi en-IN, Prabhat, Aman)
  const indianMaleNames = ["rishi", "prabhat", "aman", "arun", "ramesh", "rohan", "vikram", "kabir", "neer", "dev", "male"];
  const indianMale = list.find((v) => {
    const n = v.name.toLowerCase();
    const l = v.lang.toLowerCase();
    const isIndian = l.includes("en-in") || l.includes("en_in") || n.includes("india");
    return isIndian && indianMaleNames.some((male) => n.includes(male)) && !isFemaleVoice(n);
  });
  if (indianMale) return indianMale;

  // 2. High-quality natural male voices on macOS, Windows, Chrome, Edge
  const standardMaleNames = [
    "daniel", "alex", "fred", "david", "george", "oliver", "tom",
    "microsoft david", "microsoft mark", "google us english male", "google uk english male",
    "guy", "ryan", "christopher", "eric", "brian"
  ];
  for (const name of standardMaleNames) {
    const v = list.find((voice) => {
      const n = voice.name.toLowerCase();
      return n.includes(name) && !isFemaleVoice(n);
    });
    if (v) return v;
  }

  // 3. Any voice explicitly tagged 'male' in its name (not matching female)
  const taggedMale = list.find((v) => v.name.toLowerCase().includes("male") && !isFemaleVoice(v.name));
  if (taggedMale) return taggedMale;

  // 4. Any English voice that is definitely not female
  const nonFemaleEnglish = list.find((v) => {
    const n = v.name.toLowerCase();
    const l = v.lang.toLowerCase();
    return l.startsWith("en") && !isFemaleVoice(n);
  });
  if (nonFemaleEnglish) return nonFemaleEnglish;

  return list[0] || null;
}

/**
 * Guaranteed selector for natural female voices (prioritizing Indian English and clear female voices).
 * Ensures female interviewer personas (Nalini, Pooja) never sound like a deep male voice.
 */
export function getBestFemaleVoice(voices?: SpeechSynthesisVoice[], preferredLang?: string): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  const list = voices && voices.length > 0 ? voices : window.speechSynthesis.getVoices();
  if (!list || list.length === 0) return null;

  // Strict list of known male voice identifiers to never assign to female interviewers
  const maleNames = [
    "aman", "rishi", "prabhat", "arun", "ramesh", "rohan", "vikram", "kabir", "aditya",
    "dev", "neer", "siddharth", "varun", "alex", "fred", "daniel", "david",
    "george", "male", "albert", "ralph", "tom", "oliver", "bruce", "junior",
    "eddy", "reed", "rocko", "grandpa", "bad news", "bahh", "bells", "boing",
    "bubbles", "cellos", "jester", "organ", "superstar", "trinoids", "wobble", "whisper", "zarvox"
  ];

  const isMaleVoice = (voiceName: string) => {
    const lower = voiceName.toLowerCase();
    return maleNames.some((m) => lower.includes(m));
  };

  // 0. High priority: Regional language female voice matching preferredLang (e.g. Hindi, Kannada, Tamil, etc.)
  if (preferredLang && (!preferredLang.startsWith("en") || preferredLang.startsWith("hi"))) {
    const langPrefix = preferredLang.split("-")[0].toLowerCase();
    const regionalVoice = list.find((v) => {
      const l = v.lang.toLowerCase();
      const n = v.name.toLowerCase();
      return (l.startsWith(langPrefix) || l.includes(langPrefix) || n.includes("hindi") || n.includes("lekha")) && !isMaleVoice(n);
    });
    if (regionalVoice) return regionalVoice;
  }

  // 1. High priority: Verified Indian English female voices (fits Senior Interviewer Nalini/Pooja)
  // macOS includes "Tara" (en_IN), Windows/Chrome often includes "Veena", "Sangeeta", "Aditi", "Lekha"
  const indianFemaleNames = ["tara", "veena", "sangeeta", "nalini", "aditi", "lekha", "kavya", "diya", "priya", "pooja", "female"];
  const indianFemale = list.find((v) => {
    const n = v.name.toLowerCase();
    const l = v.lang.toLowerCase();
    const isIndian = l.includes("en-in") || l.includes("en_in") || n.includes("india");
    return isIndian && indianFemaleNames.some((female) => n.includes(female)) && !isMaleVoice(n);
  });
  if (indianFemale) return indianFemale;

  // 2. High-quality standard female voices on macOS, Windows, Chrome, Edge
  const standardFemaleNames = [
    "samantha", "victoria", "karen", "kathy", "shelley", "flo", "sandy",
    "moira", "tessa", "fiona", "zira", "hazel", "siri", "catherine",
    "allison", "ava", "stephanie", "zoe", "google us english",
    "google uk english female", "microsoft zira", "jenny", "aria"
  ];
  for (const name of standardFemaleNames) {
    const v = list.find((voice) => {
      const n = voice.name.toLowerCase();
      return n.includes(name) && !isMaleVoice(n);
    });
    if (v) return v;
  }

  // 3. Any voice explicitly tagged 'female' in its name (not matching male)
  const taggedFemale = list.find((v) => v.name.toLowerCase().includes("female") && !isMaleVoice(v.name));
  if (taggedFemale) return taggedFemale;

  // 4. Any English voice that is definitely not a male voice
  const nonMaleEnglish = list.find((v) => {
    const n = v.name.toLowerCase();
    const l = v.lang.toLowerCase();
    return l.startsWith("en") && !isMaleVoice(n);
  });
  if (nonMaleEnglish) return nonMaleEnglish;

  // 5. Strict Fallback: ANY voice in the list that is not a known male voice
  const anyNonMale = list.find((v) => !isMaleVoice(v.name));
  if (anyNonMale) return anyNonMale;

  return null; // NEVER return a male voice like Alex for a female persona
}

/**
 * Speak text aloud using Web Speech Synthesis API ($0 cost).
 * Includes workaround for Chrome's cancel-before-speak bug.
 *
 * @param text The text to speak
 * @param options Configuration options
 */
export function speak(
  text: string,
  options?: {
    rate?: number;
    pitch?: number;
    lang?: string;
    voiceName?: string | null;
    gender?: "male" | "female";
    onEnd?: () => void;
    onError?: () => void;
  }
): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    options?.onError?.();
    return;
  }

  // Cancel only if currently speaking or pending to avoid locked states
  if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
    window.speechSynthesis.cancel();
  }

  // If paused, resume
  if (window.speechSynthesis.paused) {
    window.speechSynthesis.resume();
  }

  // Chrome bug workaround: after cancel(), there's a brief window where
  // speak() is silently ignored. Use a slightly longer delay to let it settle.
  setTimeout(() => {
    const isMale = options?.gender === "male";
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = options?.rate ?? 1.0;
    utterance.pitch = options?.pitch ?? (isMale ? 0.92 : 1.05);
    // Auto-detect language from script if text is in Hindi/Devanagari or regional Indic script
    let effectiveLang = options?.lang || "en-IN";
    if (/[\u0900-\u097F]/.test(text)) effectiveLang = "hi-IN";
    else if (/[\u0C80-\u0CFF]/.test(text)) effectiveLang = "kn-IN";
    else if (/[\u0B80-\u0BFF]/.test(text)) effectiveLang = "ta-IN";
    else if (/[\u0C00-\u0C7F]/.test(text)) effectiveLang = "te-IN";
    else if (/[\u0980-\u09FF]/.test(text)) effectiveLang = "bn-IN";
    else if (/[\u0A80-\u0AFF]/.test(text)) effectiveLang = "gu-IN";
    else if (/[\u0D00-\u0D7F]/.test(text)) effectiveLang = "ml-IN";

    utterance.lang = effectiveLang;

    const voices = window.speechSynthesis.getVoices();

    // Use specific voice if voiceName is provided, otherwise gender-matched best voice
    let selectedVoice: SpeechSynthesisVoice | null = null;
    if (options?.voiceName) {
      selectedVoice = voices.find((v) => v.name === options.voiceName) || null;
    }
    if (!selectedVoice) {
      selectedVoice = isMale
        ? getBestMaleVoice(voices, effectiveLang)
        : getBestFemaleVoice(voices, effectiveLang);
    }
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    let keepAliveInterval: ReturnType<typeof setInterval> | null = null;

    const cleanup = () => {
      if (keepAliveInterval) {
        clearInterval(keepAliveInterval);
        keepAliveInterval = null;
      }
      (window as any)._currentUtterance = null;
    };

    utterance.onend = () => {
      cleanup();
      options?.onEnd?.();
    };

    utterance.onerror = (event) => {
      cleanup();
      // "canceled", "interrupted", and "not-allowed" (autoplay restriction) are normal browser events
      if (
        event.error !== "canceled" &&
        event.error !== "interrupted" &&
        event.error !== "not-allowed"
      ) {
        console.warn("SpeechSynthesis event:", event.error);
      }
      options?.onError?.();
    };

    // Prevent garbage collection bug in Chrome by storing globally
    (window as any)._currentUtterance = utterance;

    window.speechSynthesis.speak(utterance);

    // Chrome pause/resume workaround for long texts (> ~15 seconds)
    // Chrome silently stops speaking after ~15s. This keeps it alive.
    keepAliveInterval = setInterval(() => {
      if (!window.speechSynthesis.speaking) {
        cleanup();
        return;
      }
      window.speechSynthesis.pause();
      window.speechSynthesis.resume();
    }, 10000);
  }, 20);
}

/**
 * Stop any current speech synthesis.
 */
export function stopSpeaking(): void {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
    (window as any)._currentUtterance = null;
  }
}

/**
 * Available STT languages for the speech recognition dropdown,
 * natively supporting Gnani.ai Prisma ASR & Indic regional speech.
 */
export const STT_LANGUAGES = [
  { code: "en-IN", label: "English (India)" },
  { code: "hi-IN", label: "Hindi (हिंदी)" },
  { code: "kn-IN", label: "Kannada (ಕನ್ನಡ)" },
  { code: "ta-IN", label: "Tamil (தமிழ்)" },
  { code: "te-IN", label: "Telugu (తెలుగు)" },
  { code: "mr-IN", label: "Marathi (मराठी)" },
  { code: "bn-IN", label: "Bengali (বাংলা)" },
  { code: "ml-IN", label: "Malayalam (മലയാളം)" },
  { code: "gu-IN", label: "Gujarati (ગુજરાતી)" },
  { code: "en-US", label: "English (US)" },
  { code: "en-GB", label: "English (UK)" },
] as const;
