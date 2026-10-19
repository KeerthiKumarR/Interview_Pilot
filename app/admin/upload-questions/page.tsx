"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Sidebar } from "@/features/admin/components/sidebar";
import { useAdminNotifications } from "@/features/admin/components/admin-notification-system";
import {
  FileCode2,
  Code2,
  HelpCircle,
  Plus,
  Trash2,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  RotateCw,
  Eye,
  Edit3,
  Layers,
  ArrowRight,
  Check,
  X,
  Clock,
  Sparkles,
  BookOpen,
  Copy,
  Terminal,
  FileText,
} from "lucide-react";

interface ProblemExample {
  input: string;
  output: string;
  explanation?: string;
}

interface TestCase {
  input: string;
  expectedOutput: string;
  isHidden?: boolean;
}

interface QuestionBankItem {
  id: string;
  title: string;
  category: string; // "code_editor" | "option_quiz" | "conversation" | "drawing"
  difficulty: string; // "easy" | "medium" | "hard"
  stage: string;
  durationMinutes: number;
  promptText: string;
  options?: string[];
  correctOption?: number | null;
  explanation?: string | null;
  examples?: ProblemExample[];
  constraints?: string[];
  testCases?: TestCase[];
  starterCode?: Record<string, string>;
  skillTags?: string[];
  expectedRubric?: string[];
  secondaryProbe?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const SUPPORTED_LANGUAGES = [
  { id: "javascript", label: "JavaScript", defaultTemplate: "function solution(params) {\n  // Your code here\n}" },
  { id: "typescript", label: "TypeScript", defaultTemplate: "function solution(params: any): any {\n  // Your code here\n}" },
  { id: "python", label: "Python", defaultTemplate: "def solution(params):\n    # Your code here\n    pass" },
  { id: "java", label: "Java", defaultTemplate: "class Solution {\n    public int solution(int[] params) {\n        // Your code here\n        return 0;\n    }\n}" },
  { id: "cpp", label: "C++", defaultTemplate: "#include <vector>\nusing namespace std;\n\nclass Solution {\npublic:\n    int solution(vector<int>& params) {\n        // Your code here\n        return 0;\n    }\n};" },
  { id: "go", label: "Go", defaultTemplate: "package main\n\nfunc solution(params []int) int {\n    // Your code here\n    return 0\n}" },
];

export default function UploadQuestionsPage() {
  const { notify } = useAdminNotifications();

  // Data states
  const [questions, setQuestions] = useState<QuestionBankItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [difficultyFilter, setDifficultyFilter] = useState("all");

  // Mode state: "list" | "create_coding" | "create_quiz" | "edit"
  const [activeMode, setActiveMode] = useState<"list" | "create_coding" | "create_quiz" | "edit">("list");
  const [editingId, setEditingId] = useState<string | null>(null);

  // Preview modal
  const [previewQuestion, setPreviewQuestion] = useState<QuestionBankItem | null>(null);

  // Active language in starter code editor tab
  const [activeLanguage, setActiveLanguage] = useState("javascript");

  // Form states
  const [formTitle, setFormTitle] = useState("");
  const [formCategory, setFormCategory] = useState<string>("code_editor");
  const [formDifficulty, setFormDifficulty] = useState<string>("medium");
  const [formDuration, setFormDuration] = useState<number>(15);
  const [formPrompt, setFormPrompt] = useState("");
  const [formSkillTags, setFormSkillTags] = useState("");

  // Quiz Form states
  const [quizOptions, setQuizOptions] = useState<string[]>(["", "", "", ""]);
  const [quizCorrectOption, setQuizCorrectOption] = useState<number>(0);
  const [quizExplanation, setQuizExplanation] = useState("");

  // Coding Form states
  const [examples, setExamples] = useState<ProblemExample[]>([
    { input: "nums = [2, 7, 11, 15], target = 9", output: "[0, 1]", explanation: "Because nums[0] + nums[1] == 9" },
  ]);
  const [constraints, setConstraints] = useState<string[]>([
    "1 <= nums.length <= 10^5",
    "-10^9 <= nums[i] <= 10^9",
  ]);
  const [testCases, setTestCases] = useState<TestCase[]>([
    { input: "[2,7,11,15], 9", expectedOutput: "[0,1]", isHidden: false },
    { input: "[3,2,4], 6", expectedOutput: "[1,2]", isHidden: true },
  ]);
  const [starterCodes, setStarterCodes] = useState<Record<string, string>>({
    javascript: "function twoSum(nums, target) {\n  // Your code here\n}",
    typescript: "function twoSum(nums: number[], target: number): number[] {\n  // Your code here\n  return [];\n}",
    python: "def two_sum(nums: list[int], target: int) -> list[int]:\n    # Your code here\n    pass",
    java: "class Solution {\n    public int[] twoSum(int[] nums, int target) {\n        // Your code here\n        return new int[]{};\n    }\n}",
    cpp: "#include <vector>\nusing namespace std;\n\nclass Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        // Your code here\n        return {};\n    }\n};",
    go: "func twoSum(nums []int, target int) []int {\n    // Your code here\n    return nil\n}",
  });

  // Fetch questions from API
  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/question-bank");
      const data = await res.json();
      if (res.ok && data.questions) {
        setQuestions(data.questions);
      } else {
        notify("error", "Failed to load question bank", data.error || "Unknown error");
      }
    } catch (err) {
      notify("error", "Network Error", "Unable to reach question bank endpoint.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, []);

  // Reset form to defaults
  const resetForm = () => {
    setFormTitle("");
    setFormCategory("code_editor");
    setFormDifficulty("medium");
    setFormDuration(15);
    setFormPrompt("");
    setFormSkillTags("");
    setQuizOptions(["", "", "", ""]);
    setQuizCorrectOption(0);
    setQuizExplanation("");
    setExamples([{ input: "", output: "", explanation: "" }]);
    setConstraints([""]);
    setTestCases([{ input: "", expectedOutput: "", isHidden: false }]);
    const initialCodes: Record<string, string> = {};
    SUPPORTED_LANGUAGES.forEach((lang) => {
      initialCodes[lang.id] = lang.defaultTemplate;
    });
    setStarterCodes(initialCodes);
    setEditingId(null);
  };

  // Open edit for a question
  const handleEdit = (q: QuestionBankItem) => {
    setEditingId(q.id);
    setFormTitle(q.title);
    setFormCategory(q.category);
    setFormDifficulty(q.difficulty);
    setFormDuration(q.durationMinutes);
    setFormPrompt(q.promptText);
    setFormSkillTags(Array.isArray(q.skillTags) ? q.skillTags.join(", ") : "");

    if (q.category === "option_quiz") {
      setQuizOptions(Array.isArray(q.options) && q.options.length ? q.options : ["", "", "", ""]);
      setQuizCorrectOption(typeof q.correctOption === "number" ? q.correctOption : 0);
      setQuizExplanation(q.explanation || "");
      setActiveMode("create_quiz");
    } else {
      setExamples(Array.isArray(q.examples) && q.examples.length ? q.examples : [{ input: "", output: "" }]);
      setConstraints(Array.isArray(q.constraints) && q.constraints.length ? q.constraints : [""]);
      setTestCases(Array.isArray(q.testCases) && q.testCases.length ? q.testCases : [{ input: "", expectedOutput: "" }]);
      setStarterCodes(q.starterCode || {});
      setActiveMode("create_coding");
    }
  };

  // Delete a question
  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}" from the Question Bank?`)) return;

    try {
      const res = await fetch(`/api/admin/question-bank?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        setQuestions((prev) => prev.filter((item) => item.id !== id));
        notify("success", "Question Deleted", `"${title}" was removed from the bank.`);
      } else {
        notify("error", "Delete Failed", data.error || "Could not delete question.");
      }
    } catch {
      notify("error", "Error", "Network error while deleting question.");
    }
  };

  // Save (Create or Update) Question
  const handleSaveQuestion = async () => {
    if (!formTitle.trim()) {
      notify("error", "Validation Error", "Please provide a title for the question.");
      return;
    }
    if (!formPrompt.trim()) {
      notify("error", "Validation Error", "Please write the problem description or prompt text.");
      return;
    }

    setIsSaving(true);
    try {
      const parsedTags = formSkillTags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const payload: Record<string, any> = {
        title: formTitle.trim(),
        category: formCategory,
        difficulty: formDifficulty,
        stage: formCategory === "code_editor" ? "coding" : "approach",
        durationMinutes: Number(formDuration) || 10,
        promptText: formPrompt.trim(),
        skillTags: parsedTags,
      };

      if (formCategory === "option_quiz") {
        payload.options = quizOptions.map((o) => o.trim()).filter(Boolean);
        payload.correctOption = quizCorrectOption;
        payload.explanation = quizExplanation.trim();
      } else {
        payload.examples = examples.filter((ex) => ex.input.trim() || ex.output.trim());
        payload.constraints = constraints.map((c) => c.trim()).filter(Boolean);
        payload.testCases = testCases.filter((tc) => tc.input.trim() || tc.expectedOutput.trim());
        payload.starterCode = starterCodes;
      }

      if (editingId) {
        payload.id = editingId;
        const res = await fetch("/api/admin/question-bank", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (res.ok && data.question) {
          notify("success", "Question Updated", `"${data.question.title}" has been saved.`);
          fetchQuestions();
          setActiveMode("list");
          resetForm();
        } else {
          notify("error", "Update Failed", data.error || "Could not update question.");
        }
      } else {
        const res = await fetch("/api/admin/question-bank", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (res.ok && data.question) {
          notify("success", "Question Created", `"${data.question.title}" added to Question Bank.`);
          fetchQuestions();
          setActiveMode("list");
          resetForm();
        } else {
          notify("error", "Create Failed", data.error || "Could not create question.");
        }
      }
    } catch {
      notify("error", "Error", "An unexpected network error occurred.");
    } finally {
      setIsSaving(false);
    }
  };

  // Filtered questions
  const filteredQuestions = questions.filter((q) => {
    if (categoryFilter !== "all" && q.category !== categoryFilter) return false;
    if (difficultyFilter !== "all" && q.difficulty !== difficultyFilter) return false;
    if (searchQuery.trim()) {
      const matchTitle = q.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchPrompt = q.promptText.toLowerCase().includes(searchQuery.toLowerCase());
      const matchTags = Array.isArray(q.skillTags) && q.skillTags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
      if (!matchTitle && !matchPrompt && !matchTags) return false;
    }
    return true;
  });

  const totalCoding = questions.filter((q) => q.category === "code_editor").length;
  const totalQuiz = questions.filter((q) => q.category === "option_quiz").length;

  return (
    <div className="flex h-screen bg-background overflow-hidden text-foreground">
      <Sidebar />

      <main className="flex-1 flex flex-col h-full min-w-0 overflow-y-auto">
        {/* Top Header */}
        <header className="px-6 py-5 border-b border-border bg-card/60 backdrop-blur sticky top-0 z-20 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20">
                <FileCode2 className="w-5 h-5" />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                Question Bank & Upload Studio
              </h1>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Create and manage coding challenges, test cases, starter code, and multiple-choice quizzes for interview roles.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {activeMode !== "list" ? (
              <button
                type="button"
                onClick={() => {
                  setActiveMode("list");
                  resetForm();
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-border bg-card hover:bg-secondary transition-colors cursor-pointer"
              >
                <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                Back to Question Bank
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setFormCategory("code_editor");
                    setActiveMode("create_coding");
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-sm cursor-pointer"
                >
                  <Code2 className="w-4 h-4" />
                  + Upload Coding Problem
                </button>

                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setFormCategory("option_quiz");
                    setActiveMode("create_quiz");
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border border-border bg-card hover:bg-secondary transition-colors cursor-pointer"
                >
                  <HelpCircle className="w-4 h-4 text-primary" />
                  + Upload Option Quiz
                </button>
              </>
            )}

            <Link
              href="/admin/voice-studio"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 transition-colors"
            >
              <Layers className="w-3.5 h-3.5" />
              Go to Studio
            </Link>
          </div>
        </header>

        {/* Quick Stats Banner */}
        {activeMode === "list" && (
          <div className="px-6 py-4 border-b border-border bg-secondary/20 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-3 rounded-lg border border-border bg-card/60">
              <span className="text-xs text-muted-foreground block">Total Bank Questions</span>
              <span className="text-lg font-bold text-foreground mt-0.5 block">{questions.length}</span>
            </div>
            <div className="p-3 rounded-lg border border-border bg-card/60">
              <span className="text-xs text-muted-foreground block">Coding Challenges</span>
              <span className="text-lg font-bold text-primary mt-0.5 block">{totalCoding}</span>
            </div>
            <div className="p-3 rounded-lg border border-border bg-card/60">
              <span className="text-xs text-muted-foreground block">Option Quizzes</span>
              <span className="text-lg font-bold text-emerald-500 mt-0.5 block">{totalQuiz}</span>
            </div>
            <div className="p-3 rounded-lg border border-border bg-card/60">
              <span className="text-xs text-muted-foreground block">Studio Integration</span>
              <span className="text-xs font-medium text-muted-foreground mt-1 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                Available in Role Studio
              </span>
            </div>
          </div>
        )}

        {/* ─── MODE 1: QUESTION BANK LIST VIEW ─────────────────────────── */}
        {activeMode === "list" && (
          <div className="p-6 space-y-6 flex-1">
            {/* Search & Filters */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by title, prompt, or skill tags..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex items-center gap-2">
                {/* Category Filter */}
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-3 py-2 text-xs rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  <option value="all">All Types</option>
                  <option value="code_editor">Coding Problems</option>
                  <option value="option_quiz">Option Quizzes</option>
                  <option value="conversation">Conversational</option>
                </select>

                {/* Difficulty Filter */}
                <select
                  value={difficultyFilter}
                  onChange={(e) => setDifficultyFilter(e.target.value)}
                  className="px-3 py-2 text-xs rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  <option value="all">All Difficulties</option>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>

                <button
                  type="button"
                  onClick={fetchQuestions}
                  disabled={loading}
                  className="p-2 rounded-lg border border-border bg-card hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  title="Refresh list"
                >
                  <RotateCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                </button>
              </div>
            </div>

            {/* Questions Grid */}
            {loading ? (
              <div className="py-20 text-center text-muted-foreground space-y-2">
                <RotateCw className="w-6 h-6 animate-spin mx-auto text-primary" />
                <p className="text-xs">Loading Question Bank items...</p>
              </div>
            ) : filteredQuestions.length === 0 ? (
              <div className="py-20 text-center border border-dashed border-border rounded-xl bg-card/40 space-y-3">
                <FileCode2 className="w-10 h-10 mx-auto text-muted-foreground opacity-40" />
                <h3 className="text-sm font-semibold text-foreground">No Questions Found</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  {searchQuery || categoryFilter !== "all" || difficultyFilter !== "all"
                    ? "Try adjusting your search criteria or category filter."
                    : "Your question bank is empty. Click '+ Upload Coding Problem' or '+ Upload Option Quiz' to add your first question."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredQuestions.map((q) => {
                  const isCoding = q.category === "code_editor";
                  const isQuiz = q.category === "option_quiz";
                  const diffColor =
                    q.difficulty === "easy"
                      ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/20"
                      : q.difficulty === "hard"
                      ? "text-rose-500 bg-rose-500/10 border-rose-500/20"
                      : "text-amber-500 bg-amber-500/10 border-amber-500/20";

                  return (
                    <div
                      key={q.id}
                      className="border border-border rounded-xl bg-card p-4.5 flex flex-col justify-between hover:border-primary/40 transition-all group"
                    >
                      <div className="space-y-3">
                        {/* Header Badges */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            {isCoding ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20">
                                <Code2 className="w-3 h-3" />
                                Coding Problem
                              </span>
                            ) : isQuiz ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                <HelpCircle className="w-3 h-3" />
                                Option Quiz
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-secondary text-muted-foreground border border-border">
                                Conversational
                              </span>
                            )}

                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${diffColor} uppercase`}>
                              {q.difficulty}
                            </span>
                          </div>

                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {q.durationMinutes} min
                          </span>
                        </div>

                        {/* Title */}
                        <h3 className="text-sm font-bold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                          {q.title}
                        </h3>

                        {/* Description Preview */}
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          {q.promptText}
                        </p>

                        {/* Meta counts */}
                        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border/50 text-[10px] text-muted-foreground">
                          {isCoding && (
                            <>
                              <span className="px-1.5 py-0.5 rounded bg-secondary border border-border">
                                {Array.isArray(q.examples) ? q.examples.length : 0} Examples
                              </span>
                              <span className="px-1.5 py-0.5 rounded bg-secondary border border-border">
                                {Array.isArray(q.testCases) ? q.testCases.length : 0} Tests
                              </span>
                              <span className="px-1.5 py-0.5 rounded bg-secondary border border-border">
                                {q.starterCode ? Object.keys(q.starterCode).length : 0} Languages
                              </span>
                            </>
                          )}
                          {isQuiz && (
                            <>
                              <span className="px-1.5 py-0.5 rounded bg-secondary border border-border">
                                4 Options (A/B/C/D)
                              </span>
                              <span className="px-1.5 py-0.5 rounded bg-secondary border border-border text-emerald-400">
                                Correct: Option {String.fromCharCode(65 + (q.correctOption || 0))}
                              </span>
                            </>
                          )}
                        </div>

                        {/* Skill Tags */}
                        {Array.isArray(q.skillTags) && q.skillTags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {q.skillTags.slice(0, 3).map((tag, idx) => (
                              <span
                                key={idx}
                                className="px-1.5 py-0.5 rounded text-[9px] bg-secondary/60 text-muted-foreground border border-border"
                              >
                                {tag}
                              </span>
                            ))}
                            {q.skillTags.length > 3 && (
                              <span className="text-[9px] text-muted-foreground">
                                +{q.skillTags.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Card Action Buttons */}
                      <div className="flex items-center justify-between pt-4 mt-3 border-t border-border gap-2">
                        <button
                          type="button"
                          onClick={() => setPreviewQuestion(q)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-border bg-card hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Preview
                        </button>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleEdit(q)}
                            className="p-1.5 rounded-lg border border-border bg-card hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                            title="Edit Question"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(q.id, q.title)}
                            className="p-1.5 rounded-lg border border-border bg-card hover:bg-rose-500/10 text-muted-foreground hover:text-rose-400 transition-colors cursor-pointer"
                            title="Delete Question"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ─── MODE 2 & 3: FORM BUILDER (CODING OR QUIZ) ──────────────── */}
        {(activeMode === "create_coding" || activeMode === "create_quiz") && (
          <div className="p-6 max-w-4xl mx-auto w-full space-y-6 pb-20">
            {/* Form Mode Indicator */}
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20">
                  {formCategory === "code_editor" ? (
                    <Code2 className="w-5 h-5" />
                  ) : (
                    <HelpCircle className="w-5 h-5" />
                  )}
                </span>
                <div>
                  <h2 className="text-base font-bold text-foreground">
                    {editingId ? "Edit Question" : formCategory === "code_editor" ? "Upload Coding Problem" : "Upload Option Quiz"}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Fill in the details below. This will be instantly available in the Studio page.
                  </p>
                </div>
              </div>

              {/* Toggle Category if creating fresh */}
              {!editingId && (
                <div className="flex items-center p-1 rounded-lg border border-border bg-card">
                  <button
                    type="button"
                    onClick={() => {
                      setFormCategory("code_editor");
                      setActiveMode("create_coding");
                    }}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                      formCategory === "code_editor"
                        ? "bg-primary text-primary-foreground shadow"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Coding Problem
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFormCategory("option_quiz");
                      setActiveMode("create_quiz");
                    }}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                      formCategory === "option_quiz"
                        ? "bg-primary text-primary-foreground shadow"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Option Quiz
                  </button>
                </div>
              )}
            </div>

            {/* General Fields: Title, Difficulty, Duration, Tags */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  Problem / Question Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder={formCategory === "code_editor" ? "e.g., Two Sum, LRU Cache" : "e.g., Array vs Linked List Complexity"}
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Difficulty</label>
                <select
                  value={formDifficulty}
                  onChange={(e) => setFormDifficulty(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Target Duration (Minutes)</label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={formDuration}
                  onChange={(e) => setFormDuration(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="md:col-span-2 space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  Skill Tags (Comma separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g., Arrays, Hash Map, Two Pointers, Big-O"
                  value={formSkillTags}
                  onChange={(e) => setFormSkillTags(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            {/* Prompt / Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                {formCategory === "code_editor" ? "Problem Statement / Description" : "Question Prompt Text"}{" "}
                <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={5}
                placeholder={
                  formCategory === "code_editor"
                    ? "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target..."
                    : "What is the worst-case time complexity of accessing an arbitrary element in a singly linked list?"
                }
                value={formPrompt}
                onChange={(e) => setFormPrompt(e.target.value)}
                className="w-full p-3 text-xs rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono leading-relaxed resize-y"
              />
            </div>

            {/* ───────────── CODING FIELDS SPECIFIC ───────────── */}
            {formCategory === "code_editor" && (
              <div className="space-y-6 pt-2">
                {/* 1. Examples Builder */}
                <div className="p-4 rounded-xl border border-border bg-card/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-primary" />
                        Problem Examples ({examples.length})
                      </h3>
                      <p className="text-[11px] text-muted-foreground">
                        Sample inputs and expected outputs shown to candidate in the problem tab.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setExamples([...examples, { input: "", output: "", explanation: "" }])}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border border-border bg-card hover:bg-secondary text-foreground transition-colors cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      Add Example
                    </button>
                  </div>

                  <div className="space-y-3">
                    {examples.map((ex, idx) => (
                      <div key={idx} className="p-3 rounded-lg border border-border bg-secondary/20 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-foreground">Example {idx + 1}</span>
                          {examples.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setExamples(examples.filter((_, i) => i !== idx))}
                              className="text-muted-foreground hover:text-rose-400 p-1 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <span className="text-[10px] text-muted-foreground block mb-0.5">Input:</span>
                            <input
                              type="text"
                              placeholder='e.g., nums = [2,7,11,15], target = 9'
                              value={ex.input}
                              onChange={(e) => {
                                const next = [...examples];
                                next[idx].input = e.target.value;
                                setExamples(next);
                              }}
                              className="w-full px-2.5 py-1.5 text-xs rounded border border-border bg-card text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] text-muted-foreground block mb-0.5">Output:</span>
                            <input
                              type="text"
                              placeholder='e.g., [0, 1]'
                              value={ex.output}
                              onChange={(e) => {
                                const next = [...examples];
                                next[idx].output = e.target.value;
                                setExamples(next);
                              }}
                              className="w-full px-2.5 py-1.5 text-xs rounded border border-border bg-card text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                          </div>
                        </div>

                        <div>
                          <span className="text-[10px] text-muted-foreground block mb-0.5">Explanation (Optional):</span>
                          <input
                            type="text"
                            placeholder="e.g., Because nums[0] + nums[1] == 9, we return [0, 1]."
                            value={ex.explanation || ""}
                            onChange={(e) => {
                              const next = [...examples];
                              next[idx].explanation = e.target.value;
                              setExamples(next);
                            }}
                            className="w-full px-2.5 py-1.5 text-xs rounded border border-border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 2. Constraints Builder */}
                <div className="p-4 rounded-xl border border-border bg-card/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <Terminal className="w-3.5 h-3.5 text-primary" />
                        Constraints ({constraints.length})
                      </h3>
                      <p className="text-[11px] text-muted-foreground">
                        Mathematical bounds (e.g. array length, integer ranges, character sets).
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setConstraints([...constraints, ""])}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border border-border bg-card hover:bg-secondary text-foreground transition-colors cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      Add Constraint
                    </button>
                  </div>

                  <div className="space-y-2">
                    {constraints.map((c, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder='e.g., 2 <= nums.length <= 10^4'
                          value={c}
                          onChange={(e) => {
                            const next = [...constraints];
                            next[idx] = e.target.value;
                            setConstraints(next);
                          }}
                          className="flex-1 px-2.5 py-1.5 text-xs rounded border border-border bg-card text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                        {constraints.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setConstraints(constraints.filter((_, i) => i !== idx))}
                            className="text-muted-foreground hover:text-rose-400 p-1 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3. Test Cases Builder */}
                <div className="p-4 rounded-xl border border-border bg-card/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        Automated Test Cases ({testCases.length})
                      </h3>
                      <p className="text-[11px] text-muted-foreground">
                        Executed in the runner sandbox when candidate clicks "Run" or "Submit".
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setTestCases([...testCases, { input: "", expectedOutput: "", isHidden: false }])}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border border-border bg-card hover:bg-secondary text-foreground transition-colors cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      Add Test Case
                    </button>
                  </div>

                  <div className="space-y-3">
                    {testCases.map((tc, idx) => (
                      <div key={idx} className="p-3 rounded-lg border border-border bg-secondary/20 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-foreground">
                            Test Case {idx + 1}
                          </span>
                          <div className="flex items-center gap-3">
                            <label className="flex items-center gap-1.5 text-[10px] text-muted-foreground cursor-pointer">
                              <input
                                type="checkbox"
                                checked={Boolean(tc.isHidden)}
                                onChange={(e) => {
                                  const next = [...testCases];
                                  next[idx].isHidden = e.target.checked;
                                  setTestCases(next);
                                }}
                                className="rounded border-border text-primary focus:ring-primary"
                              />
                              Hidden test case
                            </label>
                            {testCases.length > 1 && (
                              <button
                                type="button"
                                onClick={() => setTestCases(testCases.filter((_, i) => i !== idx))}
                                className="text-muted-foreground hover:text-rose-400 p-1 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <span className="text-[10px] text-muted-foreground block mb-0.5">Input:</span>
                            <input
                              type="text"
                              placeholder='e.g., [2,7,11,15], 9'
                              value={tc.input}
                              onChange={(e) => {
                                const next = [...testCases];
                                next[idx].input = e.target.value;
                                setTestCases(next);
                              }}
                              className="w-full px-2.5 py-1.5 text-xs rounded border border-border bg-card text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] text-muted-foreground block mb-0.5">Expected Output:</span>
                            <input
                              type="text"
                              placeholder='e.g., [0, 1]'
                              value={tc.expectedOutput}
                              onChange={(e) => {
                                const next = [...testCases];
                                next[idx].expectedOutput = e.target.value;
                                setTestCases(next);
                              }}
                              className="w-full px-2.5 py-1.5 text-xs rounded border border-border bg-card text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 4. Prewritten Starter Code Editor */}
                <div className="p-4 rounded-xl border border-border bg-card/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <FileCode2 className="w-3.5 h-3.5 text-primary" />
                        Prewritten Starter Code in Code Editor
                      </h3>
                      <p className="text-[11px] text-muted-foreground">
                        Boilerplate shown in Monaco editor when the candidate starts coding.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const template = SUPPORTED_LANGUAGES.find((l) => l.id === activeLanguage)?.defaultTemplate || "";
                        setStarterCodes({ ...starterCodes, [activeLanguage]: template });
                        notify("info", "Template Inserted", `Standard ${activeLanguage} boilerplate loaded.`);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border border-border bg-card hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    >
                      <RotateCw className="w-3 h-3" />
                      Reset to Default Boilerplate
                    </button>
                  </div>

                  {/* Language Tabs */}
                  <div className="flex flex-wrap items-center gap-1.5 border-b border-border pb-2">
                    {SUPPORTED_LANGUAGES.map((lang) => {
                      const isActive = activeLanguage === lang.id;
                      const hasCustom = Boolean(starterCodes[lang.id]);
                      return (
                        <button
                          key={lang.id}
                          type="button"
                          onClick={() => setActiveLanguage(lang.id)}
                          className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${
                            isActive
                              ? "bg-primary text-primary-foreground border-primary shadow-sm"
                              : "bg-card text-muted-foreground border-border hover:bg-secondary hover:text-foreground"
                          }`}
                        >
                          {lang.label}
                          {hasCustom && (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Code Editor Textarea */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
                      <span>Editing {SUPPORTED_LANGUAGES.find((l) => l.id === activeLanguage)?.label} starter code:</span>
                      <span className="font-mono text-[10px]">Monaco Preview</span>
                    </div>
                    <textarea
                      rows={9}
                      value={starterCodes[activeLanguage] || ""}
                      onChange={(e) =>
                        setStarterCodes({
                          ...starterCodes,
                          [activeLanguage]: e.target.value,
                        })
                      }
                      placeholder={`Write starter code for ${activeLanguage}...`}
                      className="w-full p-3 text-xs rounded-lg border border-border bg-[#0d1117] text-emerald-300 font-mono focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed resize-y"
                      spellCheck={false}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ───────────── QUIZ FIELDS SPECIFIC ───────────── */}
            {formCategory === "option_quiz" && (
              <div className="space-y-6 pt-2">
                <div className="p-4 rounded-xl border border-border bg-card/60 space-y-4">
                  <div>
                    <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <HelpCircle className="w-3.5 h-3.5 text-primary" />
                      Multiple-Choice Options (A, B, C, D)
                    </h3>
                    <p className="text-[11px] text-muted-foreground">
                      Define the 4 options and select which one is the correct answer.
                    </p>
                  </div>

                  <div className="space-y-2.5">
                    {["A", "B", "C", "D"].map((letter, idx) => {
                      const isCorrect = quizCorrectOption === idx;
                      return (
                        <div
                          key={idx}
                          className={`p-3 rounded-lg border transition-all flex items-center gap-3 ${
                            isCorrect
                              ? "border-emerald-500/40 bg-emerald-500/5"
                              : "border-border bg-card"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => setQuizCorrectOption(idx)}
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border transition-all cursor-pointer ${
                              isCorrect
                                ? "bg-emerald-500 text-white border-emerald-500 shadow-sm"
                                : "border-border text-muted-foreground hover:border-primary hover:text-foreground"
                            }`}
                            title="Mark as correct answer"
                          >
                            {letter}
                          </button>

                          <input
                            type="text"
                            placeholder={`Option ${letter} text...`}
                            value={quizOptions[idx] || ""}
                            onChange={(e) => {
                              const next = [...quizOptions];
                              next[idx] = e.target.value;
                              setQuizOptions(next);
                            }}
                            className="flex-1 px-3 py-1.5 text-xs rounded border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                          />

                          <button
                            type="button"
                            onClick={() => setQuizCorrectOption(idx)}
                            className={`text-xs px-2.5 py-1 rounded transition-colors cursor-pointer ${
                              isCorrect
                                ? "bg-emerald-500/20 text-emerald-400 font-semibold"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            {isCorrect ? "Correct Answer" : "Mark Correct"}
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {/* Explanation */}
                  <div className="space-y-1.5 pt-2">
                    <label className="text-xs font-medium text-foreground">
                      Answer Explanation (Shown during review or scoring)
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Explain why this option is correct and why other options are incorrect..."
                      value={quizExplanation}
                      onChange={(e) => setQuizExplanation(e.target.value)}
                      className="w-full p-2.5 text-xs rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-y"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Form Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
              <button
                type="button"
                onClick={() => {
                  setActiveMode("list");
                  resetForm();
                }}
                disabled={isSaving}
                className="px-4 py-2 text-xs font-medium rounded-lg border border-border bg-card hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSaveQuestion}
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-sm cursor-pointer disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <RotateCw className="w-3.5 h-3.5 animate-spin" />
                    Saving Question...
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    {editingId ? "Save Changes" : "Save to Question Bank"}
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ─── PREVIEW MODAL ────────────────────────────────────────────── */}
        {previewQuestion && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-card border border-border rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
              {/* Modal Header */}
              <div className="p-4 border-b border-border flex items-center justify-between gap-3 bg-secondary/30">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
                    {previewQuestion.category === "code_editor" ? (
                      <Code2 className="w-4 h-4" />
                    ) : (
                      <HelpCircle className="w-4 h-4" />
                    )}
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">
                      {previewQuestion.title}
                    </h3>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                      <span className="capitalize font-semibold text-primary">{previewQuestion.category.replace("_", " ")}</span>
                      <span>•</span>
                      <span className="uppercase font-semibold">{previewQuestion.difficulty}</span>
                      <span>•</span>
                      <span>{previewQuestion.durationMinutes} min</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setPreviewQuestion(null)}
                  className="p-1.5 rounded-lg border border-border hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 overflow-y-auto space-y-4 text-xs">
                {/* Description */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-foreground uppercase tracking-wider">Problem Statement</span>
                  <p className="p-3 rounded-lg bg-secondary/20 border border-border text-foreground leading-relaxed whitespace-pre-wrap font-sans">
                    {previewQuestion.promptText}
                  </p>
                </div>

                {/* If Coding Problem */}
                {previewQuestion.category === "code_editor" && (
                  <>
                    {/* Examples */}
                    {Array.isArray(previewQuestion.examples) && previewQuestion.examples.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-[11px] font-bold text-foreground uppercase tracking-wider">Examples</span>
                        <div className="space-y-2">
                          {previewQuestion.examples.map((ex, i) => (
                            <div key={i} className="p-2.5 rounded-lg bg-secondary/20 border border-border space-y-1 font-mono text-[11px]">
                              <div><span className="text-muted-foreground">Input:</span> {ex.input}</div>
                              <div><span className="text-muted-foreground">Output:</span> {ex.output}</div>
                              {ex.explanation && (
                                <div className="text-muted-foreground font-sans text-[11px] pt-1">
                                  Explanation: {ex.explanation}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Constraints */}
                    {Array.isArray(previewQuestion.constraints) && previewQuestion.constraints.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-bold text-foreground uppercase tracking-wider">Constraints</span>
                        <ul className="list-disc list-inside space-y-1 p-2.5 rounded-lg bg-secondary/20 border border-border font-mono text-[11px]">
                          {previewQuestion.constraints.map((c, i) => (
                            <li key={i}>{c}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Test Cases */}
                    {Array.isArray(previewQuestion.testCases) && previewQuestion.testCases.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-bold text-foreground uppercase tracking-wider">Automated Tests</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {previewQuestion.testCases.map((tc, i) => (
                            <div key={i} className="p-2 rounded border border-border bg-card text-[10px] font-mono">
                              <div className="flex items-center justify-between text-muted-foreground mb-1">
                                <span>Test #{i + 1}</span>
                                {tc.isHidden && <span className="text-amber-400">Hidden</span>}
                              </div>
                              <div>In: {tc.input}</div>
                              <div>Out: {tc.expectedOutput}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Starter Code */}
                    {previewQuestion.starterCode && Object.keys(previewQuestion.starterCode).length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-bold text-foreground uppercase tracking-wider">Starter Code Available</span>
                        <div className="p-2.5 rounded-lg bg-[#0d1117] border border-border font-mono text-[10px] text-emerald-400 overflow-x-auto">
                          <pre>{previewQuestion.starterCode.javascript || previewQuestion.starterCode.python || Object.values(previewQuestion.starterCode)[0]}</pre>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* If Quiz */}
                {previewQuestion.category === "option_quiz" && (
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold text-foreground uppercase tracking-wider">Quiz Options</span>
                    <div className="space-y-1.5">
                      {Array.isArray(previewQuestion.options) && previewQuestion.options.map((opt, i) => {
                        const isCorrect = previewQuestion.correctOption === i;
                        return (
                          <div
                            key={i}
                            className={`p-2.5 rounded-lg border flex items-center justify-between ${
                              isCorrect ? "border-emerald-500/40 bg-emerald-500/10 font-semibold text-emerald-300" : "border-border bg-secondary/20 text-muted-foreground"
                            }`}
                          >
                            <span>{String.fromCharCode(65 + i)}. {opt}</span>
                            {isCorrect && (
                              <span className="text-[10px] uppercase font-bold text-emerald-400 flex items-center gap-1">
                                <Check className="w-3 h-3" /> Correct
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {previewQuestion.explanation && (
                      <div className="p-3 rounded-lg border border-border bg-card space-y-1 mt-2">
                        <span className="text-[10px] font-bold text-foreground uppercase">Explanation:</span>
                        <p className="text-muted-foreground text-[11px] leading-relaxed">
                          {previewQuestion.explanation}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-border flex items-center justify-between bg-secondary/30">
                <Link
                  href={`/admin/voice-studio`}
                  className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-semibold"
                >
                  <Layers className="w-3.5 h-3.5" />
                  Assign this question in Studio
                </Link>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const q = previewQuestion;
                      setPreviewQuestion(null);
                      handleEdit(q);
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-border bg-card hover:bg-secondary text-foreground transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Edit Question
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewQuestion(null)}
                    className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
