"use client";

import { useState, type ReactNode } from "react";
import { StartInterviewModal } from "./start-interview-modal";

interface StartInterviewButtonProps {
  className?: string;
  children?: ReactNode;
}

/**
 * "Start Interview" CTA button that opens the configuration modal.
 * Can be rendered anywhere in the UI with custom styling or default styles.
 */
export function StartInterviewButton({ className, children }: StartInterviewButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={
          className ||
          "inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-foreground px-5 text-sm font-black text-background border-2 border-foreground neo-shadow-sm hover:translate-x-0.5 hover:-translate-y-0.5 transition-all cursor-pointer"
        }
      >
        {children || "Start Interview"}
      </button>
      {isOpen && <StartInterviewModal onClose={() => setIsOpen(false)} />}
    </>
  );
}
