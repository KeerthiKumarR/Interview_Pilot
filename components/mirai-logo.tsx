import React from "react";

interface MiraiLogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
  textClassName?: string;
  subtitle?: string;
  withBadge?: boolean;
}

/**
 * Mirai Copilot Brand Mark
 * Combines Microsoft/GitHub Copilot dynamic ribbon aesthetics,
 * the Japanese "Mirai" (Future) letter "M", and an autonomous AI Agent neural star core.
 */
export function MiraiLogo({
  className = "size-7",
  size = 28,
  showText = false,
  textClassName = "text-base font-bold tracking-tight text-foreground",
  subtitle,
  withBadge = false,
}: MiraiLogoProps) {
  return (
    <div className="inline-flex items-center gap-2.5">
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`shrink-0 ${className}`}
      >
        <defs>
          <linearGradient id="mlogo-bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#080C18" />
            <stop offset="50%" stopColor="#0D1326" />
            <stop offset="100%" stopColor="#050711" />
          </linearGradient>

          <linearGradient id="mlogo-border" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366F1" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#06B6D4" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#A855F7" stopOpacity="0.9" />
          </linearGradient>

          <linearGradient id="mlogo-ribbon" x1="0%" y1="20%" x2="100%" y2="80%">
            <stop offset="0%" stopColor="#38BDF8" />
            <stop offset="20%" stopColor="#3B82F6" />
            <stop offset="45%" stopColor="#6366F1" />
            <stop offset="55%" stopColor="#00F2FE" />
            <stop offset="78%" stopColor="#8B5CF6" />
            <stop offset="100%" stopColor="#EC4899" />
          </linearGradient>

          <linearGradient id="mlogo-visor" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#6366F1" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#00F2FE" />
            <stop offset="100%" stopColor="#D946EF" stopOpacity="0.8" />
          </linearGradient>

          <radialGradient id="mlogo-core" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="35%" stopColor="#67E8F9" />
            <stop offset="70%" stopColor="#06B6D4" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#6366F1" stopOpacity="0" />
          </radialGradient>

          <radialGradient id="mlogo-ambient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#00F2FE" stopOpacity="0.45" />
            <stop offset="60%" stopColor="#6366F1" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#6366F1" stopOpacity="0" />
          </radialGradient>

          <filter id="mlogo-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1.5" stdDeviation="2" floodColor="#00F2FE" floodOpacity="0.4" />
          </filter>
        </defs>

        {withBadge && (
          <>
            <rect width="64" height="64" rx="16" fill="url(#mlogo-bg)" />
            <rect
              x="0.75"
              y="0.75"
              width="62.5"
              height="62.5"
              rx="15.25"
              fill="none"
              stroke="url(#mlogo-border)"
              strokeWidth="1.5"
            />
          </>
        )}

        {/* Ambient Glow behind Star */}
        <circle cx="32" cy="27" r="16" fill="url(#mlogo-ambient)" />

        <g filter="url(#mlogo-shadow)">
          {/* Agent Visor Loop */}
          <path
            d="M14 36C19 41.5 25 43 32 43C39 43 45 41.5 50 36"
            fill="none"
            stroke="url(#mlogo-visor)"
            strokeWidth="2.8"
            strokeLinecap="round"
          />

          {/* Upper Brow Line */}
          <path
            d="M18 19C22 22 27 23.5 32 23.5C37 23.5 42 22 46 19"
            fill="none"
            stroke="#67E8F9"
            strokeOpacity="0.6"
            strokeWidth="1.8"
            strokeLinecap="round"
          />

          {/* Mirai Copilot 'M' Continuous Ribbon */}
          <path
            d="M10 52V18C10 13.5 14.5 12 17.5 15.5L32 34L46.5 15.5C49.5 12 54 13.5 54 18V52"
            fill="none"
            stroke="url(#mlogo-ribbon)"
            strokeWidth="6.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Ribbon Gloss Highlight */}
          <path
            d="M10 48V20C10 16.5 12.5 15.5 14.5 17.5L29.5 35M54 48V20C54 16.5 51.5 15.5 49.5 17.5L34.5 35"
            fill="none"
            stroke="#FFFFFF"
            strokeOpacity="0.4"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Central Neural Agent Core */}
          <circle cx="32" cy="26" r="6.5" fill="url(#mlogo-core)" />

          {/* 4-Point AI Star */}
          <path
            d="M32 18C32 22.5 28 26 23.5 26C28 26 32 29.5 32 34C32 29.5 36 26 40.5 26C36 26 32 22.5 32 18Z"
            fill="#FFFFFF"
          />
        </g>
      </svg>

      {showText && (
        <div className="flex flex-col leading-none">
          <span className={textClassName}>
            Mirai<span className="text-primary font-semibold"> Copilot</span>
          </span>
          {subtitle && (
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mt-0.5">
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
