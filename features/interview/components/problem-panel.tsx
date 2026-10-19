"use client";

import { useInterviewStore } from "@/features/interview/store/interview-store";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const DIFFICULTY_STYLES: Record<string, string> = {
  easy: "text-emerald-700 bg-emerald-50 border border-emerald-200 dark:text-emerald-400 dark:bg-emerald-400/10 dark:border-transparent",
  medium: "text-amber-800 bg-amber-50 border border-amber-200 dark:text-amber-400 dark:bg-amber-400/10 dark:border-transparent",
  hard: "text-rose-700 bg-rose-50 border border-rose-200 dark:text-red-400 dark:bg-red-400/10 dark:border-transparent",
};

/**
 * Problem panel — displays coding question above the editor.
 * Per UI/UX spec: Title, Difficulty badge, Problem statement, Examples, Constraints.
 * "No unnecessary borders. Readable typography."
 */
export function ProblemPanel() {
  const problemTitle = useInterviewStore((s) => s.problemTitle);
  const problemDescription = useInterviewStore((s) => s.problemDescription);
  const difficulty = useInterviewStore((s) => s.difficulty);

  return (
    <div className="overflow-y-auto px-5 py-4">
      {/* Title + Difficulty badge */}
      <div className="flex items-center gap-3">
        <h2 className="text-base font-semibold tracking-tight">{problemTitle}</h2>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
            DIFFICULTY_STYLES[difficulty] ?? ""
          }`}
        >
          {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
        </span>
      </div>

      {/* Problem description — parsed with ReactMarkdown */}
      <div className="mt-4 text-sm leading-relaxed text-foreground/80 prose prose-sm dark:prose-invert max-w-none">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({ children }) => <h1 className="text-base font-bold text-foreground mt-2 mb-2">{children}</h1>,
            h2: ({ children }) => <h2 className="text-sm font-semibold text-foreground mt-3 mb-1.5">{children}</h2>,
            h3: ({ children }) => <h3 className="text-xs font-semibold text-foreground mt-2 mb-1">{children}</h3>,
            p: ({ children }) => <p className="mb-2 leading-relaxed text-foreground/85">{children}</p>,
            ul: ({ children }) => <ul className="list-disc pl-4 space-y-1 mb-2 text-foreground/85">{children}</ul>,
            ol: ({ children }) => <ol className="list-decimal pl-4 space-y-1 mb-2 text-foreground/85">{children}</ol>,
            li: ({ children }) => <li className="leading-relaxed">{children}</li>,
            strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
            code: ({ children }) => <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-foreground font-medium">{children}</code>,
            hr: () => <hr className="my-3 border-border/60" />,
          }}
        >
          {problemDescription}
        </ReactMarkdown>
      </div>
    </div>
  );
}
