"use client";

import React from "react";
import { useInterviewStore } from "@/features/interview/store/interview-store";

interface ConversationRoomContentProps {
  onNextCategory?: () => void;
}

export function ConversationRoomView({ onNextCategory }: ConversationRoomContentProps) {
  const currentQuestion = useInterviewStore((s) => s.currentQuestion);
  const currentQuestionIndex = useInterviewStore((s) => s.currentQuestionIndex);
  const aiState = useInterviewStore((s) => s.aiState);
  const messages = useInterviewStore((s) => s.messages);

  const latestAssistantMessage = [...messages].reverse().find((m) => m.role === "assistant");
  const captionText =
    latestAssistantMessage?.content ||
    currentQuestion?.promptText ||
    "Tell me about yourself and walk me through your technical background and recent projects.";

  const WAVE_BARS = [
    8, 12, 18, 26, 32, 22, 14, 28, 38, 44, 30, 16, 24, 36, 42, 28, 18, 34, 46, 38, 22, 14, 26, 36, 28, 18, 12, 8,
  ];

  return (
    <div className="relative flex h-full w-full flex-col justify-between overflow-hidden p-6 sm:p-8 bg-card text-foreground transition-colors duration-200">
      {/* Top Left Pills */}
      <div className="flex items-center gap-2.5 z-10">
        <span className="rounded-full border border-border bg-secondary/50 px-3 py-1 text-xs font-medium text-muted-foreground">
          Stage {currentQuestionIndex + 1} of 4
        </span>
        <span className="rounded-full border border-border bg-secondary/50 px-3 py-1 text-xs font-medium text-muted-foreground">
          Intro / Conversation
        </span>
      </div>

      {/* Center: Glowing AI Avatar, Subtitle, and Audio Waveform */}
      <div className="flex flex-col items-center justify-center text-center my-auto py-4 z-10">
        {/* Circular Avatar with Glowing Halo */}
        <div className="relative flex items-center justify-center mb-4">
          <div
            className={`absolute -inset-6 rounded-full transition-all duration-700 blur-2xl ${
              aiState === "speaking"
                ? "bg-primary/20 scale-125 animate-pulse"
                : aiState === "thinking"
                ? "bg-amber-400/20 scale-110 animate-pulse"
                : aiState === "listening"
                ? "bg-emerald-400/20 scale-115"
                : "bg-muted/10 scale-100"
            }`}
          />

          <div className="relative flex h-36 w-36 items-center justify-center rounded-full border border-border bg-secondary/30 p-1 shadow-xl backdrop-blur-md">
            <div className="flex h-full w-full items-center justify-center rounded-full border border-border bg-card shadow-inner">
              <div className="flex items-center gap-1.5 h-10">
                {[14, 26, 40, 26, 14].map((h, i) => (
                  <div
                    key={i}
                    className={`w-1.5 rounded-full transition-all duration-300 ${
                      aiState === "speaking"
                        ? "bg-foreground animate-pulse"
                        : aiState === "listening"
                        ? "bg-emerald-500"
                        : "bg-muted-foreground/50"
                    }`}
                    style={{
                      height: aiState === "speaking" ? `${Math.max(12, h * 0.9)}px` : `${h * 0.5}px`,
                      animationDelay: `${i * 120}ms`,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        <h2 className="text-base font-semibold text-foreground tracking-tight">AI Interviewer</h2>
        <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
          <span
            className={`h-2 w-2 rounded-full ${
              aiState === "speaking"
                ? "bg-primary animate-pulse"
                : aiState === "listening"
                ? "bg-emerald-500 animate-pulse"
                : aiState === "thinking"
                ? "bg-amber-400 animate-pulse"
                : "bg-muted-foreground/40"
            }`}
          />
          <span className="capitalize">{aiState}</span>
        </div>

        <p className="mt-6 max-w-xl text-lg sm:text-2xl font-medium leading-relaxed text-foreground px-4">
          {captionText}
        </p>

        <div className="mt-8 flex items-center justify-center gap-1.5 h-12">
          {WAVE_BARS.map((baseH, i) => {
            const isSpeaking = aiState === "speaking";
            const isListening = aiState === "listening";
            const animHeight = isSpeaking
              ? Math.max(6, baseH * 0.9)
              : isListening
              ? Math.max(4, baseH * 0.4)
              : Math.max(3, baseH * 0.2);

            return (
              <div
                key={i}
                className={`w-1 rounded-full transition-all duration-200 ${
                  isSpeaking
                    ? "bg-foreground/80"
                    : isListening
                    ? "bg-emerald-500/80"
                    : "bg-muted-foreground/30"
                }`}
                style={{ height: `${animHeight}px` }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
