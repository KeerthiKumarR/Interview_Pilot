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

      // Auto-restart for continuous listening
      try {
        recognition.start();
      } catch {
        // start() can throw if the recognition is in a bad state
        setIsListening(false);
        stoppedRef.current = true;
      }
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
 * Returns supported Indian-named voices filtered by target TTS model.
 */
export function getAvailableVoices(model?: string): VoiceOption[] {
  const allVoices: VoiceOption[] = [
    // ── Local System Voices (Browser Native Engine - $0 cost, 0ms latency) ────
    { id: "local_female", name: "Ananya", label: "WebSpeech Female (Browser Native - 0ms Latency)", gender: "female", engine: "Local" },
    { id: "local_male", name: "Aarav", label: "WebSpeech Male (Browser Native - 0ms Latency)", gender: "male", engine: "Local" },

    // ── Kokoro 82M Voices (Kokoro Engine) ──────────────────────────
    { id: "af_heart", name: "Ananya", label: "Ananya (Kokoro Female)", gender: "female", engine: "Kokoro" },
    { id: "af_bella", name: "Diya", label: "Diya (Kokoro Female)", gender: "female", engine: "Kokoro" },
    { id: "af_sarah", name: "Isha", label: "Isha (Kokoro Female)", gender: "female", engine: "Kokoro" },
    { id: "af_nicole", name: "Kavya", label: "Kavya (Kokoro Female)", gender: "female", engine: "Kokoro" },
    { id: "af_sky", name: "Meera", label: "Meera (Kokoro Female)", gender: "female", engine: "Kokoro" },
    { id: "if_sara", name: "Priya", label: "Priya (Kokoro Female)", gender: "female", engine: "Kokoro" },
    { id: "am_adam", name: "Aarav", label: "Aarav (Kokoro Male)", gender: "male", engine: "Kokoro" },
    { id: "am_michael", name: "Rohan", label: "Rohan (Kokoro Male)", gender: "male", engine: "Kokoro" },
    { id: "am_fenrir", name: "Vikram", label: "Vikram (Kokoro Male)", gender: "male", engine: "Kokoro" },
    { id: "am_puck", name: "Kabir", label: "Kabir (Kokoro Male)", gender: "male", engine: "Kokoro" },
    { id: "am_echo", name: "Aditya", label: "Aditya (Kokoro Male)", gender: "male", engine: "Kokoro" },

    // ── MiniMax Voices (MiniMax Engine) ────────────────────────────
    { id: "minimax_female_shaonv", name: "Riya", label: "Riya (MiniMax Female)", gender: "female", engine: "MiniMax" },
    { id: "minimax_female_yujie", name: "Sanya", label: "Sanya (MiniMax Female)", gender: "female", engine: "MiniMax" },
    { id: "minimax_male_presenter", name: "Dev", label: "Dev (MiniMax Male)", gender: "male", engine: "MiniMax" },

    // ── Gemini / OpenAI Voices (Gemini Engine) ─────────────────────
    { id: "gemini_nova", name: "Tara", label: "Tara (Gemini Female)", gender: "female", engine: "Gemini" },
    { id: "gemini_shimmer", name: "Neha", label: "Neha (Gemini Female)", gender: "female", engine: "Gemini" },
    { id: "gemini_alloy", name: "Neer", label: "Neer (Gemini Male)", gender: "male", engine: "Gemini" },
    { id: "gemini_echo", name: "Siddharth", label: "Siddharth (Gemini Male)", gender: "male", engine: "Gemini" },
    { id: "gemini_onyx", name: "Varun", label: "Varun (Gemini Male)", gender: "male", engine: "Gemini" },
  ];

  if (!model || model === "auto") {
    return allVoices;
  }

  const lower = model.toLowerCase();
  let filtered = allVoices;

  if (lower.includes("kokoro")) {
    filtered = allVoices.filter((v) => v.engine === "Kokoro" || v.engine === "Local");
  } else if (lower.includes("minimax")) {
    filtered = allVoices.filter((v) => v.engine === "MiniMax" || v.engine === "Local");
  } else if (lower.includes("gemini") || lower.includes("openai")) {
    filtered = allVoices.filter((v) => v.engine === "Gemini" || v.engine === "Local");
  }

  return filtered;
}

function getDefaultVoiceList(): VoiceOption[] {
  return getAvailableVoices();
}

// Prime the voices loading asynchronously at import time
if (typeof window !== "undefined" && "speechSynthesis" in window) {
  window.speechSynthesis.getVoices();
}

/**
 * Guaranteed selector for natural female voices (prioritizing Indian English and clear female voices).
 * Ensures Ananya never sounds like a deep male voice.
 */
export function getBestFemaleVoice(voices?: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  const list = voices && voices.length > 0 ? voices : window.speechSynthesis.getVoices();
  if (!list || list.length === 0) return null;

  // Strict list of known male voice identifiers to never assign to Ananya
  const maleNames = [
    "aman", "rishi", "prabhat", "aarav", "rohan", "vikram", "kabir", "aditya",
    "dev", "neer", "siddharth", "varun", "alex", "fred", "daniel", "david",
    "george", "male", "albert", "ralph", "tom", "oliver", "bruce", "junior",
    "eddy", "reed", "rocko", "grandpa", "bad news", "bahh", "bells", "boing",
    "bubbles", "cellos", "jester", "organ", "superstar", "trinoids", "wobble", "whisper", "zarvox"
  ];

  const isMaleVoice = (voiceName: string) => {
    const lower = voiceName.toLowerCase();
    return maleNames.some((m) => lower.includes(m));
  };

  // 1. High priority: Verified Indian English female voices (fits Senior Interviewer Ananya)
  // macOS includes "Tara" (en_IN), Windows/Chrome often includes "Veena", "Sangeeta", "Aditi", "Lekha"
  const indianFemaleNames = ["tara", "veena", "sangeeta", "ananya", "aditi", "lekha", "kavya", "diya", "priya", "pooja", "female"];
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

  return list[0] || null;
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
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = options?.rate ?? 1.0;
    utterance.pitch = options?.pitch ?? 1.1; // Friendly female pitch default
    utterance.lang = options?.lang ?? "en-US";

    const voices = window.speechSynthesis.getVoices();

    // Use specific voice if voiceName is provided, otherwise guaranteed best female voice
    let selectedVoice: SpeechSynthesisVoice | null = null;
    if (options?.voiceName) {
      selectedVoice = voices.find((v) => v.name === options.voiceName) || null;
    }
    if (!selectedVoice) {
      selectedVoice = getBestFemaleVoice(voices);
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
 * Available STT languages for the speech recognition dropdown.
 */
export const STT_LANGUAGES = [
  { code: "en-US", label: "English (US)" },
  { code: "en-GB", label: "English (UK)" },
  { code: "en-IN", label: "English (India)" },
  { code: "hi-IN", label: "Hindi" },
] as const;
