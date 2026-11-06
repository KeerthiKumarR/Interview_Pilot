"use client";

import { cleanInterviewChatText } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Sanitizes text for chat UI so unclosed asterisks, raw markdown symbols, or credit chatter never show up.
 */
function sanitizeChatText(text: string): string {
  return cleanInterviewChatText(text);
}

export function MessageContent({ content, isUser }: { content: string; isUser?: boolean }) {
  const textClass = isUser
    ? "text-emerald-950 dark:text-emerald-100 font-medium text-[13.5px]"
    : "text-slate-900 dark:text-slate-100 font-normal text-[13.5px]";

  const cleanContent = sanitizeChatText(content);

  // If dialogue has not arrived yet (e.g. model is still producing internal reasoning), show discreet typing dots
  if (!cleanContent) {
    return (
      <div className="flex items-center gap-1 py-1.5">
        <span
          className="inline-block h-1.5 w-1.5 rounded-full bg-muted-foreground/50 animate-bounce"
          style={{ animationDelay: "0ms", animationDuration: "600ms" }}
        />
        <span
          className="inline-block h-1.5 w-1.5 rounded-full bg-muted-foreground/50 animate-bounce"
          style={{ animationDelay: "150ms", animationDuration: "600ms" }}
        />
        <span
          className="inline-block h-1.5 w-1.5 rounded-full bg-muted-foreground/50 animate-bounce"
          style={{ animationDelay: "300ms", animationDuration: "600ms" }}
        />
      </div>
    );
  }

  return (
    <div className={`leading-relaxed prose prose-sm dark:prose-invert max-w-none ${textClass}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {cleanContent}
      </ReactMarkdown>
    </div>
  );
}
