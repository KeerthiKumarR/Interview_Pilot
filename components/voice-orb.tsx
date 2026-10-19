"use client";

import React from "react";
import { Volume2, Mic, Pause, Loader2, AlertCircle } from "lucide-react";

export type OrbState = "idle" | "speaking" | "listening" | "thinking" | "error";

interface VoiceOrbProps {
  state: OrbState;
  audioLevel?: number; // 0 to 100
  size?: number;
  examinerName?: string;
  className?: string;
}

export function VoiceOrb({
  state = "idle",
  audioLevel = 0,
  size = 150,
  examinerName = "Mirai AI",
  className = "",
}: VoiceOrbProps) {
  const stateConfig = {
    idle: {
      label: "Session Ready",
      sublabel: "Awaiting next technical probe",
      pillClass: "border-slate-700/60 bg-slate-800/60 text-slate-300",
      icon: Pause,
      color: "#94a3b8",
      glow: "rgba(148, 163, 184, 0.15)",
    },
    speaking: {
      label: `${examinerName} Speaking`,
      sublabel: "Listen attentively · Barge-in enabled",
      pillClass: "border-cyan-500/40 bg-cyan-500/10 text-cyan-400 shadow-sm shadow-cyan-500/20",
      icon: Volume2,
      color: "#00F2FE",
      glow: "rgba(0, 242, 254, 0.35)",
    },
    listening: {
      label: "Microphone Active · You are Speaking",
      sublabel: "State your technical architecture clearly",
      pillClass: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400 shadow-sm shadow-emerald-500/20",
      icon: Mic,
      color: "#10B981",
      glow: "rgba(16, 185, 129, 0.35)",
    },
    thinking: {
      label: "Evaluating Technical Response",
      sublabel: "Synthesizing viva follow-up...",
      pillClass: "border-amber-500/40 bg-amber-500/10 text-amber-400 shadow-sm shadow-amber-500/20",
      icon: Loader2,
      color: "#F59E0B",
      glow: "rgba(245, 158, 11, 0.3)",
    },
    error: {
      label: "Audio Reconnecting",
      sublabel: "Restoring audio pipeline...",
      pillClass: "border-rose-500/40 bg-rose-500/10 text-rose-400",
      icon: AlertCircle,
      color: "#F43F5E",
      glow: "rgba(244, 63, 94, 0.3)",
    },
  };

  const current = stateConfig[state] || stateConfig.idle;
  const IconComponent = current.icon;
  const normalizedLevel = Math.min(100, Math.max(0, audioLevel));

  return (
    <div className={`flex flex-col items-center justify-center select-none py-3 space-y-3.5 ${className}`}>
      {/* Concentric Acoustic Amplitude Ring */}
      <div
        className="relative flex items-center justify-center"
        style={{ width: `${size}px`, height: `${size}px` }}
      >
        {/* Dynamic Glowing Halo */}
        <div
          className="absolute inset-0 rounded-full transition-all duration-300 pointer-events-none"
          style={{
            transform:
              state === "speaking" || state === "listening"
                ? `scale(${1 + normalizedLevel * 0.0035})`
                : "scale(1)",
            boxShadow: `0 0 40px 6px ${current.glow}`,
            borderColor: current.color,
            borderWidth: "1.5px",
            opacity: 0.85,
          }}
        />

        {/* Outer Ring */}
        <div
          className="absolute inset-3 rounded-full border border-border/80 transition-all duration-300"
          style={{
            transform:
              state === "speaking" || state === "listening"
                ? `scale(${1 + normalizedLevel * 0.0018})`
                : "scale(1)",
          }}
        />

        {/* Center Acoustic Core */}
        <div
          className="relative z-10 w-24 h-24 rounded-full flex flex-col items-center justify-center border border-border bg-card/90 shadow-2xl backdrop-blur-md transition-all duration-200"
          style={{
            boxShadow: `0 10px 30px -5px ${current.glow}, inset 0 1px 0 rgba(255,255,255,0.1)`,
          }}
        >
          <IconComponent
            className={`w-6 h-6 ${state === "thinking" ? "animate-spin" : ""}`}
            style={{ color: current.color }}
          />

          {/* Equalizer Frequency Bars */}
          <div className="flex items-center gap-1 mt-2 h-4">
            {[0.35, 0.75, 1, 0.8, 0.45].map((multiplier, i) => (
              <div
                key={i}
                className="w-1 rounded-full transition-all duration-100"
                style={{
                  height:
                    state === "speaking" || state === "listening"
                      ? `${Math.max(4, normalizedLevel * multiplier * 0.16 + 4)}px`
                      : "4px",
                  backgroundColor:
                    state === "speaking" || state === "listening"
                      ? current.color
                      : "currentColor",
                  opacity: state === "speaking" || state === "listening" ? 1 : 0.25,
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* State Status Pill */}
      <div className="flex flex-col items-center text-center space-y-1">
        <span
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold tracking-tight transition-colors ${current.pillClass}`}
        >
          <span
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ backgroundColor: current.color }}
          />
          {current.label}
        </span>
        <p className="text-[11px] text-muted-foreground font-mono">
          {current.sublabel}
        </p>
      </div>
    </div>
  );
}
