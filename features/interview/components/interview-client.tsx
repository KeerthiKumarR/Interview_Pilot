"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useInterviewStore, type TranscriptMessage } from "@/features/interview/store/interview-store";
import { ProblemPanel } from "./problem-panel";
import { ConversationPanel } from "./conversation-panel";
import { TextInput } from "./text-input";
import { VoiceControls } from "./voice-controls";
import { AIAvatar } from "./ai-avatar";
import { InterviewNav } from "./interview-nav";
import { CodeEditor } from "@/features/editor/components/code-editor";
import { EditorControls } from "@/features/editor/components/editor-controls";
import { VoiceInput } from "./voice-input";
import { HintButton } from "./hint-button";
import { InterviewLobby } from "./interview-lobby";
import { WarningToast } from "./warning-toast";
import { CameraPreview } from "./camera-preview";
import { ConversationRoomView } from "./conversation-room-view";
import { WhiteboardCanvas } from "./whiteboard-canvas";
import { OptionQuizPanel } from "./option-quiz-panel";
import { InterviewStageShell } from "./interview-stage-shell";
import { CodingWorkspaceView } from "./coding-workspace-view";
import { ResizableSplitter } from "@/components/resizable-splitter";
import { useChatStream } from "@/hooks/use-chat-stream";
import { useTTS } from "@/hooks/use-tts";
import { useTabSwitchDetection } from "@/hooks/use-tab-switch-detection";
import { useFaceDetection } from "@/hooks/use-face-detection";

import { useRouter } from "next/navigation";
import { speakBackend } from "@/hooks/use-tts";

interface InterviewClientProps {
  interview: {
    id: string;
    language: string;
    difficulty: string;
    duration: number;
    status: string;
    problemTitle: string;
    problemDescription: string;
    code: string;
    tabSwitchCount?: number;
    outOfFrameCount?: number;
    startedAt: number | null;
    jobRoleId?: string | null;
    jobRole?: any;
    questions?: any[];
  };
  existingMessages: TranscriptMessage[];
}

export const VIVA_STAGES = [
  {
    order: 1,
    title: "1. Intro & Role Fit",
    stage: "intro",
    category: "code_editor" as const,
    durationMinutes: 3,
    promptText: "Please introduce yourself, your technical background, and your focus in Full Stack engineering.",
    expectedRubric: ["Role alignment", "Technical breadth", "Communication clarity"],
  },
  {
    order: 2,
    title: "2. Project Defense",
    stage: "project_defense",
    category: "code_editor" as const,
    durationMinutes: 6,
    promptText: "Walk me through how you designed, built, and deployed your featured project. What were the key architecture choices?",
    expectedRubric: ["System design", "State & API design", "Deployment verification"],
  },
  {
    order: 3,
    title: "3. Architecture & Code",
    stage: "technical_deepdive",
    category: "code_editor" as const,
    durationMinutes: 6,
    promptText: "Let's explore technical trade-offs, database indexing, caching, and see how you implement or optimize code in the scratchpad.",
    expectedRubric: ["Database performance", "Error handling", "Clean code practices"],
  },
  {
    order: 4,
    title: "4. Wrap-up & Scoring",
    stage: "wrap_up",
    category: "code_editor" as const,
    durationMinutes: 3,
    promptText: "To wrap up our placement viva, let's touch upon engineering collaboration and any questions you have for me.",
    expectedRubric: ["Behavioral ownership", "Curiosity & culture fit", "Readiness evaluation"],
  },
];

/**
 * Main interview layout — flexible, resizable panels.
 * Supports horizontal (side-by-side) and vertical (stacked) layouts.
 * Panels (problem, AI chat) are collapsible for a minimal interview experience.
 *
 * KEY ARCHITECTURE: useChatStream and useTTS hooks live HERE so they
 * never unmount during mode switches. Both TextInput and VoiceInput
 * are always mounted (hidden via CSS) to prevent remount issues.
 */
export function InterviewClient({
  interview,
  existingMessages,
}: InterviewClientProps) {
  const router = useRouter();
  const initInterview = useInterviewStore((s) => s.initInterview);
  const mode = useInterviewStore((s) => s.mode);
  const status = useInterviewStore((s) => s.status);
  const layoutMode = useInterviewStore((s) => s.layoutMode);
  const showProblem = useInterviewStore((s) => s.showProblem);
  const showAIPanel = useInterviewStore((s) => s.showAIPanel);
  const editorSplitPercent = useInterviewStore((s) => s.editorSplitPercent);
  const problemSplitPercent = useInterviewStore((s) => s.problemSplitPercent);
  const setEditorSplitPercent = useInterviewStore((s) => s.setEditorSplitPercent);
  const setProblemSplitPercent = useInterviewStore((s) => s.setProblemSplitPercent);

  const setStatus = useInterviewStore((s) => s.setStatus);
  const setTimerActive = useInterviewStore((s) => s.setTimerActive);
  const [lobbyCompleted, setLobbyCompleted] = useState(false);
  const farewellTriggeredRef = useRef(false);

  // ─── Proctoring: Tab Switch Detection ─────
  const isInterviewActive = status === "in_progress" && lobbyCompleted;
  const {
    tabSwitchCount,
    showWarning: showTabWarning,
    warningMessage: tabWarningMessage,
    dismissWarning: dismissTabWarning,
  } = useTabSwitchDetection({
    enabled: isInterviewActive,
    interviewId: interview.id,
    initialCount: interview.tabSwitchCount ?? 0,
  });

  const {
    showWarning: showFaceWarning,
    warningMessage: faceWarningMessage,
    outOfFrameCount,
    stream: cameraStream,
    dismissWarning: dismissFaceWarning,
  } = useFaceDetection({
    enabled: isInterviewActive,
    interviewId: interview.id,
    initialCount: interview.outOfFrameCount ?? 0,
    intervalMs: 500,
    missThreshold: 1,
    mode: mode,
  });

  const activeCategory = useInterviewStore((s) => s.activeCategory);
  const questionsList = useInterviewStore((s) => s.questionsList);
  const currentQuestionIndex = useInterviewStore((s) => s.currentQuestionIndex);

  const isPlacementViva = useMemo(() => {
    return (
      !interview.jobRoleId ||
      interview.problemTitle?.toLowerCase().includes("viva") ||
      interview.problemTitle?.toLowerCase().includes("placement") ||
      interview.problemTitle?.toLowerCase().includes("project") ||
      (interview as any).jobRole?.mode !== "hybrid"
    );
  }, [interview]);

  const currentStageNumber = useMemo(() => {
    if (isPlacementViva) {
      return Math.min(Math.max(1, (currentQuestionIndex ?? 0) + 1), 4);
    }
    if (questionsList && questionsList.length > 0) {
      return currentQuestionIndex + 1;
    }
    switch (activeCategory) {
      case "conversation":
        return 1;
      case "option_quiz":
        return 2;
      case "drawing":
        return 3;
      case "code_editor":
        return 4;
      default:
        return 1;
    }
  }, [isPlacementViva, questionsList, currentQuestionIndex, activeCategory]);

  // Sync questions list from props if available
  useEffect(() => {
    if (!isPlacementViva) {
      const qList = (interview as any).questions || interview.jobRole?.questions;
      if (qList && qList.length > 0) {
        const store = useInterviewStore.getState();
        store.setQuestionsList(qList);
        if (!store.currentQuestion) {
          store.setCurrentQuestion(qList[0], 0);
          if (qList[0].category) {
            store.setActiveCategory(qList[0].category);
          }
        }
      }
    } else {
      // In Placement Viva, candidate is in full split workspace and dynamic conversational AI
      const store = useInterviewStore.getState();
      store.setQuestionsList(VIVA_STAGES as any);
      store.setCurrentQuestion(VIVA_STAGES[0] as any, 0);
      store.setActiveCategory("code_editor");
      store.setInterviewMode("dynamic");
    }
  }, [interview]);

  // Listen for Dynamic AI tool calls (e.g. switch_category)
  useEffect(() => {
    const handleToolCall = (e: any) => {
      const { tool, args } = e.detail || {};
      if (tool === "switch_category" && args?.category) {
        const cat = args.category;
        if (["conversation", "code_editor", "drawing", "option_quiz"].includes(cat)) {
          console.log(`[Interview-Client] AI tool executed category switch to: ${cat}`);
          useInterviewStore.getState().setActiveCategory(cat as any);
        }
      }
    };
    window.addEventListener("ai-tool-call", handleToolCall);
    return () => window.removeEventListener("ai-tool-call", handleToolCall);
  }, []);

  // Centralized TTS Hook
  const { bufferToken, flushAndFinish, resetTTS, stopAll: stopTTS } = useTTS();

  const handleEndInterview = useCallback(async () => {
    stopTTS();
    if (interview.id) {
      await fetch(`/api/interviews/${interview.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "submit" }),
      }).catch(() => {});
      try {
        localStorage.removeItem(`interview_time_${interview.id}`);
      } catch {}
    }
    useInterviewStore.getState().setStatus("completed");
    router.push(`/report/${interview.id}`);
  }, [interview.id, router, stopTTS]);

  // Advance to next stage / question (triggered by timer, AI, or button)
  const handleAdvanceToNextStage = useCallback(
    (isAutoSwitch: boolean = false) => {
      const s = useInterviewStore.getState();

      if (isPlacementViva) {
        const curIdx = s.currentQuestionIndex ?? 0;
        if (curIdx < 3) {
          const nextIdx = curIdx + 1;
          s.setCurrentQuestionIndex(nextIdx);
          const stageNames = [
            "Intro & Role Fit",
            "Project Defense",
            "Architecture & Code",
            "Wrap-up & Scoring",
          ];
          const nextStageTitle = stageNames[nextIdx] || `Stage ${nextIdx + 1}`;
          const announcement = `Moving to Stage ${nextIdx + 1}: ${nextStageTitle}.`;
          s.addMessage("assistant", announcement);
          if (!s.isSpeakerMuted) {
            speakBackend(announcement, interview.id);
          }
        } else {
          s.addMessage(
            "assistant",
            "You have completed all stages of the placement viva. Feel free to review your code and conclude the interview."
          );
        }
        return;
      }

      const list = s.questionsList;
      const nextIndex = s.currentQuestionIndex + 1;

      if (nextIndex < list.length) {
        const nextQ = list[nextIndex];
        s.setCurrentQuestion(nextQ, nextIndex);
        if (nextQ.category) {
          s.setActiveCategory(nextQ.category);
        }
        s.setCategoryTimeRemainingSeconds((nextQ.durationMinutes || 5) * 60);
        s.setSelectedOptionIndex(null);
        s.setQuizSubmitted(false);

        const transitionPrefix = isAutoSwitch
          ? `Let's move on to ${nextQ.title || "the next part of our discussion"}. `
          : `Moving on to ${nextQ.title || "the next stage"}. `;

        const promptAnnouncement = transitionPrefix + nextQ.promptText;
        s.addMessage("assistant", promptAnnouncement);

        if (!s.isSpeakerMuted) {
          s.setAIState("speaking");
          if (nextQ.audioUrl) {
            const audio = new Audio(nextQ.audioUrl);
            audio.onended = () => {
              const cur = useInterviewStore.getState();
              cur.setAIState(cur.mode === "voice" ? "listening" : "idle");
            };
            audio.onerror = () => {
              speakBackend(nextQ.promptText, interview.id, () => {
                const cur = useInterviewStore.getState();
                cur.setAIState(cur.mode === "voice" ? "listening" : "idle");
              });
            };
            audio.play().catch(() => {
              speakBackend(nextQ.promptText, interview.id, () => {
                const cur = useInterviewStore.getState();
                cur.setAIState(cur.mode === "voice" ? "listening" : "idle");
              });
            });
          } else {
            speakBackend(nextQ.promptText, interview.id, () => {
              const cur = useInterviewStore.getState();
              cur.setAIState(cur.mode === "voice" ? "listening" : "idle");
            });
          }
        }
      } else {
        // Fallback: move along the 4 standard stages: conversation -> option_quiz -> drawing -> code_editor
        const order: Array<"conversation" | "option_quiz" | "drawing" | "code_editor"> = [
          "conversation",
          "option_quiz",
          "drawing",
          "code_editor",
        ];
        const curIdx = order.indexOf(s.activeCategory as any);
        if (curIdx >= 0 && curIdx < order.length - 1) {
          const nextCat = order[curIdx + 1];
          s.setActiveCategory(nextCat);
          s.setCurrentQuestionIndex(curIdx + 1);
          s.setCategoryTimeRemainingSeconds(5 * 60);
          s.setSelectedOptionIndex(null);
          s.setQuizSubmitted(false);
        } else {
          s.addMessage(
            "assistant",
            "You have completed all stages of the interview. Feel free to review your work and submit when you are ready."
          );
        }
      }
    },
    [interview.id, isPlacementViva]
  );

  const handlePrevStage = useCallback(() => {
    const s = useInterviewStore.getState();

    if (isPlacementViva) {
      const curIdx = s.currentQuestionIndex ?? 0;
      if (curIdx > 0) {
        s.setCurrentQuestionIndex(curIdx - 1);
      }
      return;
    }

    const list = s.questionsList;
    const prevIndex = s.currentQuestionIndex - 1;

    if (prevIndex >= 0 && prevIndex < list.length) {
      const prevQ = list[prevIndex];
      s.setCurrentQuestion(prevQ, prevIndex);
      if (prevQ.category) {
        s.setActiveCategory(prevQ.category);
      }
      s.setCategoryTimeRemainingSeconds((prevQ.durationMinutes || 5) * 60);
      s.setSelectedOptionIndex(null);
      s.setQuizSubmitted(false);
    } else {
      const order: Array<"conversation" | "option_quiz" | "drawing" | "code_editor"> = [
        "conversation",
        "option_quiz",
        "drawing",
        "code_editor",
      ];
      const curIdx = order.indexOf(s.activeCategory as any);
      if (curIdx > 0) {
        const prevCat = order[curIdx - 1];
        s.setActiveCategory(prevCat);
        s.setCurrentQuestionIndex(curIdx - 1);
        s.setCategoryTimeRemainingSeconds(5 * 60);
        s.setSelectedOptionIndex(null);
        s.setQuizSubmitted(false);
      }
    }
  }, [isPlacementViva]);

  // Master Interview Timer & Category Countdown Loop
  useEffect(() => {
    if (status !== "in_progress" || !lobbyCompleted) return;

    const timer = setInterval(() => {
      const s = useInterviewStore.getState();

      // 1. Total Session Time Countdown
      if (s.timeRemainingSeconds > 1) {
        const nextTotal = s.timeRemainingSeconds - 1;
        s.setTimeRemaining(nextTotal);

        if (interview.id && nextTotal % 5 === 0) {
          try {
            localStorage.setItem(`interview_time_${interview.id}`, nextTotal.toString());
          } catch {}
        }

        // 30 seconds left warning
        if (nextTotal === 30 && !farewellTriggeredRef.current) {
          farewellTriggeredRef.current = true;
          s.addMessage(
            "assistant",
            "We have about 30 seconds remaining in this interview session. Please begin wrapping up your final thoughts."
          );
        }
      } else if (s.timeRemainingSeconds === 1) {
        s.setTimeRemaining(0);
        handleEndInterview();
      }

      // 2. Stage / Category Time Countdown (only in legacy scripted hybrid mode, never during dynamic viva)
      if (s.interviewMode === "hybrid") {
        if (s.categoryTimeRemainingSeconds > 1) {
          s.setCategoryTimeRemainingSeconds(s.categoryTimeRemainingSeconds - 1);
        } else if (s.categoryTimeRemainingSeconds === 1) {
          s.setCategoryTimeRemainingSeconds(0);
          if (s.currentQuestion?.autoSwitch !== false) {
            handleAdvanceToNextStage(true);
          }
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [status, lobbyCompleted, interview.id, handleAdvanceToNextStage, handleEndInterview]);

  // Handle Option Quiz Selection
  const handleQuizOptionSelected = useCallback(
    (selectedIdx: number, selectedText: string) => {
      const letter = String.fromCharCode(65 + selectedIdx);
      handleSendMessage(`I select Option ${letter}: ${selectedText}`);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [interview.id]
  );

  // Centralized Chat Stream Hook
  const streamCallbacks = useMemo(
    () => ({
      onToken: (token: string, isReasoning?: boolean) => {
        // Buffer tokens for TTS (skip reasoning tokens)
        if (!isReasoning) {
          bufferToken(token);
        }
      },
      onDone: (fullText: string) => {
        // 1. Detect AI Category Switch Tool Call: [SWITCH_CATEGORY: category_name]
        const match = fullText.match(/\[SWITCH_CATEGORY:\s*(conversation|code_editor|drawing|option_quiz)\]/i);
        if (match) {
          const targetCategory = match[1].toLowerCase() as any;
          useInterviewStore.getState().setActiveCategory(targetCategory);
        }

        // 2. Detect AI Stage Transition: [STAGE: 1-4]
        const stageMatch = fullText.match(/\[STAGE:\s*([1-4])\]/i);
        if (stageMatch) {
          const newStage = parseInt(stageMatch[1], 10);
          const targetIndex = newStage - 1;
          const cur = useInterviewStore.getState();
          if (cur.currentQuestionIndex !== targetIndex) {
            cur.setCurrentQuestionIndex(targetIndex);
          }
        } else if (isPlacementViva) {
          // Automatic Turn Progression Fallback:
          // Keep the UI stepper and checklist in sync as the conversation progresses naturally
          const cur = useInterviewStore.getState();
          const assistantMsgs = cur.messages.filter((m) => m.role === "assistant");
          const count = assistantMsgs.length;
          let expectedIndex = 0;
          if (count >= 8) expectedIndex = 3;      // Stage 4: Wrap-up & Scoring
          else if (count >= 5) expectedIndex = 2; // Stage 3: Architecture & Code
          else if (count >= 2) expectedIndex = 1; // Stage 2: Project Defense

          if (expectedIndex > (cur.currentQuestionIndex ?? 0)) {
            cur.setCurrentQuestionIndex(expectedIndex);
          }
        }

        flushAndFinish();
      },
      onError: (_err: Error) => {
        stopTTS();
      },
    }),
    [bufferToken, flushAndFinish, stopTTS]
  );

  const { sendMessage, stopGeneration, isReconnecting } = useChatStream(streamCallbacks);

  // Stable sendMessage for child components supporting both Hybrid and Dynamic modes
  const handleSendMessage = useCallback(
    async (text: string) => {
      resetTTS(); // Clear any previous TTS state
      const state = useInterviewStore.getState();

      if (state.interviewMode === "hybrid" && state.currentQuestion) {
        // In Hybrid mode: candidate's answer is evaluated against admin rubric
        state.addMessage("user", text);
        state.setAIState("thinking");

        try {
          const res = await fetch(`/api/interviews/${interview.id}/evaluate-step`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              questionId: state.currentQuestion.id,
              candidateAnswer: text,
              retryCount: state.questionRetryCount,
              drawingLabels: state.drawingLabels || [],
              hasDrawn: Boolean(state.drawingData && state.drawingData.length > 500),
            }),
          });

          if (!res.ok) throw new Error("Step evaluation failed");
          const evalData = await res.json();

          const feedbackText = evalData.spokenFeedback || "Understood. Let's proceed.";
          state.addMessage("assistant", feedbackText);

          const shouldAdvance = evalData.shouldAdvance;
          const nextQ = evalData.nextQuestion;

          // AI speaks brief feedback or secondary angle
          if (!state.isSpeakerMuted) {
            state.setAIState("speaking");
            speakBackend(
              feedbackText,
              interview.id,
              () => {
                const s = useInterviewStore.getState();
                if (shouldAdvance && nextQ) {
                  // Transition to next question & category
                  s.setCurrentQuestion(nextQ, s.currentQuestionIndex + 1);
                  if (nextQ.category) {
                    s.setActiveCategory(nextQ.category);
                  }
                  s.setCategoryTimeRemainingSeconds((nextQ.durationMinutes || 5) * 60);
                  s.setSelectedOptionIndex(null);
                  s.setQuizSubmitted(false);
                  s.addMessage("assistant", nextQ.promptText);

                  // If next question has a pre-recorded audio file, play directly at $0 cost!
                  if (nextQ.audioUrl && !s.isSpeakerMuted) {
                    s.setAIState("speaking");
                    const audio = new Audio(nextQ.audioUrl);
                    audio.onended = () => {
                      const cur = useInterviewStore.getState();
                      cur.setAIState(cur.mode === "voice" ? "listening" : "idle");
                    };
                    audio.onerror = () => {
                      speakBackend(nextQ.promptText, interview.id, () => {
                        const cur = useInterviewStore.getState();
                        cur.setAIState(cur.mode === "voice" ? "listening" : "idle");
                      });
                    };
                    audio.play().catch(() => {
                      speakBackend(nextQ.promptText, interview.id, () => {
                        const cur = useInterviewStore.getState();
                        cur.setAIState(cur.mode === "voice" ? "listening" : "idle");
                      });
                    });
                  } else if (!s.isSpeakerMuted) {
                    speakBackend(nextQ.promptText, interview.id, () => {
                      const cur = useInterviewStore.getState();
                      cur.setAIState(cur.mode === "voice" ? "listening" : "idle");
                    });
                  } else {
                    s.setAIState(s.mode === "voice" ? "listening" : "idle");
                  }
                } else if (shouldAdvance && !nextQ) {
                  // Final step completed
                  s.addMessage(
                    "assistant",
                    "You have completed all interview questions! Take your time to review your code and click Submit when ready."
                  );
                  s.setAIState(s.mode === "voice" ? "listening" : "idle");
                } else {
                  // Candidate answered partially/confused: increment probe count
                  s.setQuestionRetryCount(s.questionRetryCount + 1);
                  s.setAIState(s.mode === "voice" ? "listening" : "idle");
                }
              },
              () => {
                const s = useInterviewStore.getState();
                s.setAIState(s.mode === "voice" ? "listening" : "idle");
              }
            );
          } else {
            // Speaker is muted
            if (shouldAdvance && nextQ) {
              state.setCurrentQuestion(nextQ, state.currentQuestionIndex + 1);
              if (nextQ.category) {
                state.setActiveCategory(nextQ.category);
              }
              state.setCategoryTimeRemainingSeconds((nextQ.durationMinutes || 5) * 60);
              state.setSelectedOptionIndex(null);
              state.setQuizSubmitted(false);
              state.addMessage("assistant", nextQ.promptText);
            }
            state.setAIState(state.mode === "voice" ? "listening" : "idle");
          }
        } catch (err) {
          console.error("Hybrid step error, falling back to dynamic chat:", err);
          sendMessage(text);
        }
      } else {
        // In Dynamic mode: full conversational stream
        sendMessage(text);
      }
    },
    [interview.id, resetTTS, sendMessage]
  );

  // Submit code to the AI interviewer for review without terminating the session
  const handleCodeSubmit = useCallback(async () => {
    const store = useInterviewStore.getState();
    const currentCode = store.code;

    // 1. Persist candidate's code to DB
    try {
      await fetch(`/api/interviews/${interview.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: currentCode }),
      });
    } catch (e) {
      console.warn("Failed to save code on submit:", e);
    }

    // 2. Submit code to AI interviewer for evaluation & feedback without ending the session
    await handleSendMessage("I have updated and submitted my code in the editor. Please review my implementation and let's continue with the next technical and architecture questions.");
  }, [interview.id, handleSendMessage]);

  const handleStopGeneration = useCallback(() => {
    stopGeneration();
    resetTTS();
  }, [stopGeneration, resetTTS]);

  // Global ESC keyboard shortcut to stop AI speaking or text generation
  useEffect(() => {
    function handleGlobalEsc(e: KeyboardEvent) {
      if (e.key === "Escape") {
        stopTTS();
        handleStopGeneration();
      }
    }
    window.addEventListener("keydown", handleGlobalEsc);
    return () => window.removeEventListener("keydown", handleGlobalEsc);
  }, [stopTTS, handleStopGeneration]);

  // Redirect to report page when interview is completed
  useEffect(() => {
    if (status === "completed") {
      router.push(`/report/${interview.id}`);
    }
  }, [status, interview.id, router]);

  // Initialize the store on mount
  useEffect(() => {
    let computedTime: number | undefined = undefined;
    if (typeof window !== "undefined" && interview.id) {
      try {
        const saved = localStorage.getItem(`interview_time_${interview.id}`);
        if (saved && Number(saved) > 0) {
          computedTime = Number(saved);
        }
      } catch {}
    }

    if (computedTime === undefined) {
      if (interview.startedAt && interview.status === "in_progress") {
        const elapsedMs = Date.now() - interview.startedAt;
        const totalMs = interview.duration * 60 * 1000;
        computedTime = Math.max(0, Math.floor((totalMs - elapsedMs) / 1000));
      } else {
        computedTime = interview.duration * 60;
      }
    }

    const isResuming = existingMessages.length > 0;

    initInterview({
      interviewId: interview.id,
      language: interview.language,
      difficulty: interview.difficulty,
      duration: interview.duration,
      problemTitle: interview.problemTitle,
      problemDescription: interview.problemDescription,
      code: interview.code,
      status: isResuming ? "in_progress" : "setup",
      timeRemainingSeconds: computedTime,
    });

    // Restore existing messages
    if (isResuming) {
      useInterviewStore.setState({ messages: existingMessages });
    }

    return () => {
      stopTTS();
      useInterviewStore.getState().reset();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle start/resume when lobby finishes
  const handleLobbyReady = (interviewStyle: string = "Standard") => {
    setLobbyCompleted(true);
    setStatus("in_progress");
    setTimerActive(true);

    // Prime speech synthesis on user gesture
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        const prime = new SpeechSynthesisUtterance("");
        window.speechSynthesis.speak(prime);
      } catch (e) {
        console.error("Failed to prime SpeechSynthesis:", e);
      }
    }

    if (existingMessages.length === 0) {
      async function startInterview() {
        const currentStore = useInterviewStore.getState();
        const selectedVoiceId = currentStore.selectedVoiceId;

        currentStore.setAIState("thinking");

        if (isPlacementViva) {
          currentStore.setInterviewMode("dynamic");
          currentStore.setActiveCategory("code_editor");
          currentStore.setQuestionsList(VIVA_STAGES as any);
          currentStore.setCurrentQuestion(VIVA_STAGES[0] as any, 0);

          let openingText = "";
          try {
            const res = await fetch(`/api/interviews/${interview.id}/start`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ voiceId: selectedVoiceId, interviewStyle }),
            });

            if (res.ok) {
              const data = await res.json();
              if (data.message && data.message.trim()) {
                openingText = data.message;
              }
            }
          } catch (error) {
            console.error("Start viva error:", error);
          }

          if (!openingText) {
            openingText = `Hi, I'm Ananya, and I'll be conducting your Placement Viva today. I'm excited to review your background and dive into your featured project. To get started with Stage 1, please introduce yourself and tell me a bit about your journey into full-stack development.`;
          }

          const startMsgId = `msg-start-${Date.now()}`;
          useInterviewStore.setState({
            messages: [
              {
                id: startMsgId,
                role: "assistant",
                content: openingText,
                timestamp: Date.now(),
              },
            ],
          });

          if (!currentStore.isSpeakerMuted) {
            currentStore.setAIState("speaking");
            speakBackend(
              openingText,
              interview.id,
              () => {
                const s = useInterviewStore.getState();
                s.setAIState(s.mode === "voice" ? "listening" : "idle");
              },
              () => {
                const s = useInterviewStore.getState();
                s.setAIState(s.mode === "voice" ? "listening" : "idle");
              }
            );
          } else {
            currentStore.setAIState(currentStore.mode === "voice" ? "listening" : "idle");
          }
          return;
        }

        // 1. Check Studio Interview Mode and Structured Questions (legacy hybrid roles only)
        let studioMode = interview.jobRole?.mode || "hybrid";
        let activeQuestions: any[] = [];
        try {
          const roleParam = interview.jobRoleId ? `?jobRoleId=${encodeURIComponent(interview.jobRoleId)}` : "";
          const qRes = await fetch(`/api/admin/questions${roleParam}`);
          if (qRes.ok) {
            const qData = await qRes.json();
            studioMode = interview.jobRole?.mode || qData.interviewMode || "hybrid";
            activeQuestions = (qData.questions || []).filter((q: any) => q.isActive);
          }
        } catch (e) {
          console.warn("Could not load structured studio questions, continuing with dynamic fallback", e);
        }

        currentStore.setInterviewMode(studioMode as any);

        // Always store questions list if found for this role
        if (activeQuestions.length > 0) {
          currentStore.setQuestionsList(activeQuestions);
        }

        // If Hybrid mode with structured questions is active
        if (studioMode === "hybrid" && activeQuestions.length > 0) {
          const firstQ = activeQuestions[0];
          currentStore.setCurrentQuestion(firstQ, 0);
          if (firstQ.category) {
            currentStore.setActiveCategory(firstQ.category);
          }
          currentStore.setCategoryTimeRemainingSeconds((firstQ.durationMinutes || 5) * 60);
          currentStore.setCategoryTimerActive(true);

          const startMsgId = `msg-start-${Date.now()}`;
          useInterviewStore.setState({
            messages: [
              {
                id: startMsgId,
                role: "assistant",
                content: firstQ.promptText,
                timestamp: Date.now(),
              },
            ],
          });

          // Play static pre-recorded voice audio directly ($0 AI cost!)
          if (!currentStore.isSpeakerMuted) {
            currentStore.setAIState("speaking");
            if (firstQ.audioUrl) {
              const audio = new Audio(firstQ.audioUrl);
              audio.onended = () => {
                const s = useInterviewStore.getState();
                s.setAIState(s.mode === "voice" ? "listening" : "idle");
              };
              audio.onerror = () => {
                speakBackend(firstQ.promptText, interview.id, () => {
                  const s = useInterviewStore.getState();
                  s.setAIState(s.mode === "voice" ? "listening" : "idle");
                });
              };
              audio.play().catch(() => {
                speakBackend(firstQ.promptText, interview.id, () => {
                  const s = useInterviewStore.getState();
                  s.setAIState(s.mode === "voice" ? "listening" : "idle");
                });
              });
            } else {
              speakBackend(firstQ.promptText, interview.id, () => {
                const s = useInterviewStore.getState();
                s.setAIState(s.mode === "voice" ? "listening" : "idle");
              });
            }
          } else {
            currentStore.setAIState(currentStore.mode === "voice" ? "listening" : "idle");
          }
          return;
        }

        // 2. Fallback to Full Dynamic AI Mode
        const INDIAN_VOICE_NAME_MAP: Record<string, string> = {
          am_adam: "Aarav",
          am_michael: "Rohan",
          am_fenrir: "Vikram",
          am_puck: "Kabir",
          am_echo: "Aditya",
          af_heart: "Ananya",
          af_bella: "Diya",
          af_sarah: "Isha",
          af_nicole: "Kavya",
          af_sky: "Meera",
          if_sara: "Priya",
          minimax_male_presenter: "Dev",
          minimax_female_shaonv: "Riya",
          minimax_female_yujie: "Sanya",
          gemini_alloy: "Neer",
          gemini_echo: "Siddharth",
          gemini_onyx: "Varun",
          gemini_nova: "Tara",
          gemini_shimmer: "Neha",
          local_male: "Aarav",
          local_female: "Ananya",
        };

        const isFemale = selectedVoiceId && (selectedVoiceId.startsWith("af_") || selectedVoiceId.startsWith("if_") || selectedVoiceId.startsWith("bf_") || selectedVoiceId.includes("female") || selectedVoiceId === "gemini_nova" || selectedVoiceId === "gemini_shimmer");
        const mappedName = selectedVoiceId ? INDIAN_VOICE_NAME_MAP[selectedVoiceId] : undefined;
        const interviewerName = mappedName || (isFemale ? "Ananya" : "Aarav");

        let openingText = "";
        try {
          const res = await fetch(`/api/interviews/${interview.id}/start`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ voiceId: selectedVoiceId, interviewStyle }),
          });

          if (res.ok) {
            const data = await res.json();
            if (data.message && data.message.trim()) {
              openingText = data.message;
            }
          }
        } catch (error) {
          console.error("Start interview error:", error);
        }

        if (!openingText) {
          openingText = `Hi, I'm ${interviewerName}. Welcome to your ${interview.difficulty} coding interview. Take a moment to read the problem, and when you're ready, share your initial thoughts on how you'd approach it.`;
        }

        const startMsgId = `msg-start-${Date.now()}`;
        useInterviewStore.setState({
          messages: [
            {
              id: startMsgId,
              role: "assistant",
              content: openingText,
              timestamp: Date.now(),
            },
          ],
        });

        // Speak the opening message
        if (!currentStore.isSpeakerMuted) {
          currentStore.setAIState("speaking");
          speakBackend(openingText, interview.id, () => {
            const s = useInterviewStore.getState();
            s.setAIState(s.mode === "voice" ? "listening" : "idle");
          }, () => {
            const s = useInterviewStore.getState();
            s.setAIState(s.mode === "voice" ? "listening" : "idle");
          });
        } else {
          currentStore.setAIState(currentStore.mode === "voice" ? "listening" : "idle");
        }
      }

      startInterview();
    }
  };

  // ─── Editor Panel (problem + code editor + controls) ──────

  const editorPanel = (
    <div className={`flex flex-1 overflow-hidden ${layoutMode === "horizontal" ? "flex-row" : "flex-col"}`}>
      {/* Problem description — collapsible */}
      {showProblem && (
        <>
          <div
            className={`overflow-auto border-border ${layoutMode === "horizontal" ? "border-r" : "border-b"}`}
            style={
              layoutMode === "horizontal"
                ? { width: `${problemSplitPercent}%` }
                : { height: `${problemSplitPercent}%` }
            }
          >
            <ProblemPanel />
          </div>
          <ResizableSplitter
            splitPercent={problemSplitPercent}
            onResize={setProblemSplitPercent}
            direction={layoutMode === "horizontal" ? "horizontal" : "vertical"}
            minFirst={15}
            maxFirst={60}
          />
        </>
      )}

      {/* Monaco Code Editor */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <CodeEditor />

        {/* Run Code + Submit + Hint + Console */}
        <EditorControls>
          <HintButton />
        </EditorControls>
      </div>
    </div>
  );

  // ─── AI Panel (avatar, transcript, input) ─────────────────

  const aiPanel = showAIPanel ? (
    <div className="flex flex-col overflow-hidden" style={{ width: `${100 - editorSplitPercent}%` }}>
      {/* AI Avatar */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <AIAvatar />
      </div>

      {/* Conversation Transcript */}
      <ConversationPanel />

      {/* Input Controls — BOTH always mounted, toggled via CSS */}
      {status === "in_progress" && (
        <>
          <div style={{ display: mode === "text" ? "block" : "none" }}>
            <TextInput sendMessage={handleSendMessage} stopGeneration={handleStopGeneration} />
          </div>
          <div style={{ display: mode === "voice" ? "block" : "none" }}>
            <VoiceInput sendMessage={handleSendMessage} stopGeneration={handleStopGeneration} />
          </div>
          <VoiceControls />
        </>
      )}

      {/* Completed state */}
      {status === "completed" && (
        <div className="flex items-center justify-center border-t border-border px-4 py-4">
          <p className="text-sm text-muted-foreground">
            Interview ended. Generating report...
          </p>
        </div>
      )}
    </div>
  ) : null;

  // ─── Floating chat bubble when AI panel is hidden ─────────

  const unreadBubble = !showAIPanel ? (
    <button
      onClick={() => useInterviewStore.getState().setShowAIPanel(true)}
      className="fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-blue-500 text-white shadow-lg hover:bg-blue-600 transition-colors cursor-pointer"
      aria-label="Show AI panel"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    </button>
  ) : null;

  if (!lobbyCompleted) {
    return <InterviewLobby onReady={handleLobbyReady} />;
  }

  // ─── Dynamic Category View Router ────────────────────────
  let stageContent = null;
  if (isPlacementViva) {
    stageContent = (
      <CodingWorkspaceView
        onSubmitCode={handleCodeSubmit}
      />
    );
  } else if (activeCategory === "conversation") {
    stageContent = (
      <ConversationRoomView
        onNextCategory={() => handleAdvanceToNextStage(false)}
      />
    );
  } else if (activeCategory === "option_quiz") {
    stageContent = (
      <OptionQuizPanel
        onOptionSelected={handleQuizOptionSelected}
        onNextCategory={() => handleAdvanceToNextStage(false)}
        onPrevCategory={handlePrevStage}
      />
    );
  } else if (activeCategory === "drawing") {
    stageContent = (
      <WhiteboardCanvas
        onNextCategory={() => handleAdvanceToNextStage(false)}
      />
    );
  } else {
    // Default "code_editor"
    stageContent = (
      <CodingWorkspaceView
        onSubmitCode={handleCodeSubmit}
      />
    );
  }

  return (
    <div className="flex h-screen w-screen flex-col bg-background text-foreground select-none overflow-hidden font-sans">
      {/* Proctoring Warning Toasts */}
      <WarningToast
        message={tabWarningMessage}
        isVisible={showTabWarning}
        onDismiss={dismissTabWarning}
        durationMs={5000}
      />
      <WarningToast
        message={faceWarningMessage}
        isVisible={showFaceWarning && !showTabWarning}
        onDismiss={dismissFaceWarning}
        durationMs={5000}
      />

      {/* Network Drop Reconnection Toast */}
      {isReconnecting && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-3 rounded-lg px-5 py-3 shadow-xl border border-amber-500/40 bg-amber-600/90 text-white backdrop-blur-md">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-200 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-100"></span>
            </span>
            <span className="text-sm font-semibold">Network connection dropped. Reconnecting to AI in 2s...</span>
          </div>
        </div>
      )}


      <InterviewStageShell
        interview={interview}
        currentStageNumber={currentStageNumber}
        stageCategory={activeCategory}
        cameraStream={cameraStream}
        onNextStage={() => handleAdvanceToNextStage(false)}
        onEndInterview={handleEndInterview}
        onSendMessage={handleSendMessage}
        onStopGeneration={handleStopGeneration}
      >
        {stageContent}
      </InterviewStageShell>
    </div>
  );
}

