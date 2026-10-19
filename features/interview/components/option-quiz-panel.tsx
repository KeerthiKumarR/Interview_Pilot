"use client";

import React, { useState } from "react";
import { useInterviewStore } from "@/features/interview/store/interview-store";
import {
  Clock,
  Sparkles,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

interface OptionQuizPanelProps {
  onOptionSelected?: (selectedIdx: number, selectedText: string) => void;
  onNextCategory?: () => void;
  onPrevCategory?: () => void;
}

export function OptionQuizPanel({
  onOptionSelected,
  onNextCategory,
  onPrevCategory,
}: OptionQuizPanelProps) {
  const currentQuestion = useInterviewStore((s) => s.currentQuestion);
  const currentQuestionIndex = useInterviewStore((s) => s.currentQuestionIndex);
  const categoryTimeRemainingSeconds = useInterviewStore((s) => s.categoryTimeRemainingSeconds);
  const selectedOptionIndex = useInterviewStore((s) => s.selectedOptionIndex);
  const setSelectedOptionIndex = useInterviewStore((s) => s.setSelectedOptionIndex);
  const quizSubmitted = useInterviewStore((s) => s.quizSubmitted);
  const setQuizSubmitted = useInterviewStore((s) => s.setQuizSubmitted);

  const [localSelectedIndex, setLocalSelectedIndex] = useState<number>(
    selectedOptionIndex !== null ? selectedOptionIndex : 0
  );

  const rawOptions = currentQuestion?.options;
  const options: string[] = Array.isArray(rawOptions) && rawOptions.length > 0
    ? rawOptions
    : [
        "Hash Map / Hash Table",
        "Binary Search Tree",
        "Doubly Linked List",
        "Sorted Array with Binary Search",
      ];

  const OPTION_LETTERS = ["A", "B", "C", "D"];

  const formatTimer = (secs: number) => {
    const mins = Math.floor(Math.max(0, secs) / 60);
    const rem = Math.max(0, secs) % 60;
    return `${mins.toString().padStart(2, "0")}:${rem.toString().padStart(2, "0")}`;
  };

  const handleSelectOption = (idx: number) => {
    setLocalSelectedIndex(idx);
    setSelectedOptionIndex(idx);
  };

  const handleSubmit = () => {
    setQuizSubmitted(true);
    if (onOptionSelected) {
      onOptionSelected(localSelectedIndex, options[localSelectedIndex]);
    }
    if (onNextCategory) {
      onNextCategory();
    }
  };

  const promptTitle =
    currentQuestion?.promptText ||
    "Which data structure provides O(1) average time complexity for complement lookups and key-value retrieval in this problem?";

  return (
    <div className="flex h-full w-full flex-col justify-between p-6 sm:p-8 bg-card text-foreground transition-colors duration-200">
      {/* Top Card Header */}
      <div className="flex items-center justify-between">
        {/* Pills */}
        <div className="flex items-center gap-2.5">
          <span className="rounded-full border border-border bg-secondary/50 px-3 py-1 text-xs font-medium text-muted-foreground">
            Stage {currentQuestionIndex + 1} of 4
          </span>
          <span className="rounded-full border border-border bg-secondary/50 px-3 py-1 text-xs font-medium text-muted-foreground">
            Conceptual & Data Structures
          </span>
        </div>

        {/* Stage Timer (e.g. 00:21) */}
        <div className="flex items-center gap-1.5 rounded-lg border border-border bg-secondary/50 px-3 py-1 text-xs font-mono text-foreground">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          <span>{formatTimer(categoryTimeRemainingSeconds || 21)}</span>
        </div>
      </div>

      {/* Main Quiz Content */}
      <div className="my-auto max-w-2xl w-full mx-auto space-y-6">
        {/* Question Counter Pill */}
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          <Sparkles className="h-4 w-4 text-primary" />
          <span>Question {currentQuestion?.order || 1}</span>
        </div>

        {/* Question Title */}
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground leading-relaxed">
          {promptTitle}
        </h1>

        {/* Option Cards Stack */}
        <div className="space-y-3 pt-2">
          {options.map((opt, idx) => {
            const isSelected = localSelectedIndex === idx;

            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectOption(idx)}
                className={`group flex w-full items-center justify-between rounded-xl border p-4 transition-all text-left cursor-pointer ${
                  isSelected
                    ? "border-primary bg-primary/10 shadow-xs ring-1 ring-primary/30 text-foreground"
                    : "border-border bg-secondary/30 hover:border-primary/40 hover:bg-secondary/60 text-foreground"
                }`}
              >
                {/* Left: Letter Box + Option Text */}
                <div className="flex items-center gap-4">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-semibold transition ${
                      isSelected
                        ? "bg-primary text-primary-foreground font-bold shadow-xs"
                        : "border border-border bg-secondary text-muted-foreground group-hover:text-foreground"
                    }`}
                  >
                    {OPTION_LETTERS[idx] || idx + 1}
                  </div>
                  <span
                    className={`text-sm font-medium ${
                      isSelected ? "text-foreground font-semibold" : "text-muted-foreground group-hover:text-foreground"
                    }`}
                  >
                    {opt}
                  </span>
                </div>

                {/* Right: Radio Button Circle */}
                <div
                  className={`flex h-5 w-5 items-center justify-center rounded-full border transition ${
                    isSelected
                      ? "border-primary bg-transparent"
                      : "border-border bg-transparent group-hover:border-foreground/50"
                  }`}
                >
                  {isSelected && <div className="h-2.5 w-2.5 rounded-full bg-primary" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer Navigation Bar */}
      <div className="flex items-center justify-between border-t border-border pt-4">
        {/* Previous Button */}
        <button
          type="button"
          onClick={onPrevCategory}
          className="flex items-center gap-2 rounded-xl border border-border bg-secondary/50 px-4 py-2.5 text-xs font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground transition cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Previous</span>
        </button>

        {/* Submit Answer Button */}
        <button
          type="button"
          onClick={handleSubmit}
          className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground hover:opacity-90 shadow-sm transition cursor-pointer"
        >
          <span>Submit Answer</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
