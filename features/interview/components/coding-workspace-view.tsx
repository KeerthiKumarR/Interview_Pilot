"use client";

import React, { useState, useMemo } from "react";
import { useInterviewStore } from "@/features/interview/store/interview-store";
import { CodeEditor } from "@/features/editor/components/code-editor";
import { CODING_PROBLEMS } from "@/data/problems";
import {
  Play,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Code2,
  Check,
  RotateCw,
  Terminal,
  Send,
  HelpCircle,
} from "lucide-react";

interface ExecutionResult {
  stdout: string | null;
  stderr: string | null;
  compileOutput?: string | null;
  statusDescription: string;
  time?: string | null;
  memory?: number | null;
}

interface CodingWorkspaceViewProps {
  onRunCode?: (result: ExecutionResult) => void;
  onSubmitCode?: () => void;
}

export function CodingWorkspaceView({
  onRunCode,
  onSubmitCode,
}: CodingWorkspaceViewProps) {
  const problemTitle = useInterviewStore((s) => s.problemTitle);
  const problemDescription = useInterviewStore((s) => s.problemDescription);
  const language = useInterviewStore((s) => s.language);
  const difficulty = useInterviewStore((s) => s.difficulty);
  const currentQuestion = useInterviewStore((s) => s.currentQuestion);

  const [activeProblemTab, setActiveProblemTab] = useState<"problem" | "examples" | "constraints" | "hints">("problem");
  const [activeTestTab, setActiveTestTab] = useState<"cases" | "output">("cases");
  const [selectedCaseIndex, setSelectedCaseIndex] = useState(0);

  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);

  // Match the problem from curated CODING_PROBLEMS dataset or fallback
  const matchedProblem = useMemo(() => {
    if (!problemTitle) return null;
    const normalized = problemTitle.toLowerCase().trim();
    return (
      CODING_PROBLEMS.find((p) => p.title.toLowerCase().trim() === normalized) ||
      CODING_PROBLEMS.find((p) => normalized.includes(p.title.toLowerCase().trim())) ||
      null
    );
  }, [problemTitle]);

  const displayTitle =
    currentQuestion?.title?.replace(/^\d+[\.\:\-]\s*/, "").trim() ||
    matchedProblem?.title ||
    problemTitle ||
    "Coding Challenge";

  const displayDifficulty =
    difficulty || matchedProblem?.difficulty || "Medium";

  const displayTags = useMemo(() => {
    if (matchedProblem?.tags && matchedProblem.tags.length > 0) {
      return matchedProblem.tags;
    }
    return ["Algorithms", "Data Structure", "Problem Solving"];
  }, [matchedProblem]);

  // Resolve Examples
  const displayExamples = useMemo(() => {
    if (matchedProblem?.examples && matchedProblem.examples.length > 0) {
      return matchedProblem.examples;
    }
    return [
      {
        input: "nums = [2, 7, 11, 15], target = 9",
        output: "[0, 1]",
        explanation: "Because nums[0] + nums[1] == 9, we return [0, 1].",
      },
      {
        input: "nums = [3, 2, 4], target = 6",
        output: "[1, 2]",
      },
    ];
  }, [matchedProblem]);

  // Resolve Constraints
  const displayConstraints = useMemo(() => {
    if (matchedProblem?.constraints && matchedProblem.constraints.length > 0) {
      return matchedProblem.constraints;
    }
    return [
      "1 <= input.length <= 10^5",
      "Time complexity should be O(n) or O(n log n).",
      "Space complexity should not exceed memory bounds.",
    ];
  }, [matchedProblem]);

  // Execute Code via /api/execute sandbox API
  const handleRun = async () => {
    if (isRunning) return;

    const currentCode = useInterviewStore.getState().code;
    const currentLanguage = useInterviewStore.getState().language || "python";

    setIsRunning(true);
    setActiveTestTab("output");
    setExecutionResult(null);

    try {
      const res = await fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceCode: currentCode,
          language: currentLanguage,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const errResult: ExecutionResult = {
          stdout: null,
          stderr: errData.error || `Execution failed with HTTP status ${res.status}`,
          statusDescription: "Execution Error",
        };
        setExecutionResult(errResult);
        if (onRunCode) onRunCode(errResult);
        return;
      }

      const data = await res.json();
      const result: ExecutionResult = data.result || {
        stdout: data.stdout || "",
        stderr: data.stderr || null,
        statusDescription: data.statusDescription || "Completed",
        time: data.time || null,
      };

      setExecutionResult(result);

      // Dispatch event to sync with AI conversation panel
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("code-execution-result", { detail: result })
        );
      }

      if (onRunCode) onRunCode(result);
    } catch (err: any) {
      const errResult: ExecutionResult = {
        stdout: null,
        stderr: err.message || "Failed to connect to execution sandbox.",
        statusDescription: "Network Error",
      };
      setExecutionResult(errResult);
      if (onRunCode) onRunCode(errResult);
    } finally {
      setIsRunning(false);
    }
  };

  // Submit Code handler
  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    const currentCode = useInterviewStore.getState().code;
    const currentInterviewId = useInterviewStore.getState().interviewId;

    try {
      // 1. Save code in database
      if (currentInterviewId) {
        await fetch(`/api/interviews/${currentInterviewId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: currentCode }),
        });
      }

      // 2. Trigger parent submission / next stage
      if (onSubmitCode) {
        onSubmitCode();
      }
    } catch (err) {
      console.error("Submit code error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex h-full w-full overflow-hidden bg-card text-foreground divide-x divide-border transition-colors duration-200">
      {/* ─── LEFT: PROBLEM DETAILS PANEL (~46%) ──────────────────────── */}
      <div className="flex w-[46%] flex-col overflow-y-auto p-5 space-y-5 bg-card">
        {/* Top Tabs */}
        <div className="flex items-center gap-6 border-b border-border pb-3 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveProblemTab("problem")}
            className={`pb-1 transition cursor-pointer relative ${
              activeProblemTab === "problem"
                ? "text-foreground font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span>Problem</span>
            {activeProblemTab === "problem" && (
              <div className="absolute -bottom-3 left-0 right-0 h-0.5 bg-foreground rounded-full" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveProblemTab("examples")}
            className={`pb-1 transition cursor-pointer relative ${
              activeProblemTab === "examples"
                ? "text-foreground font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span>Examples</span>
            {activeProblemTab === "examples" && (
              <div className="absolute -bottom-3 left-0 right-0 h-0.5 bg-foreground rounded-full" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveProblemTab("constraints")}
            className={`pb-1 transition cursor-pointer relative ${
              activeProblemTab === "constraints"
                ? "text-foreground font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span>Constraints</span>
            {activeProblemTab === "constraints" && (
              <div className="absolute -bottom-3 left-0 right-0 h-0.5 bg-foreground rounded-full" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveProblemTab("hints")}
            className={`pb-1 transition cursor-pointer relative ${
              activeProblemTab === "hints"
                ? "text-foreground font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span>Hints</span>
            {activeProblemTab === "hints" && (
              <div className="absolute -bottom-3 left-0 right-0 h-0.5 bg-foreground rounded-full" />
            )}
          </button>
        </div>

        {/* Problem Title & Header Badges */}
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground mb-2.5">
            {displayTitle}
          </h1>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span
              className={`rounded-full px-2.5 py-0.5 font-semibold capitalize border ${
                displayDifficulty.toLowerCase() === "easy"
                  ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                  : displayDifficulty.toLowerCase() === "hard"
                  ? "bg-rose-500/15 border-rose-500/30 text-rose-600 dark:text-rose-400"
                  : "bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400"
              }`}
            >
              {displayDifficulty}
            </span>

            {displayTags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-secondary border border-border px-2.5 py-0.5 text-muted-foreground font-medium"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Tab 1: Problem Overview */}
        {activeProblemTab === "problem" && (
          <div className="space-y-4">
            <div className="text-xs sm:text-sm leading-relaxed text-foreground/90 whitespace-pre-line font-sans">
              {matchedProblem?.description ||
                problemDescription ||
                currentQuestion?.promptText ||
                "Write your solution in the code editor and run your code to verify against the test cases."}
            </div>

            {/* Quick Examples Preview */}
            <div className="space-y-3 pt-2">
              {displayExamples.slice(0, 2).map((ex, idx) => (
                <div key={idx} className="space-y-1">
                  <span className="text-xs font-semibold text-foreground">
                    Example {idx + 1}:
                  </span>
                  <div className="rounded-xl border border-border bg-secondary/30 p-3 text-xs font-mono space-y-1 text-foreground">
                    <div>
                      <span className="font-semibold text-foreground">Input: </span>
                      {ex.input}
                    </div>
                    <div>
                      <span className="font-semibold text-foreground">Output: </span>
                      {ex.output}
                    </div>
                    {ex.explanation && (
                      <div className="text-muted-foreground pt-0.5">
                        <span className="font-semibold text-foreground">Explanation: </span>
                        {ex.explanation}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: Full Examples */}
        {activeProblemTab === "examples" && (
          <div className="space-y-3">
            {displayExamples.map((ex, idx) => (
              <div key={idx} className="space-y-1.5">
                <span className="text-xs font-semibold text-foreground">
                  Example {idx + 1}:
                </span>
                <div className="rounded-xl border border-border bg-secondary/30 p-3.5 text-xs font-mono space-y-1.5 text-foreground">
                  <div>
                    <span className="font-semibold text-foreground">Input: </span>
                    <span className="text-foreground/90">{ex.input}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-foreground">Output: </span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{ex.output}</span>
                  </div>
                  {ex.explanation && (
                    <div className="text-muted-foreground pt-1 border-t border-border/50 text-[11px]">
                      <span className="font-semibold text-foreground">Explanation: </span>
                      {ex.explanation}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 3: Constraints */}
        {activeProblemTab === "constraints" && (
          <div className="space-y-2.5">
            <span className="text-xs font-semibold text-foreground block">
              Operational Constraints:
            </span>
            <ul className="space-y-2 text-xs text-foreground/90 font-mono">
              {displayConstraints.map((c, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2.5 rounded-lg border border-border bg-secondary/20 p-2.5"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Tab 4: Hints */}
        {activeProblemTab === "hints" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <HelpCircle className="h-4 w-4 text-primary" />
              <span>Interviewer Algorithmic Hints</span>
            </div>
            <div className="rounded-xl border border-border bg-secondary/25 p-3.5 text-xs text-muted-foreground space-y-2 leading-relaxed">
              <p>
                1. First clarify edge cases: What happens with empty inputs, single elements, or negative numbers?
              </p>
              <p>
                2. Consider what data structure lets you perform lookups in O(1) time rather than O(n).
              </p>
              <p>
                3. You can click <strong>Run</strong> at any time to compile and inspect output without submitting.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ─── RIGHT: CODE EDITOR & TEST CASES / OUTPUT PANEL (~54%) ───────────── */}
      <div className="flex flex-1 flex-col overflow-hidden bg-card">
        {/* Editor Action Header */}
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4 bg-card">
          {/* Language Selector Badge */}
          <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary/50 px-3 py-1.5 text-xs font-medium text-foreground">
            <Code2 className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="capitalize">{language === "python" ? "Python3" : language}</span>
          </div>

          {/* Action Buttons: Run & Submit */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRun}
              disabled={isRunning}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-bold text-primary-foreground hover:opacity-90 transition shadow-xs cursor-pointer disabled:opacity-50"
            >
              <Play className={`h-3 w-3 fill-current ${isRunning ? "animate-spin opacity-50" : ""}`} />
              <span>{isRunning ? "Running..." : "Run"}</span>
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-secondary/50 px-3.5 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary transition cursor-pointer disabled:opacity-50"
            >
              <Send className="h-3 w-3" />
              <span>{isSubmitting ? "Submitting..." : "Submit"}</span>
            </button>
          </div>
        </div>

        {/* Monaco Editor Container */}
        <div className="flex-1 overflow-hidden">
          <CodeEditor />
        </div>

        {/* ─── BOTTOM TEST CASES / OUTPUT DRAWER ─── */}
        <div className="h-48 border-t border-border bg-card flex flex-col shrink-0">
          {/* Drawer Tabs */}
          <div className="flex items-center justify-between border-b border-border px-4 py-2 text-xs font-semibold bg-muted/20">
            <div className="flex items-center gap-6">
              <button
                type="button"
                onClick={() => setActiveTestTab("cases")}
                className={`transition cursor-pointer relative pb-0.5 ${
                  activeTestTab === "cases"
                    ? "text-foreground font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span>Test Cases</span>
                {activeTestTab === "cases" && (
                  <div className="absolute -bottom-2 left-0 right-0 h-0.5 bg-foreground rounded-full" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTestTab("output")}
                className={`transition cursor-pointer relative pb-0.5 flex items-center gap-1.5 ${
                  activeTestTab === "output"
                    ? "text-foreground font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span>Output</span>
                {executionResult && (
                  <span
                    className={`h-2 w-2 rounded-full ${
                      executionResult.statusDescription === "Accepted"
                        ? "bg-emerald-500"
                        : "bg-rose-500"
                    }`}
                  />
                )}
                {activeTestTab === "output" && (
                  <div className="absolute -bottom-2 left-0 right-0 h-0.5 bg-foreground rounded-full" />
                )}
              </button>
            </div>

            {/* Quick Status Pill */}
            {executionResult && (
              <div className="flex items-center gap-2">
                <span
                  className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    executionResult.statusDescription === "Accepted"
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                      : "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                  }`}
                >
                  {executionResult.statusDescription === "Accepted" ? (
                    <Check className="h-3 w-3 stroke-[3]" />
                  ) : (
                    <AlertCircle className="h-3 w-3" />
                  )}
                  <span>{executionResult.statusDescription}</span>
                </span>
                {executionResult.time && (
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {executionResult.time}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Drawer Content */}
          <div className="flex-1 overflow-y-auto p-3 text-xs">
            {/* VIEW A: Test Cases List */}
            {activeTestTab === "cases" && (
              <div className="space-y-2 font-mono">
                {displayExamples.map((ex, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center justify-between rounded-lg border px-3 py-2 transition ${
                      selectedCaseIndex === idx
                        ? "border-primary/50 bg-secondary/50 text-foreground"
                        : "border-border bg-secondary/20 text-muted-foreground hover:bg-secondary/40"
                    }`}
                  >
                    <div className="flex items-center gap-3 truncate">
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="font-semibold text-foreground">Case {idx + 1}</span>
                      <span className="text-muted-foreground truncate">{ex.input}</span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 font-sans text-[11px] font-semibold">
                      {executionResult ? (
                        executionResult.statusDescription === "Accepted" ? (
                          <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                            <Check className="h-3.5 w-3.5 stroke-[3]" />
                            <span>Passed</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-rose-500">
                            <AlertCircle className="h-3.5 w-3.5" />
                            <span>Failed</span>
                          </div>
                        )
                      ) : (
                        <span className="text-muted-foreground/70 font-normal">Ready</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* VIEW B: Sandbox Output */}
            {activeTestTab === "output" && (
              <div className="h-full font-mono space-y-2">
                {isRunning ? (
                  <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground py-4">
                    <RotateCw className="h-5 w-5 animate-spin text-primary" />
                    <span className="font-sans text-xs font-medium">
                      Compiling and running code in sandbox...
                    </span>
                  </div>
                ) : executionResult ? (
                  <div className="space-y-2.5">
                    {/* Stdout Output */}
                    {executionResult.stdout && (
                      <div>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                          Standard Output
                        </span>
                        <pre className="rounded-lg border border-border bg-secondary/40 p-3 font-mono text-xs text-foreground whitespace-pre-wrap select-text leading-relaxed">
                          {executionResult.stdout}
                        </pre>
                      </div>
                    )}

                    {/* Stderr / Error Output */}
                    {executionResult.stderr && (
                      <div>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-rose-500 block mb-1">
                          Error Details / Stacktrace
                        </span>
                        <pre className="rounded-lg border border-rose-500/25 bg-rose-500/10 p-3 font-mono text-xs text-rose-600 dark:text-rose-400 whitespace-pre-wrap select-text leading-relaxed">
                          {executionResult.stderr}
                        </pre>
                      </div>
                    )}

                    {/* Empty output case */}
                    {!executionResult.stdout && !executionResult.stderr && (
                      <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 p-2">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Code executed successfully with return code 0. (No output printed to stdout)</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-1.5 text-muted-foreground py-6">
                    <Terminal className="h-5 w-5 text-muted-foreground/60" />
                    <span className="font-sans text-xs">
                      No execution output yet. Click <strong>Run</strong> above to test your code.
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
