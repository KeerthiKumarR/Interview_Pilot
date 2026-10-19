"use client";

import { useRef, useCallback } from "react";
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

async function getOrFetchAudioUrl(text: string, voiceId: string, interviewId: string): Promise<string> {
  const clean = cleanTextForSpeech(text);
  if (!clean) return "";

  const key = `${voiceId || "default"}:${clean}`;
  let url = audioCacheMap.get(key);

  if (!url) {
    try {
      const res = await fetch(`/api/interviews/${interviewId}/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: clean, voice: voiceId }),
      });

      if (!res.ok) {
        console.warn(`[useTTS] Backend TTS responded with status ${res.status}. Falling back to browser speech synthesis.`);
        return "";
      }

      const blob = await res.blob();
      url = URL.createObjectURL(blob);
      setInAudioCache(key, url);
    } catch (err) {
      console.warn("[useTTS] Failed to reach TTS API:", err);
      return "";
    }
  }

  return url;
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
    const voiceId = voiceIdOverride ?? store.selectedVoiceId ?? "local_female";
    const gender = getVoiceGender(voiceId);
    const isFemale = gender === "female";

    const rate = await getActiveTtsSpeed();
    const voices = typeof window !== "undefined" ? window.speechSynthesis?.getVoices?.() || [] : [];
    const matchedVoice = isFemale ? getBestFemaleVoice(voices) : getBestMaleVoice(voices);

    speak(text, {
      rate,
      pitch: isFemale ? 1.05 : 0.92,
      gender,
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
export async function speakTestBackend(text: string, voiceId: string, interviewId: string, onEnd?: () => void, onError?: () => void) {
  try {
    const activeVoiceId = voiceId || "local_female";
    if (activeVoiceId.startsWith("local_")) {
      await speakBrowserFallback(text, onEnd, onError, activeVoiceId);
      return null;
    }
    const url = await getOrFetchAudioUrl(text, activeVoiceId, interviewId);
    if (!url) {
      await speakBrowserFallback(text, onEnd, onError, activeVoiceId);
      return null;
    }
    const audio = new Audio(url);
    audio.playbackRate = await getActiveTtsSpeed();
    
    audio.onended = () => {
      if (onEnd) onEnd();
    };
    audio.onerror = () => {
      speakBrowserFallback(text, onEnd, onError, activeVoiceId);
    };
    
    await audio.play();
    return audio;
  } catch (e) {
    console.warn("Test audio backend failed, falling back to browser speech:", e);
    await speakBrowserFallback(text, onEnd, onError, voiceId);
    return null;
  }
}

/**
 * Utility to speak a single string via backend TTS with automatic browser speech fallback.
 * Useful for one-off messages (e.g. welcome message, question prompts).
 */
export async function speakBackend(text: string, interviewId: string, onEnd?: () => void, onError?: () => void) {
  try {
    const selectedVoiceId = useInterviewStore.getState().selectedVoiceId || "local_female";
    if (selectedVoiceId.startsWith("local_")) {
      await speakBrowserFallback(text, onEnd, onError, selectedVoiceId);
      return null;
    }
    const url = await getOrFetchAudioUrl(text, selectedVoiceId, interviewId);
    if (!url) {
      await speakBrowserFallback(text, onEnd, onError, selectedVoiceId);
      return null;
    }
    const audio = new Audio(url);
    audio.playbackRate = await getActiveTtsSpeed();
    
    audio.onended = () => {
      if (onEnd) onEnd();
    };
    audio.onerror = () => {
      speakBrowserFallback(text, onEnd, onError, selectedVoiceId);
    };
    
    await audio.play();
    return audio;
  } catch (e) {
    console.warn("Speak backend failed, falling back to browser speech:", e);
    const selectedVoiceId = useInterviewStore.getState().selectedVoiceId || "local_female";
    await speakBrowserFallback(text, onEnd, onError, selectedVoiceId);
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
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.src = "";
      currentAudioRef.current = null;
      activeAudioUrl = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
      (window as any)._currentUtterance = null;
    }
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

    const sentence = ttsQueueRef.current.shift()!;
    isSpeakingRef.current = true;

    const store = useInterviewStore.getState();
    const interviewId = store.interviewId;
    const selectedVoiceId = store.selectedVoiceId || "local_female";

    try {
      if (!interviewId) throw new Error("No interviewId active");
      store.setAIState("speaking");

      if (selectedVoiceId.startsWith("local_")) {
        const gender = getVoiceGender(selectedVoiceId);
        const isFemale = gender === "female";
        const voices = typeof window !== "undefined" ? window.speechSynthesis.getVoices() : [];
        const matchedVoice = isFemale ? getBestFemaleVoice(voices) : getBestMaleVoice(voices);

        speak(sentence, {
          rate: getActiveTtsSpeed(),
          pitch: isFemale ? 1.05 : 0.92,
          gender,
          voiceName: matchedVoice?.name || null,
          onEnd: () => {
            isSpeakingRef.current = false;
            currentAudioRef.current = null;
            activeAudioUrl = null;
            processNext();
          },
          onError: () => {
            isSpeakingRef.current = false;
            currentAudioRef.current = null;
            activeAudioUrl = null;
            processNext();
          }
        });
        return;
      }

      const url = await getOrFetchAudioUrl(sentence, selectedVoiceId, interviewId);
      if (!url) {
        // Fallback to browser Web Speech API with gender matching
        await speakBrowserFallback(
          sentence,
          () => {
            isSpeakingRef.current = false;
            currentAudioRef.current = null;
            activeAudioUrl = null;
            processNext();
          },
          () => {
            isSpeakingRef.current = false;
            currentAudioRef.current = null;
            activeAudioUrl = null;
            processNext();
          },
          selectedVoiceId
        );
        return;
      }

      // Track currently playing/active audio URL
      activeAudioUrl = url;

      // 🚀 GAPLESS PRE-FETCHING: If more sentences are queued, pre-fetch the next sentence in background!
      if (ttsQueueRef.current.length > 0) {
        const nextSentence = ttsQueueRef.current[0];
        getOrFetchAudioUrl(nextSentence, selectedVoiceId, interviewId).catch(() => {});
      }

      const audio = new Audio(url);
      audio.playbackRate = await getActiveTtsSpeed();
      currentAudioRef.current = audio;

      audio.onended = () => {
        isSpeakingRef.current = false;
        currentAudioRef.current = null;
        activeAudioUrl = null;
        processNext();
      };

      audio.onerror = () => {
        console.warn("Audio playback error, falling back to browser speech");
        speakBrowserFallback(
          sentence,
          () => {
            isSpeakingRef.current = false;
            currentAudioRef.current = null;
            activeAudioUrl = null;
            processNext();
          },
          () => {
            isSpeakingRef.current = false;
            currentAudioRef.current = null;
            activeAudioUrl = null;
            processNext();
          },
          selectedVoiceId
        );
      };

      await audio.play();
    } catch (e) {
      console.warn("TTS fetch/play error, falling back to browser speech:", e);
      await speakBrowserFallback(
        sentence,
        () => {
          isSpeakingRef.current = false;
          currentAudioRef.current = null;
          activeAudioUrl = null;
          processNext();
        },
        () => {
          isSpeakingRef.current = false;
          currentAudioRef.current = null;
          activeAudioUrl = null;
          processNext();
        }
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
        if (!isAbbrev && candidateSentence.length >= 12) {
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

  return {
    bufferToken,
    flushAndFinish,
    resetTTS,
    stopAll,
  };
}
