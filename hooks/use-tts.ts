"use client";

import { useRef, useCallback, useEffect } from "react";
import { useInterviewStore } from "@/features/interview/store/interview-store";
import { speak, getBestFemaleVoice, getBestMaleVoice, getVoiceGender } from "@/hooks/use-web-speech";

/**
 * Centralized Text-to-Speech hook using OpenRouter Backend TTS.
 * Manages sentence-level buffering and a speaking queue.
 * Fetches audio blobs from our backend API and plays them sequentially.
 */

/**
 * Helper to strip markdown symbols and convert punctuation for natural breathing pauses in TTS:
 * - Hyphens (—, --) -> ellipses (...)
 * - Semicolons (;) and Colons (:) -> commas (,)
 */
export function cleanTextForSpeech(text: string): string {
  if (!text) return "";
  return text
    // Remove thinking/reasoning blocks completely from voice output
    .replace(/(?:\*Thinking\.\.\.\*[\s\S]*?---\s*\n?)/gi, "")
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/<thought>[\s\S]*?<\/thought>/gi, "")
    .replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, "")
    .replace(/^Thinking\.\.\.[\s\S]*?---\s*\n?/gi, "")
    // Remove token count chatter, credits remarks, or self-dialogue artifacts
    .replace(/(?:tokens?\s*(?:used|count|remaining|left)?|cost|latency|balance|quota|credits?):\s*[\d$.,]+(?:\s*(?:tokens|credits|cents|usd))?/gi, "")
    .replace(/(?:remaining credits?|tokens? used|credits? left)\s*:\s*\S+/gi, "")
    .replace(/(?:see(?:ing)?|check(?:ing)?)\s+(?:credits?|tokens?)/gi, "")
    // Remove internal control tags
    .replace(/\[STAGE:\s*[1-4]\]/gi, "")
    .replace(/\[SWITCH_CATEGORY:.*?\]/gi, "")
    .replace(/\[TOOL_CALL:[\s\S]*?\]/gi, "")
    // Remove markdown code blocks
    .replace(/```[\s\S]*?```/g, " ")
    // Remove bold/italic markers
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/_(.*?)_/g, "$1")
    // Remove inline backticks
    .replace(/`([^`]+)`/g, "$1")
    // Remove headers (# Header)
    .replace(/^\s*#+\s+/gm, "")
    // Remove bullet points
    .replace(/^\s*[-*+]\s+/gm, "")
    // Remove escaped or stray asterisks
    .replace(/[*`_#]/g, "")
    // Convert long hyphens and double dashes into breathing ellipses
    .replace(/(?:—|--)/g, "... ")
    // Convert semicolons and colons into commas for soft natural pauses
    .replace(/;/g, ", ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Cached TTS Speed setting fetched from /api/tts/settings (default 1.0)
 */
let cachedTtsSpeed = 1.0;
let isTtsSpeedFetched = false;

if (typeof window !== "undefined") {
  fetch("/api/tts/settings")
    .then((res) => (res.ok ? res.json() : null))
    .then((data) => {
      if (data && typeof data.ttsSpeed === "number" && !isNaN(data.ttsSpeed)) {
        cachedTtsSpeed = data.ttsSpeed;
      }
      isTtsSpeedFetched = true;
    })
    .catch(() => {
      isTtsSpeedFetched = true;
    });
}

function getActiveTtsSpeed(): number {
  return cachedTtsSpeed;
}

/**
 * Global audio cache keyed by `${voiceId}:${text}` to prevent redundant OpenRouter API calls and save money.
 * Capped at 40 entries with LRU eviction and URL.revokeObjectURL() to prevent browser memory leaks.
 */
const audioCacheMap = new Map<string, string>();
const MAX_AUDIO_CACHE_SIZE = 40;
let activeAudioUrl: string | null = null;
let globalActiveAudio: HTMLAudioElement | null = null;

/**
 * Global TTS Session ID — incremented whenever all audio is commanded to stop.
 * In-flight async fetches check this ID and discard results if the session was invalidated.
 */
let globalTtsSessionId = 0;

/**
 * Global set tracking EVERY HTMLAudioElement currently created or playing.
 * Ensures zero audio can play past interview end or page exit.
 */
const allActiveAudioInstances = new Set<HTMLAudioElement>();

export function getGlobalTtsSessionId(): number {
  return globalTtsSessionId;
}

/**
 * Stop all active TTS audio playback (both backend audio blobs and browser speech synthesis).
 * Immediately disarms all active audio elements and invalidates any in-flight TTS fetches.
 */
export function stopAllTTSAudio() {
  globalTtsSessionId++;

  for (const audio of allActiveAudioInstances) {
    try {
      audio.onended = null;
      audio.onerror = null;
      audio.pause();
      audio.currentTime = 0;
      audio.src = "";
    } catch {}
  }
  allActiveAudioInstances.clear();

  if (globalActiveAudio) {
    try {
      globalActiveAudio.onended = null;
      globalActiveAudio.onerror = null;
      globalActiveAudio.pause();
      globalActiveAudio.currentTime = 0;
      globalActiveAudio.src = "";
    } catch {}
    globalActiveAudio = null;
  }
  activeAudioUrl = null;
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();
      (window as any)._currentUtterance = null;
    } catch {}
  }
}

function setInAudioCache(key: string, url: string) {
  if (audioCacheMap.has(key)) {
    const existingUrl = audioCacheMap.get(key);
    if (existingUrl && existingUrl !== url && existingUrl !== activeAudioUrl) {
      try {
        URL.revokeObjectURL(existingUrl);
      } catch {}
    }
    audioCacheMap.delete(key);
  } else if (audioCacheMap.size >= MAX_AUDIO_CACHE_SIZE) {
    // Find the oldest entry that is NOT the currently active/playing URL to prevent audio decode interruption
    let keyToEvict: string | null = null;
    for (const k of audioCacheMap.keys()) {
      const u = audioCacheMap.get(k);
      if (u && u !== activeAudioUrl) {
        keyToEvict = k;
        break;
      }
    }
    if (keyToEvict) {
      const oldestUrl = audioCacheMap.get(keyToEvict);
      if (oldestUrl) {
        try {
          URL.revokeObjectURL(oldestUrl);
        } catch {}
      }
      audioCacheMap.delete(keyToEvict);
    }
  }
  audioCacheMap.set(key, url);
}

/**
 * Auto-detect regional Indian script from text to prevent language mismatch.
 */
export function detectLanguageFromScript(text: string, defaultLang: string = "en-IN"): string {
  if (!text) return defaultLang;
  if (/[\u0900-\u097F]/.test(text)) return "hi-IN"; // Hindi (Devanagari)
  if (/[\u0C80-\u0CFF]/.test(text)) return "kn-IN"; // Kannada
  if (/[\u0B80-\u0BFF]/.test(text)) return "ta-IN"; // Tamil
  if (/[\u0C00-\u0C7F]/.test(text)) return "te-IN"; // Telugu
  if (/[\u0980-\u09FF]/.test(text)) return "bn-IN"; // Bengali
  if (/[\u0A80-\u0AFF]/.test(text)) return "gu-IN"; // Gujarati
  if (/[\u0D00-\u0D7F]/.test(text)) return "ml-IN"; // Malayalam
  return defaultLang;
}

async function getOrFetchAudioUrl(
  text: string,
  voiceId: string,
  interviewId: string,
  languageOverride?: string,
  expectedSessionId?: number
): Promise<string> {
  if (expectedSessionId !== undefined && expectedSessionId !== globalTtsSessionId) {
    return "";
  }
  const clean = cleanTextForSpeech(text);
  if (!clean) return "";

  const store = useInterviewStore.getState();
  const rawLang = languageOverride || store.sttLanguage || "en-IN";
  const language = detectLanguageFromScript(clean, rawLang);

  const key = `${voiceId || "default"}:${language}:${clean}`;
  let url = audioCacheMap.get(key);

  if (!url) {
    try {
      const res = await fetch(`/api/interviews/${interviewId}/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: clean, voice: voiceId, language }),
      });

      if (expectedSessionId !== undefined && expectedSessionId !== globalTtsSessionId) {
        return "";
      }

      if (!res.ok) {
        console.warn(`[useTTS] Backend TTS responded with status ${res.status}. Falling back to browser speech synthesis.`);
        return "";
      }

      const blob = await res.blob();
      if (expectedSessionId !== undefined && expectedSessionId !== globalTtsSessionId) {
        return "";
      }
      url = URL.createObjectURL(blob);
      setInAudioCache(key, url);
    } catch (err) {
      console.warn("[useTTS] Failed to reach TTS API:", err);
      return "";
    }
  }

  if (expectedSessionId !== undefined && expectedSessionId !== globalTtsSessionId) {
    return "";
  }

  return url;
}

/**
 * Unified voice resolver: ensures prefetch, speakBackend, and server TTS
 * always select the exact same voice and gender for the given spoken text.
 */
export function resolveVoiceForText(rawVoiceId: string | null | undefined, text: string): string {
  const cleanLower = text.toLowerCase();
  let selectedVoiceId = rawVoiceId && !rawVoiceId.startsWith("local_") ? rawVoiceId : "";
  const mentionsMale =
    cleanLower.includes("i'm arun") ||
    cleanLower.includes("i am arun") ||
    cleanLower.includes("i'm ramesh") ||
    cleanLower.includes("i am ramesh") ||
    cleanLower.includes("arun speaking") ||
    cleanLower.includes("ramesh speaking");
  const mentionsFemale =
    cleanLower.includes("i'm nalini") ||
    cleanLower.includes("i am nalini") ||
    cleanLower.includes("i'm pooja") ||
    cleanLower.includes("i am pooja") ||
    cleanLower.includes("nalini speaking") ||
    cleanLower.includes("pooja speaking");

  if (mentionsMale) {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("interview_pilot_voice_id", "gnani_arun");
      } catch {}
      useInterviewStore.getState().setSelectedVoiceId("gnani_arun");
    }
    return "gnani_arun";
  }
  if (mentionsFemale) {
    const femaleVoice = cleanLower.includes("pooja") ? "gnani_pooja" : "gnani_nalini";
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("interview_pilot_voice_id", femaleVoice);
      } catch {}
      useInterviewStore.getState().setSelectedVoiceId(femaleVoice);
    }
    return femaleVoice;
  }
  if (!selectedVoiceId) {
    return "gnani_nalini";
  }
  return selectedVoiceId;
}

/**
 * Silently pre-fetches and caches TTS audio in background to eliminate latency on speech start.
 */
export async function prefetchTTSAudio(text: string, interviewId: string, voiceIdOverride?: string) {
  try {
    const store = useInterviewStore.getState();
    const rawVoiceId = voiceIdOverride || store.selectedVoiceId;
    const clean = cleanTextForSpeech(text);
    if (!clean || clean.length < 2) return;
    const selectedVoiceId = resolveVoiceForText(rawVoiceId, clean);
    const lang = store.sttLanguage || "en-IN";
    await getOrFetchAudioUrl(clean, selectedVoiceId, interviewId, lang);
  } catch {
    // Non-blocking prefetch failure is safe; speakBackend will handle fallback
  }
}

/**
 * Helper to speak with browser-native Web Speech API ($0 cost, 100% reliable fallback)
 */
async function speakBrowserFallback(
  text: string,
  onEnd?: () => void,
  onError?: () => void,
  voiceIdOverride?: string | null
) {
  try {
    const store = useInterviewStore.getState();
    let voiceId = voiceIdOverride ?? store.selectedVoiceId;
    const textLower = text.toLowerCase();
    if (!voiceId || voiceId.startsWith("local_")) {
      if (textLower.includes("i'm arun") || textLower.includes("i am arun") || textLower.includes("i'm ramesh") || textLower.includes("i am ramesh") || textLower.includes("arun speaking") || textLower.includes("ramesh speaking")) {
        voiceId = "gnani_arun";
      } else {
        voiceId = "gnani_nalini";
      }
    } else if ((textLower.includes("i'm arun") || textLower.includes("i am arun") || textLower.includes("i'm ramesh") || textLower.includes("i am ramesh")) && getVoiceGender(voiceId) === "female") {
      voiceId = "gnani_arun";
    }
    const rawLang = store.sttLanguage || "en-IN";
    const language = detectLanguageFromScript(text, rawLang);
    const gender = getVoiceGender(voiceId);
    const isFemale = gender === "female";

    const rate = await getActiveTtsSpeed();
    const voices = typeof window !== "undefined" ? window.speechSynthesis?.getVoices?.() || [] : [];
    const matchedVoice = isFemale ? getBestFemaleVoice(voices, language) : getBestMaleVoice(voices, language);

    speak(text, {
      rate,
      pitch: isFemale ? 1.05 : 0.92,
      gender,
      lang: language,
      voiceName: matchedVoice?.name || null,
      onEnd,
      onError,
    });
  } catch (err) {
    console.error("Browser speech fallback failed:", err);
    if (onError) onError();
  }
}

/**
 * Utility to speak test audio for pre-interview check.
 * Caches the generated audio blob by voiceId & text so subsequent test clicks require ZERO API calls.
 * Gracefully falls back to browser speech if backend returns 403 or fails.
 */
export async function speakTestBackend(text: string, voiceId: string, interviewId: string, onEnd?: () => void, onError?: () => void, languageOverride?: string) {
  const currentSession = globalTtsSessionId;
  try {
    const activeVoiceId = voiceId || "gnani_nalini";
    const store = useInterviewStore.getState();
    const lang = languageOverride || store.sttLanguage || "en-IN";
    const url = await getOrFetchAudioUrl(text, activeVoiceId, interviewId, lang, currentSession);
    if (currentSession !== globalTtsSessionId) return null;
    if (!url) {
      await speakBrowserFallback(text, onEnd, onError, activeVoiceId);
      return null;
    }
    const audio = new Audio(url);
    allActiveAudioInstances.add(audio);
    audio.playbackRate = await getActiveTtsSpeed();
    
    audio.onended = () => {
      allActiveAudioInstances.delete(audio);
      if (onEnd) onEnd();
    };
    audio.onerror = () => {
      allActiveAudioInstances.delete(audio);
      if (currentSession === globalTtsSessionId) {
        speakBrowserFallback(text, onEnd, onError, activeVoiceId);
      }
    };
    
    if (currentSession !== globalTtsSessionId) {
      audio.pause();
      audio.src = "";
      allActiveAudioInstances.delete(audio);
      return null;
    }

    await audio.play();
    return audio;
  } catch (e) {
    if (currentSession !== globalTtsSessionId) return null;
    console.warn("Test audio backend failed, falling back to browser speech:", e);
    await speakBrowserFallback(text, onEnd, onError, voiceId);
    return null;
  }
}

/**
 * Utility to speak a single string via backend TTS with automatic browser speech fallback.
 * Useful for one-off messages (e.g. welcome message, question prompts).
 */
export async function speakBackend(text: string, interviewId: string, onEnd?: () => void, onError?: () => void, languageOverride?: string) {
  const currentSession = globalTtsSessionId;
  try {
    const store = useInterviewStore.getState();
    const rawVoiceId = store.selectedVoiceId;
    const clean = cleanTextForSpeech(text);
    if (!clean || clean.length < 2) {
      if (onEnd) onEnd();
      return null;
    }
    const selectedVoiceId = resolveVoiceForText(rawVoiceId, clean);
    const lang = languageOverride || store.sttLanguage || "en-IN";
    const url = await getOrFetchAudioUrl(clean, selectedVoiceId, interviewId, lang, currentSession);
    if (currentSession !== globalTtsSessionId) return null;
    if (!url) {
      await speakBrowserFallback(clean, onEnd, onError, selectedVoiceId);
      return null;
    }
    const audio = new Audio(url);
    audio.playbackRate = getActiveTtsSpeed();
    globalActiveAudio = audio;
    allActiveAudioInstances.add(audio);
    
    audio.onended = () => {
      allActiveAudioInstances.delete(audio);
      if (globalActiveAudio === audio) globalActiveAudio = null;
      if (onEnd) onEnd();
    };
    audio.onerror = () => {
      allActiveAudioInstances.delete(audio);
      if (globalActiveAudio === audio) {
        globalActiveAudio = null;
        if (currentSession === globalTtsSessionId) {
          speakBrowserFallback(clean, onEnd, onError, selectedVoiceId);
        }
      }
    };
    
    if (currentSession !== globalTtsSessionId) {
      audio.pause();
      audio.src = "";
      allActiveAudioInstances.delete(audio);
      return null;
    }

    await audio.play();
    return audio;
  } catch (e) {
    if (currentSession !== globalTtsSessionId) return null;
    console.warn("Speak backend failed, falling back to browser speech:", e);
    const selectedVoiceId = useInterviewStore.getState().selectedVoiceId || "gnani_nalini";
    await speakBrowserFallback(cleanTextForSpeech(text), onEnd, onError, selectedVoiceId);
    return null;
  }
}

interface UseTTSResult {
  bufferToken: (token: string) => void;
  flushAndFinish: () => void;
  resetTTS: () => void;
  stopAll: () => void;
}

export function useTTS(): UseTTSResult {
  const sentenceBufferRef = useRef<string>("");
  const ttsQueueRef = useRef<string[]>([]);
  const isSpeakingRef = useRef<boolean>(false);
  const isDoneStreamingRef = useRef<boolean>(false);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  /**
   * Stop currently playing audio.
   */
  const stopSpeaking = useCallback(() => {
    isSpeakingRef.current = false;
    ttsQueueRef.current = [];
    sentenceBufferRef.current = "";
    if (currentAudioRef.current) {
      try {
        currentAudioRef.current.onended = null;
        currentAudioRef.current.onerror = null;
        currentAudioRef.current.pause();
        currentAudioRef.current.currentTime = 0;
        currentAudioRef.current.src = "";
      } catch {}
      currentAudioRef.current = null;
      activeAudioUrl = null;
    }
    stopAllTTSAudio();
  }, []);

  /**
   * Speak sentences from the queue one at a time with Gapless Pre-fetching.
   */
  const speakNextInQueue = useCallback(async function processNext() {
    if (isSpeakingRef.current || ttsQueueRef.current.length === 0) {
      // Queue is empty — if streaming is done, transition state
      if (
        ttsQueueRef.current.length === 0 &&
        !isSpeakingRef.current &&
        isDoneStreamingRef.current
      ) {
        const store = useInterviewStore.getState();
        if (store.mode === "voice") {
          store.setAIState("listening");
        } else {
          store.setAIState("idle");
        }
        isDoneStreamingRef.current = false;
        activeAudioUrl = null;
      }
      return;
    }

    const rawSentence = ttsQueueRef.current.shift()!;
    const sentence = cleanTextForSpeech(rawSentence);
    if (!sentence || sentence.length < 2) {
      isSpeakingRef.current = false;
      processNext();
      return;
    }

    isSpeakingRef.current = true;

    const store = useInterviewStore.getState();
    const interviewId = store.interviewId;
    const rawVoiceId = store.selectedVoiceId;
    const sentLower = sentence.toLowerCase();
    let selectedVoiceId = rawVoiceId && !rawVoiceId.startsWith("local_") ? rawVoiceId : "";
    if (!selectedVoiceId) {
      if (sentLower.includes("i'm arun") || sentLower.includes("i am arun") || sentLower.includes("i'm ramesh") || sentLower.includes("i am ramesh") || sentLower.includes("arun speaking") || sentLower.includes("ramesh speaking")) {
        selectedVoiceId = "gnani_arun";
        store.setSelectedVoiceId("gnani_arun");
        try { localStorage.setItem("interview_pilot_voice_id", "gnani_arun"); } catch {}
      } else {
        selectedVoiceId = "gnani_nalini";
      }
    } else if ((sentLower.includes("i'm arun") || sentLower.includes("i am arun") || sentLower.includes("i'm ramesh") || sentLower.includes("i am ramesh")) && getVoiceGender(selectedVoiceId) === "female") {
      selectedVoiceId = "gnani_arun";
      store.setSelectedVoiceId("gnani_arun");
      try { localStorage.setItem("interview_pilot_voice_id", "gnani_arun"); } catch {}
    }
    const language = store.sttLanguage || "en-IN";

    let createdAudio: HTMLAudioElement | null = null;
    const currentSession = globalTtsSessionId;

    try {
      if (!interviewId) throw new Error("No interviewId active");
      store.setAIState("speaking");

      const url = await getOrFetchAudioUrl(sentence, selectedVoiceId, interviewId, language, currentSession);
      if (currentSession !== globalTtsSessionId || !isSpeakingRef.current) {
        isSpeakingRef.current = false;
        return;
      }

      if (!url) {
        // Fallback to browser Web Speech API with gender matching
        await speakBrowserFallback(
          sentence,
          () => {
            isSpeakingRef.current = false;
            currentAudioRef.current = null;
            activeAudioUrl = null;
            if (currentSession === globalTtsSessionId) processNext();
          },
          () => {
            isSpeakingRef.current = false;
            currentAudioRef.current = null;
            activeAudioUrl = null;
            if (currentSession === globalTtsSessionId) processNext();
          },
          selectedVoiceId
        );
        return;
      }

      if (currentSession !== globalTtsSessionId || !isSpeakingRef.current) {
        isSpeakingRef.current = false;
        return;
      }

      // Track currently playing/active audio URL
      activeAudioUrl = url;

      // 🚀 GAPLESS PRE-FETCHING: If more sentences are queued, pre-fetch the next sentence in background!
      if (ttsQueueRef.current.length > 0) {
        const nextSentence = cleanTextForSpeech(ttsQueueRef.current[0]);
        if (nextSentence && nextSentence.length >= 2) {
          getOrFetchAudioUrl(nextSentence, selectedVoiceId, interviewId, language, currentSession).catch(() => {});
        }
      }

      const audio = new Audio(url);
      allActiveAudioInstances.add(audio);
      audio.playbackRate = await getActiveTtsSpeed();
      createdAudio = audio;
      currentAudioRef.current = audio;

      audio.onended = () => {
        allActiveAudioInstances.delete(audio);
        isSpeakingRef.current = false;
        currentAudioRef.current = null;
        activeAudioUrl = null;
        if (currentSession === globalTtsSessionId) {
          processNext();
        }
      };

      audio.onerror = () => {
        allActiveAudioInstances.delete(audio);
        if (currentAudioRef.current !== audio) return; // Disarmed if stopped or replaced
        currentAudioRef.current = null;
        activeAudioUrl = null;
        if (currentSession === globalTtsSessionId && isSpeakingRef.current) {
          console.warn("Audio playback error, falling back to browser speech");
          speakBrowserFallback(
            sentence,
            () => {
              isSpeakingRef.current = false;
              if (currentSession === globalTtsSessionId) processNext();
            },
            () => {
              isSpeakingRef.current = false;
              if (currentSession === globalTtsSessionId) processNext();
            },
            selectedVoiceId
          );
        }
      };

      if (currentSession !== globalTtsSessionId || !isSpeakingRef.current) {
        audio.pause();
        audio.src = "";
        allActiveAudioInstances.delete(audio);
        isSpeakingRef.current = false;
        return;
      }

      await audio.play();
    } catch (e) {
      if (currentSession !== globalTtsSessionId || !isSpeakingRef.current) {
        return;
      }
      if (createdAudio && currentAudioRef.current !== createdAudio) {
        return; // Session stopped or interrupted, do not play robotic fallback
      }
      console.warn("TTS fetch/play error, falling back to browser speech:", e);
      await speakBrowserFallback(
        sentence,
        () => {
          isSpeakingRef.current = false;
          currentAudioRef.current = null;
          activeAudioUrl = null;
          if (currentSession === globalTtsSessionId) processNext();
        },
        () => {
          isSpeakingRef.current = false;
          currentAudioRef.current = null;
          activeAudioUrl = null;
          if (currentSession === globalTtsSessionId) processNext();
        },
        selectedVoiceId
      );
    }
  }, []);

  /**
   * Ultra-low-latency streaming sentence chunker for TTS.
   * Splits on sentence boundaries (. ! ? \n) as soon as the first thought/clause is ready (>= 12 chars),
   * allowing the speech synthesizer to start speaking in < 300ms while the rest of the response streams.
   */
  const bufferToken = useCallback(
    (token: string) => {
      const isSpeakerMuted = useInterviewStore.getState().isSpeakerMuted;
      if (isSpeakerMuted) return;

      sentenceBufferRef.current += token;
      const buf = sentenceBufferRef.current;

      // 1. Check for immediate paragraph or newline break
      const newlineIndex = buf.indexOf("\n\n");
      if (newlineIndex !== -1) {
        const paragraph = buf.slice(0, newlineIndex).trim();
        if (paragraph.length >= 8) {
          ttsQueueRef.current.push(paragraph);
          sentenceBufferRef.current = buf.slice(newlineIndex + 2);
          speakNextInQueue();
          return;
        }
      }

      // 2. Early sentence boundary detection (. ! ? followed by space, quote, or end)
      // Matches clean sentences as soon as they complete!
      const sentenceMatch = buf.match(/^([\s\S]*?[.?!])(?:\s+|$)/);
      if (sentenceMatch) {
        const candidateSentence = sentenceMatch[1].trim();
        // Avoid splitting on common abbreviations or decimal numbers
        const isAbbrev = /(?:e\.g|i\.e|vs|etc|Dr|Mr|Ms|\d+\.\d+)$/i.test(candidateSentence);
        if (!isAbbrev && candidateSentence.length >= 6) {
          ttsQueueRef.current.push(candidateSentence);
          sentenceBufferRef.current = buf.slice(sentenceMatch[0].length);
          speakNextInQueue();
          return;
        }
      }

      // 3. Fallback for long clauses without punctuation (> 110 chars)
      if (buf.length > 110) {
        const clauseBoundary = Math.max(
          buf.lastIndexOf(", "),
          buf.lastIndexOf("; "),
          buf.lastIndexOf(" - ")
        );
        if (clauseBoundary > 35) {
          const clause = buf.slice(0, clauseBoundary).trim();
          ttsQueueRef.current.push(clause);
          sentenceBufferRef.current = buf.slice(clauseBoundary + 1);
          speakNextInQueue();
        }
      }
    },
    [speakNextInQueue]
  );

  /**
   * Flush any remaining text in the buffer and mark streaming as done.
   */
  const flushAndFinish = useCallback(() => {
    const isSpeakerMuted = useInterviewStore.getState().isSpeakerMuted;

    if (!isSpeakerMuted && sentenceBufferRef.current.trim().length > 2) {
      ttsQueueRef.current.push(sentenceBufferRef.current.trim());
      sentenceBufferRef.current = "";
    } else {
      sentenceBufferRef.current = "";
    }

    isDoneStreamingRef.current = true;

    if (!isSpeakerMuted && ttsQueueRef.current.length > 0) {
      speakNextInQueue();
    } else if (!isSpeakingRef.current) {
      // Nothing queued, nothing speaking — transition immediately
      isDoneStreamingRef.current = false;
      const store = useInterviewStore.getState();
      if (store.mode === "voice") {
        store.setAIState("listening");
      } else {
        store.setAIState("idle");
      }
    }
  }, [speakNextInQueue]);

  /**
   * Reset all TTS state. Called before starting a new stream.
   */
  const resetTTS = useCallback(() => {
    stopSpeaking();
    sentenceBufferRef.current = "";
    ttsQueueRef.current = [];
    isSpeakingRef.current = false;
    isDoneStreamingRef.current = false;
  }, [stopSpeaking]);

  /**
   * Stop all TTS and clear queue. Called on unmount or manual stop.
   */
  const stopAll = useCallback(() => {
    stopSpeaking();
    sentenceBufferRef.current = "";
    ttsQueueRef.current = [];
    isSpeakingRef.current = false;
    isDoneStreamingRef.current = false;
  }, [stopSpeaking]);

  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, [stopSpeaking]);

  return {
    bufferToken,
    flushAndFinish,
    resetTTS,
    stopAll,
  };
}
