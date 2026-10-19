import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { LANGUAGE_CONFIG, type ProgrammingLanguage } from "@/types";

/**
 * POST /api/execute
 * Executes code via Piston API (Primary 100% Free Open-Source Standard Engine),
 * JDoodle (Secondary Fallback), or Judge0 API (Tertiary Fallback).
 * Accepts: { sourceCode, language, stdin? }
 * Returns: { result: { stdout, stderr, compileOutput, statusDescription, time, memory } }
 */
interface ExecutionCacheResult {
  stdout: string | null;
  stderr: string | null;
  compileOutput: string | null;
  statusDescription: string;
  statusId: number;
  time: string | number | null;
  memory: number | null;
}

const executionCache = new Map<string, { result: ExecutionCacheResult; expiry: number }>();
const EXECUTION_CACHE_TTL = 120000; // 2 minutes
const MAX_EXECUTION_CACHE = 80;

function getExecutionCache(key: string): ExecutionCacheResult | null {
  const entry = executionCache.get(key);
  if (entry && entry.expiry > Date.now()) {
    return entry.result;
  }
  return null;
}

function setExecutionCache(key: string, result: ExecutionCacheResult) {
  if (executionCache.size >= MAX_EXECUTION_CACHE) {
    const oldestKey = executionCache.keys().next().value;
    if (oldestKey) executionCache.delete(oldestKey);
  }
  executionCache.set(key, { result, expiry: Date.now() + EXECUTION_CACHE_TTL });
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { sourceCode, language, stdin } = body;

    if (!sourceCode || !language) {
      return NextResponse.json(
        { error: "sourceCode and language are required" },
        { status: 400 }
      );
    }

    // Check execution cache (Sub-millisecond instant return for identical test runs)
    const cacheKey = `${language}:${sourceCode}:${stdin || ""}`;
    const cachedResult = getExecutionCache(cacheKey);
    if (cachedResult) {
      return NextResponse.json({ result: cachedResult, cached: true });
    }

    // ─── 1. Primary Engine: Piston API (Free Open-Source Standard Engine) ───────────
    const pistonLangMap: Record<string, string> = {
      cpp: "c++",
      java: "java",
      python: "python",
      javascript: "javascript",
      typescript: "typescript",
      go: "go",
    };

    const pistonLang = pistonLangMap[language] || language;

    try {
      const pistonRes = await fetch("https://emkc.org/api/v2/piston/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: pistonLang,
          version: "*",
          files: [{ content: sourceCode }],
          stdin: stdin || "",
        }),
      });

      if (pistonRes.ok) {
        const pistonData = await pistonRes.json();
        const run = pistonData.run || {};

        const isError = run.code !== 0 || (run.stderr && run.stderr.trim().length > 0);
        const statusDescription = isError
          ? run.stderr && run.stderr.includes("error:")
            ? "Compilation Error"
            : "Runtime Error"
          : "Accepted";

        const execResult: ExecutionCacheResult = {
          stdout: run.stdout || (isError ? "" : run.output || ""),
          stderr: run.stderr || (isError ? run.output : null),
          compileOutput: null,
          statusDescription,
          statusId: run.code === 0 ? 3 : 11,
          time: null,
          memory: null,
        };

        setExecutionCache(cacheKey, execResult);
        return NextResponse.json({ result: execResult });
      } else {
        console.warn("Piston API returned non-OK status. Trying secondary fallback...");
      }
    } catch (err) {
      console.warn("Piston API failed, attempting fallback:", err);
    }

    // ─── 2. Secondary Fallback: JDoodle API ──────────────────────────────────────────
    const JDOODLE_CLIENT_ID = process.env.JDOODLE_CLIENT_ID || "";
    const JDOODLE_CLIENT_SECRET = process.env.JDOODLE_CLIENT_SECRET || "";

    if (JDOODLE_CLIENT_ID && JDOODLE_CLIENT_SECRET) {
      const jdoodleLangMap: Record<string, string> = {
        cpp: "cpp17",
        java: "java",
        python: "python3",
        javascript: "nodejs",
        typescript: "typescript",
        go: "go",
      };
      
      const jdoodleLang = jdoodleLangMap[language] || language;

      try {
        const submitResponse = await fetch("https://api.jdoodle.com/v1/execute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clientId: JDOODLE_CLIENT_ID,
            clientSecret: JDOODLE_CLIENT_SECRET,
            script: sourceCode,
            language: jdoodleLang,
            versionIndex: "0",
            stdin: stdin || "",
          }),
        });

        if (submitResponse.ok) {
          const result = await submitResponse.json();
          const memoryVal = result.memory ? parseInt(result.memory.toString(), 10) : 0;
          const timeVal = result.cpuTime ? parseFloat(result.cpuTime.toString()) : 0;
          const outputStr = (result.output || "").toString();

          const isError = !!result.error || outputStr.toLowerCase().includes("error");

          const execResult: ExecutionCacheResult = {
            stdout: isError ? "" : outputStr,
            stderr: isError ? outputStr : result.error || null,
            compileOutput: null,
            statusDescription: isError ? "Runtime Error" : "Accepted",
            statusId: result.statusCode,
            time: timeVal,
            memory: memoryVal,
          };
          setExecutionCache(cacheKey, execResult);
          return NextResponse.json({ result: execResult });
        }
      } catch (err) {
        console.error("JDoodle Exception:", err);
      }
    }

    // ─── 3. Tertiary Fallback: Judge0 API ─────────────────────────────────────────────
    const JUDGE0_API_URL = process.env.JUDGE0_API_URL || "https://judge0-ce.p.rapidapi.com";
    const JUDGE0_API_KEY = process.env.JUDGE0_API_KEY || "";

    const config = LANGUAGE_CONFIG[language as ProgrammingLanguage];
    if (!config) {
      return NextResponse.json({ error: "Unsupported language" }, { status: 400 });
    }

    if (!JUDGE0_API_KEY) {
      return NextResponse.json({
        result: {
          stdout: null,
          stderr: "Code execution service unavailable.",
          compileOutput: null,
          statusDescription: "Service Unavailable",
          statusId: 0,
          time: null,
          memory: null,
        },
      });
    }

    const submitResponse = await fetch(`${JUDGE0_API_URL}/submissions?wait=true`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-RapidAPI-Key": JUDGE0_API_KEY,
        "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com",
      },
      body: JSON.stringify({
        source_code: sourceCode,
        language_id: config.id,
        stdin: stdin || "",
        cpu_time_limit: 5,
        wall_time_limit: 10,
        memory_limit: 128000,
      }),
    });

    if (!submitResponse.ok) {
      return NextResponse.json({ error: "Code execution service unavailable" }, { status: 502 });
    }

    const result = await submitResponse.json();
    const decode = (str: string | null) => (str ? Buffer.from(str, "base64").toString("utf-8") : null);

    const execResult: ExecutionCacheResult = {
      stdout: decode(result.stdout),
      stderr: decode(result.stderr),
      compileOutput: decode(result.compile_output),
      statusDescription: result.status?.description || "Unknown",
      statusId: result.status?.id || 0,
      time: result.time,
      memory: result.memory,
    };
    setExecutionCache(cacheKey, execResult);

    return NextResponse.json({ result: execResult });
  } catch (error) {
    console.error("Execution error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
