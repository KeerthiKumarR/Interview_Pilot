"use client";

import React, { useState, useMemo } from "react";
import { useUser } from "@clerk/nextjs";
import { useInterviewStore } from "@/features/interview/store/interview-store";
import { CodeEditor } from "@/features/editor/components/code-editor";
import { CODING_PROBLEMS } from "@/data/problems";
import { getVivaStarterCode } from "@/lib/interview/starter-code";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
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
  Globe,
  ExternalLink,
  PenTool,
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
  const { user } = useUser();
  const problemTitle = useInterviewStore((s) => s.problemTitle);
  const problemDescription = useInterviewStore((s) => s.problemDescription);
  const language = useInterviewStore((s) => s.language);
  const difficulty = useInterviewStore((s) => s.difficulty);
  const currentQuestion = useInterviewStore((s) => s.currentQuestion);

  const [activeProblemTab, setActiveProblemTab] = useState<"problem" | "examples" | "constraints" | "hints">("problem");
  const [activeTestTab, setActiveTestTab] = useState<"cases" | "output">("output");
  const [selectedCaseIndex, setSelectedCaseIndex] = useState(0);

  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedRecently, setSubmittedRecently] = useState(false);
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);

  const isViva = useMemo(() => {
    return !problemTitle || (
      problemTitle.toLowerCase().includes("viva") ||
      problemTitle.toLowerCase().includes("placement") ||
      problemTitle.toLowerCase().includes("project")
    );
  }, [problemTitle]);

  const vivaMetadata = useMemo(() => {
    if (!isViva) return null;

    let roleName = "Software Engineer";
    let projectTitle: string | null = null;
    let liveUrl: string | null = null;
    let repoUrl: string | null = null;
    let techStack: string | null = null;

    if (problemTitle) {
      if (problemTitle.includes(":")) {
        const parts = problemTitle.split(":");
        roleName = parts[0].replace(/Placement Viva/i, "").trim() || "Software Engineer";
        projectTitle = parts[1].trim();
      } else {
        roleName = problemTitle.replace(/Placement Viva/i, "").trim() || "Software Engineer";
      }
    }

    if (problemDescription) {
      const liveMatch = problemDescription.match(/\-\s*\*\*Live Deployment\*\*:\s*([^\n\r]+)/i);
      if (liveMatch && liveMatch[1]?.trim().startsWith("http")) {
        liveUrl = liveMatch[1].trim();
      }
      const repoMatch = problemDescription.match(/\-\s*\*\*Source Code Repository\*\*:\s*([^\n\r]+)/i);
      if (repoMatch && repoMatch[1]?.trim().startsWith("http")) {
        repoUrl = repoMatch[1].trim();
      }
      const stackMatch = problemDescription.match(/\-\s*\*\*Verified Tech Stack\*\*:\s*([^\n\r]+)/i);
      if (stackMatch && stackMatch[1]?.trim()) {
        techStack = stackMatch[1].trim();
      }
    }

    return {
      roleName,
      projectTitle,
      liveUrl,
      repoUrl,
      techStack,
    };
  }, [isViva, problemTitle, problemDescription]);

  // Match the problem from curated CODING_PROBLEMS dataset or fallback (only for standalone DSA challenges)
  const matchedProblem = useMemo(() => {
    if (!problemTitle || isViva) return null;
    const normalized = problemTitle.toLowerCase().trim();
    return (
      CODING_PROBLEMS.find((p) => p.title.toLowerCase().trim() === normalized) ||
      CODING_PROBLEMS.find((p) => normalized.includes(p.title.toLowerCase().trim())) ||
      null
    );
  }, [problemTitle, isViva]);

  const displayTitle = useMemo(() => {
    if (isViva && problemTitle) return problemTitle;
    return (
      currentQuestion?.title?.replace(/^\d+[\.\:\-]\s*/, "").trim() ||
      matchedProblem?.title ||
      problemTitle ||
      "Technical Viva & Coding"
    );
  }, [isViva, problemTitle, currentQuestion, matchedProblem]);

  const displayDifficulty =
    difficulty || matchedProblem?.difficulty || (isViva ? "Placement Track" : "Medium");

  const displayTags = useMemo(() => {
    if (isViva) {
      return ["Full Stack", "Project Defense", "System Architecture", "Live Demo"];
    }
    if (matchedProblem?.tags && matchedProblem.tags.length > 0) {
      return matchedProblem.tags;
    }
    return ["Algorithms", "Data Structure", "Problem Solving"];
  }, [isViva, matchedProblem]);

  // Resolve Examples
  const displayExamples = useMemo(() => {
    if (isViva) {
      const proj = vivaMetadata?.projectTitle || "Application";
      return [
        {
          input: `GET /api/health → 200 OK`,
          output: `{"status": "healthy", "service": "${proj}"}`,
          explanation: "Health check and microservice discovery probe.",
        },
        {
          input: `POST /api/action → payload: { "action": "test", "project": "${proj}" }`,
          output: `{"success": true, "durationMs": 42}`,
          explanation: "Asynchronous task queue handler or database mutation.",
        },
      ];
    }
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
  }, [isViva, vivaMetadata, matchedProblem]);

  // Resolve Constraints
  const displayConstraints = useMemo(() => {
    if (isViva) {
      return [
        "Network Latency: Sub-100ms response targets for primary endpoints.",
        "Security & Auth: Strict CORS hygiene, environment variable segregation, and rate limiting.",
        "Database: Optimized indexing, connection pooling, and connection reuse under peak load.",
      ];
    }
    if (matchedProblem?.constraints && matchedProblem.constraints.length > 0) {
      return matchedProblem.constraints;
    }
    return [
      "1 <= input.length <= 10^5",
      "Time complexity should be O(n) or O(n log n).",
      "Space complexity should not exceed memory bounds.",
    ];
  }, [isViva, matchedProblem]);

  // Switch programming language dynamically in real time
  const handleLanguageChange = async (newLang: string) => {
    if (!newLang || newLang === language) return;

    useInterviewStore.getState().setLanguage(newLang);

    // If current code is the default starter code or empty, swap it to the new language's starter code
    const currentCode = useInterviewStore.getState().code || "";
    const isStarterCode =
      !currentCode.trim() ||
      currentCode.includes("Viva Scratchpad") ||
      currentCode.includes("export async function handleRequest") ||
      currentCode.includes("public static void main") ||
      currentCode.includes("def handle_request") ||
      currentCode.includes("int main()") ||
      currentCode.includes("func HandleRequest");

    if (isStarterCode) {
      const roleName = vivaMetadata?.roleName || "Technical Placement";
      const projectRef = vivaMetadata?.projectTitle || "System Architecture";
      const stackSkills = vivaMetadata?.techStack || "Core Architecture";
      const newStarter = getVivaStarterCode(newLang, roleName, projectRef, stackSkills);
      useInterviewStore.getState().setCode(newStarter);
    }

    // Persist to backend so it survives refresh
    try {
      const currentInterviewId = useInterviewStore.getState().interviewId;
      if (currentInterviewId) {
        await fetch(`/api/interviews/${currentInterviewId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ language: newLang }),
        });
      }
    } catch (e) {
      console.warn("Failed to persist language change", e);
    }
  };

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

      // 2. Trigger parent submission / AI evaluation
      if (onSubmitCode) {
        onSubmitCode();
      }

      setSubmittedRecently(true);
      setTimeout(() => setSubmittedRecently(false), 3000);
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
            <span>{isViva ? "Viva Dossier" : "Problem"}</span>
            {activeProblemTab === "problem" && (
              <div className="absolute -bottom-3 left-0 right-0 h-0.5 bg-foreground rounded-full" />
            )}
          </button>

          {!isViva ? (
            <>
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
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setActiveProblemTab("hints")}
                className={`pb-1 transition cursor-pointer relative flex items-center gap-1.5 ${
                  activeProblemTab === "hints"
                    ? "text-foreground font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <HelpCircle className="h-3 w-3" />
                <span>Viva Rubric & Tips</span>
                {activeProblemTab === "hints" && (
                  <div className="absolute -bottom-3 left-0 right-0 h-0.5 bg-foreground rounded-full" />
                )}
              </button>
            </>
          )}
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
                  : "bg-primary/15 border-primary/30 text-primary"
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

        {/* Tab 1: Problem / Viva Overview */}
        {activeProblemTab === "problem" && (
          <div className="space-y-4">
            {isViva ? (
              <div className="space-y-4">
                {/* 1. Featured Project Card */}
                <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20 text-primary">
                        <Globe className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-foreground">
                          {vivaMetadata?.projectTitle ? `Featured Project: ${vivaMetadata.projectTitle}` : "Placement Candidate Dossier"}
                        </h4>
                        <p className="text-[11px] text-muted-foreground">
                          Verified project in scope for live technical defense & viva
                        </p>
                      </div>
                    </div>
                    {vivaMetadata?.liveUrl && (
                      <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-500">
                        Live Deployed
                      </span>
                    )}
                  </div>

                  {(vivaMetadata?.liveUrl || vivaMetadata?.repoUrl) && (
                    <div className="flex flex-wrap gap-2 text-xs pt-1">
                      {vivaMetadata?.liveUrl && (
                        <a
                          href={vivaMetadata.liveUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card hover:bg-secondary px-3 py-1.5 text-xs font-medium text-foreground transition-colors shadow-sm"
                        >
                          <Globe className="h-3.5 w-3.5 text-primary" />
                          <span>Launch Live App</span>
                          <ExternalLink className="h-3 w-3 text-muted-foreground" />
                        </a>
                      )}
                      {vivaMetadata?.repoUrl && (
                        <a
                          href={vivaMetadata.repoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card hover:bg-secondary px-3 py-1.5 text-xs font-medium text-foreground transition-colors shadow-sm"
                        >
                          <Code2 className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>GitHub Repository</span>
                          <ExternalLink className="h-3 w-3 text-muted-foreground" />
                        </a>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-2.5 border-t border-border/40">
                    <div>
                      <span className="text-muted-foreground">Target Role:</span>{" "}
                      <span className="font-semibold text-foreground">{vivaMetadata?.roleName || "Full Stack Developer"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Candidate:</span>{" "}
                      <span className="font-semibold text-foreground">{user?.fullName || user?.firstName || "Candidate"}</span>
                    </div>
                    {vivaMetadata?.techStack && (
                      <div className="col-span-2 flex items-center gap-1.5 flex-wrap pt-1">
                        <span className="text-muted-foreground">Verified Stack:</span>{" "}
                        {vivaMetadata.techStack.split(",").map((tech) => (
                          <span
                            key={tech.trim()}
                            className="rounded-md bg-secondary/80 border border-border/60 px-2 py-0.5 text-[10px] font-mono font-medium text-foreground"
                          >
                            {tech.trim()}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Viva Objectives & Defense Rubric */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                      Evaluation Objectives & Rubric
                    </h5>
                    <span className="text-[11px] text-muted-foreground">15–20 Mins Defense</span>
                  </div>

                  <div className="space-y-2">
                    <div className="rounded-xl border border-border/80 bg-secondary/20 p-3 space-y-1.5">
                      <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-primary text-[10px] font-bold">1</span>
                        <span>System Architecture & Data Flow</span>
                      </div>
                      <ul className="text-[11px] text-muted-foreground space-y-1 pl-7 list-disc">
                        <li>Component hierarchy, state hydration, and client-server boundaries.</li>
                        <li>Database schema design, document relationships, and indexing strategies.</li>
                      </ul>
                    </div>

                    <div className="rounded-xl border border-border/80 bg-secondary/20 p-3 space-y-1.5">
                      <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-primary text-[10px] font-bold">2</span>
                        <span>API Design & Network Latency</span>
                      </div>
                      <ul className="text-[11px] text-muted-foreground space-y-1 pl-7 list-disc">
                        <li>RESTful API endpoints, request/response lifecycle, and middleware architecture.</li>
                        <li>Error boundary handling, response validation, and CORS hygiene.</li>
                      </ul>
                    </div>

                    <div className="rounded-xl border border-border/80 bg-secondary/20 p-3 space-y-1.5">
                      <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-primary text-[10px] font-bold">3</span>
                        <span>Engineering Trade-offs & Production Scaling</span>
                      </div>
                      <ul className="text-[11px] text-muted-foreground space-y-1 pl-7 list-disc">
                        <li>Caching strategies, handling stream buffering, and database connection pooling.</li>
                        <li>Code modularity, clean architecture, and technical debt management.</li>
                      </ul>
                    </div>

                    <div className="rounded-xl border border-border/80 bg-secondary/20 p-3 space-y-1.5">
                      <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-primary text-[10px] font-bold">4</span>
                        <span>Behavioral & Project Ownership</span>
                      </div>
                      <ul className="text-[11px] text-muted-foreground space-y-1 pl-7 list-disc">
                        <li>STAR-method evaluation on handling production bugs, deadline pressure, and execution.</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* 3. Real-Time Spoken Viva Instruction Note */}
                <div className="rounded-xl border border-border/60 bg-muted/40 p-3 text-[11.5px] text-muted-foreground flex items-start gap-2.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 mt-1 shrink-0 animate-pulse" />
                  <div className="space-y-0.5">
                    <p className="font-semibold text-foreground text-xs">Live Voice Viva Active</p>
                    <p>The AI interviewer converses with you in real-time. Use the scratchpad editor on the right if requested to draft an API endpoint, middleware, or optimize logic.</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="prose prose-sm dark:prose-invert max-w-none text-xs sm:text-sm leading-relaxed text-foreground/90">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h1: ({ children }) => <h1 className="text-base sm:text-lg font-bold text-foreground mt-2 mb-2">{children}</h1>,
                      h2: ({ children }) => <h2 className="text-sm sm:text-base font-semibold text-foreground mt-3 mb-1.5">{children}</h2>,
                      h3: ({ children }) => <h3 className="text-xs sm:text-sm font-semibold text-foreground mt-2.5 mb-1">{children}</h3>,
                      p: ({ children }) => <p className="mb-2 leading-relaxed text-foreground/85">{children}</p>,
                      ul: ({ children }) => <ul className="list-disc pl-4 space-y-1 mb-2 text-foreground/85">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal pl-4 space-y-1 mb-2 text-foreground/85">{children}</ol>,
                      li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                      strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
                      code: ({ children }) => <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-foreground font-medium">{children}</code>,
                      hr: () => <hr className="my-3 border-border/60" />,
                    }}
                  >
                    {problemDescription ||
                      matchedProblem?.description ||
                      currentQuestion?.promptText ||
                      "Welcome to your coding challenge."}
                  </ReactMarkdown>
                </div>

                {/* Quick Examples Preview (Only for standalone DSA problems) */}
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

        {/* Tab 4: Hints / Viva Rubric */}
        {activeProblemTab === "hints" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <HelpCircle className="h-4 w-4 text-primary" />
              <span>{isViva ? "Placement Viva Evaluation Rubric" : "Interviewer Algorithmic Hints"}</span>
            </div>
            {isViva ? (
              <div className="rounded-xl border border-border bg-secondary/25 p-3.5 text-xs text-muted-foreground space-y-3 leading-relaxed">
                <div>
                  <h6 className="font-semibold text-foreground mb-1">Scoring Criteria:</h6>
                  <ul className="space-y-1 text-[11px]">
                    <li>• <strong>Technical Depth (30%):</strong> Core understanding of JavaScript, React hooks, Node.js event loop, and database modeling.</li>
                    <li>• <strong>Architecture & Defense (25%):</strong> Clear rationale behind project architecture decisions (component separation, API handling, auth).</li>
                    <li>• <strong>Communication & Articulation (25%):</strong> Concise explanations, active listening, and structured answers.</li>
                    <li>• <strong>Code & Optimization (20%):</strong> Writing clean, maintainable logic and analyzing trade-offs.</li>
                  </ul>
                </div>
                <div className="pt-2 border-t border-border/40">
                  <h6 className="font-semibold text-foreground mb-1">Candidate Pro-Tips:</h6>
                  <ul className="space-y-1 text-[11px]">
                    <li>• Speak aloud as you formulate ideas; the AI interviewer listens actively to your train of thought.</li>
                    <li>• Structure your technical answers clearly around trade-offs, caching, latency, and failure modes.</li>
                    <li>• Feel free to ask clarifying questions before answering complex architecture prompts.</li>
                  </ul>
                </div>
              </div>
            ) : (
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
            )}
          </div>
        )}
      </div>

      {/* ─── RIGHT: CODE EDITOR & TEST CASES / OUTPUT PANEL (~54%) ───────────── */}
      <div className="flex flex-1 flex-col overflow-hidden bg-card">
        {/* Editor Action Header */}
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4 bg-card">
          {/* Interactive Language Selector Dropdown */}
          <div className="flex items-center gap-1.5 rounded-lg border border-border bg-secondary/50 px-2.5 py-1 text-xs font-medium text-foreground hover:border-primary/50 transition">
            <Code2 className="h-3.5 w-3.5 text-primary shrink-0" />
            <select
              value={language || "javascript"}
              onChange={(e) => handleLanguageChange(e.target.value)}
              aria-label="Select Programming Language"
              className="bg-transparent font-semibold text-foreground focus:outline-none cursor-pointer pr-1"
            >
              <option value="javascript" className="bg-card text-foreground">JavaScript</option>
              <option value="typescript" className="bg-card text-foreground">TypeScript</option>
              <option value="python" className="bg-card text-foreground">Python 3</option>
              <option value="java" className="bg-card text-foreground">Java</option>
              <option value="cpp" className="bg-card text-foreground">C++</option>
              <option value="go" className="bg-card text-foreground">Go</option>
            </select>
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
              className={`flex items-center gap-1.5 rounded-lg border px-3.5 py-1.5 text-xs font-semibold transition cursor-pointer disabled:opacity-50 ${
                submittedRecently
                  ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                  : "border-border bg-secondary/50 text-foreground hover:bg-secondary"
              }`}
            >
              {submittedRecently ? (
                <>
                  <Check className="h-3 w-3 stroke-[3]" />
                  <span>Submitted to Interviewer!</span>
                </>
              ) : (
                <>
                  <Send className="h-3 w-3" />
                  <span>{isSubmitting ? "Submitting..." : "Submit Code"}</span>
                </>
              )}
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
              {!isViva && (
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
              )}

              <button
                type="button"
                onClick={() => setActiveTestTab("output")}
                className={`transition cursor-pointer relative pb-0.5 flex items-center gap-1.5 ${
                  activeTestTab === "output" || isViva
                    ? "text-foreground font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span>Console Output</span>
                {executionResult && (
                  <span
                    className={`h-2 w-2 rounded-full ${
                      executionResult.statusDescription === "Accepted"
                        ? "bg-emerald-500"
                        : "bg-rose-500"
                    }`}
                  />
                )}
                {(activeTestTab === "output" || isViva) && (
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
            {!isViva && activeTestTab === "cases" && (
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
            {(isViva || activeTestTab === "output") && (
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
