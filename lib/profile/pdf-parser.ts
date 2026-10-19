export interface ParsedResumeResult {
  text: string;
  pageCount: number;
  detectedSkills: string[];
  detectedLinks: {
    github?: string;
    linkedin?: string;
    leetcode?: string;
    others: string[];
  };
}

// Canonical tech skills mapped with their common aliases for high-recall extraction
const SKILL_DEFINITIONS: Array<{ name: string; aliases: string[] }> = [
  { name: "React", aliases: ["react", "react.js", "reactjs"] },
  { name: "Next.js", aliases: ["next.js", "nextjs", "next js"] },
  { name: "TypeScript", aliases: ["typescript", "ts"] },
  { name: "JavaScript", aliases: ["javascript", "js", "es6", "ecmascript"] },
  { name: "Node.js", aliases: ["node.js", "nodejs", "node"] },
  { name: "Express", aliases: ["express", "express.js", "expressjs"] },
  { name: "Python", aliases: ["python", "python3", "py"] },
  { name: "Django", aliases: ["django", "django rest framework"] },
  { name: "FastAPI", aliases: ["fastapi", "fast api"] },
  { name: "Flask", aliases: ["flask"] },
  { name: "Java", aliases: ["java", "core java"] },
  { name: "Spring Boot", aliases: ["spring boot", "springboot", "spring framework", "spring"] },
  { name: "C++", aliases: ["c++", "cpp"] },
  { name: "C", aliases: ["c language", "ansi c"] },
  { name: "C#", aliases: ["c#", "csharp", ".net"] },
  { name: "Go", aliases: ["golang", "go language"] },
  { name: "Rust", aliases: ["rust", "rustlang"] },
  { name: "SQL", aliases: ["sql", "rdbms"] },
  { name: "PostgreSQL", aliases: ["postgresql", "postgres", "psql"] },
  { name: "MySQL", aliases: ["mysql"] },
  { name: "MongoDB", aliases: ["mongodb", "mongo", "mongoose"] },
  { name: "Redis", aliases: ["redis", "upstash redis"] },
  { name: "GraphQL", aliases: ["graphql", "apollo graphql"] },
  { name: "REST API", aliases: ["rest api", "rest apis", "restful", "restful api"] },
  { name: "Docker", aliases: ["docker", "containerization", "dockerfile"] },
  { name: "Kubernetes", aliases: ["kubernetes", "k8s"] },
  { name: "AWS", aliases: ["aws", "amazon web services", "s3", "ec2", "lambda"] },
  { name: "GCP", aliases: ["gcp", "google cloud", "google cloud platform"] },
  { name: "Azure", aliases: ["azure", "microsoft azure"] },
  { name: "Git", aliases: ["git", "version control"] },
  { name: "GitHub", aliases: ["github"] },
  { name: "Tailwind CSS", aliases: ["tailwind css", "tailwindcss", "tailwind"] },
  { name: "HTML", aliases: ["html", "html5"] },
  { name: "CSS", aliases: ["css", "css3"] },
  { name: "Prisma", aliases: ["prisma", "prisma orm"] },
  { name: "CI/CD", aliases: ["ci/cd", "github actions", "jenkins"] },
  { name: "Jest", aliases: ["jest", "unit testing"] },
  { name: "Linux", aliases: ["linux", "ubuntu", "bash", "unix"] },
  { name: "Machine Learning", aliases: ["machine learning", "ml", "deep learning", "ai"] },
  { name: "Redux", aliases: ["redux", "redux toolkit", "rtk"] },
  { name: "Zustand", aliases: ["zustand"] },
  { name: "WebSockets", aliases: ["websocket", "websockets", "socket.io"] },
  { name: "System Design", aliases: ["system design", "microservices", "distributed systems"] },
  { name: "Data Structures & Algorithms", aliases: ["dsa", "data structures", "algorithms", "problem solving"] },
  { name: "DBMS", aliases: ["dbms", "database management"] },
  { name: "Operating Systems", aliases: ["operating systems", "os"] },
  { name: "Computer Networks", aliases: ["computer networks", "networking"] },
  { name: "Supabase", aliases: ["supabase"] },
  { name: "Firebase", aliases: ["firebase"] },
  { name: "Postman", aliases: ["postman"] },
  { name: "Vercel", aliases: ["vercel"] },
];

/**
 * Direct in-process PDF extraction using pdfjs-dist legacy build.
 * Does not spawn external processes, works seamlessly on Vercel Serverless / AWS Lambda.
 */
async function extractPdfTextInProcess(buffer: Buffer): Promise<{ text: string; pageCount: number }> {
  try {
    const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const uint8Array = new Uint8Array(buffer);
    const loadingTask = getDocument({
      data: uint8Array,
      isEvalSupported: false,
      useSystemFonts: true,
    });

    const doc = await loadingTask.promise;
    const pageCount = doc.numPages || 1;
    const pageTexts: string[] = [];

    for (let i = 1; i <= pageCount; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      const pageStr = content.items
        .map((item: any) => (item && item.str ? item.str : ""))
        .join(" ");
      pageTexts.push(pageStr);
    }

    const text = pageTexts.join("\n").trim();
    return { text, pageCount };
  } catch (err: any) {
    console.warn("Direct in-process pdfjs-dist extraction failed:", err?.message || err);
    return { text: "", pageCount: 1 };
  }
}

/**
 * Fallback byte stream pattern matcher for uncompressed PDFs
 */
function extractFallbackTextFromBuffer(buffer: Buffer): { text: string; pageCount: number } {
  try {
    const raw = buffer.toString("binary");

    // Estimate page count by counting "/Type /Page" tokens (excluding "/Pages")
    const pageMatches = raw.match(/\/Type\s*\/Page\b/g);
    const estimatedPages = pageMatches ? Math.max(1, pageMatches.length) : 1;

    // Extract literal text strings enclosed in parentheses (e.g. `(Hello World) Tj`)
    const textPieces: string[] = [];
    const tjRegex = /\(([^()]{2,})\)\s*(?:Tj|'|")/g;
    let match: RegExpExecArray | null;

    while ((match = tjRegex.exec(raw)) !== null) {
      const piece = match[1]
        .replace(/\\([()\\])/g, "$1")
        .replace(/\\n/g, " ")
        .replace(/\\r/g, " ")
        .replace(/\\t/g, " ")
        .trim();
      if (piece.length > 1 && !/^[\x00-\x1F\x7F]+$/.test(piece)) {
        textPieces.push(piece);
      }
    }

    // Also look for array text strings: `[(text) 10 (more text)] TJ`
    const arrayRegex = /\[([^\[\]]+)\]\s*TJ/g;
    while ((match = arrayRegex.exec(raw)) !== null) {
      const inner = match[1];
      const innerPieces = inner.match(/\(([^()]+)\)/g);
      if (innerPieces) {
        innerPieces.forEach((p) => {
          const clean = p.slice(1, -1).trim();
          if (clean.length > 1) textPieces.push(clean);
        });
      }
    }

    const fallbackText = textPieces.join(" ").replace(/\s+/g, " ").trim();
    return {
      text: fallbackText,
      pageCount: estimatedPages,
    };
  } catch {
    return { text: "", pageCount: 1 };
  }
}

/**
 * Extracts plain text, page count, links, and detected skills from a PDF buffer.
 */
export async function parseResumePdf(buffer: Buffer): Promise<ParsedResumeResult> {
  let text = "";
  let pageCount = 1;

  // Primary: Fast in-process PDFJS parsing (safe for serverless lambdas)
  const result = await extractPdfTextInProcess(buffer);
  text = (result.text || "").trim();
  pageCount = result.pageCount || 1;

  // Secondary fallback if primary yielded minimal text
  if (text.length < 50) {
    const fallback = extractFallbackTextFromBuffer(buffer);
    if (fallback.text.length > text.length) {
      text = fallback.text;
    }
    if (pageCount <= 1 && fallback.pageCount > 1) {
      pageCount = fallback.pageCount;
    }
  }

  // 1. Detect skills using alias mapping for high recall
  const detectedSkills: string[] = [];
  const normalizedText = ` ${text.toLowerCase()} `;

  for (const skill of SKILL_DEFINITIONS) {
    let matched = false;
    for (const alias of skill.aliases) {
      const escaped = alias.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
      const regex = new RegExp(`(?:^|[^a-z0-9#+])${escaped}(?:$|[^a-z0-9#+])`, "i");
      if (regex.test(normalizedText)) {
        matched = true;
        break;
      }
    }
    if (matched && !detectedSkills.includes(skill.name)) {
      detectedSkills.push(skill.name);
    }
  }

  // 2. Detect links from text
  const urlRegex = /(https?:\/\/[^\s]+|github\.com\/[^\s]+|linkedin\.com\/in\/[^\s]+|leetcode\.com\/[^\s]+)/gi;
  const matches = text.match(urlRegex) || [];

  let github: string | undefined;
  let linkedin: string | undefined;
  let leetcode: string | undefined;
  const others: string[] = [];

  for (let link of matches) {
    link = link.replace(/[),.;]+$/, "");
    if (link.includes("github.com") && !github) {
      github = link.startsWith("http") ? link : `https://${link}`;
    } else if (link.includes("linkedin.com") && !linkedin) {
      linkedin = link.startsWith("http") ? link : `https://${link}`;
    } else if (link.includes("leetcode.com") && !leetcode) {
      leetcode = link.startsWith("http") ? link : `https://${link}`;
    } else {
      const fullLink = link.startsWith("http") ? link : `https://${link}`;
      if (!others.includes(fullLink)) {
        others.push(fullLink);
      }
    }
  }

  // Also check for GitHub handles written like `@username` or `GitHub: username`
  if (!github) {
    const ghHandleMatch = text.match(/(?:github(?:\.com)?\s*[:\-\/]\s*@?|@)([a-zA-Z0-9_-]{3,38})/i);
    if (ghHandleMatch && ghHandleMatch[1] && !["com", "org", "gmail", "email"].includes(ghHandleMatch[1].toLowerCase())) {
      github = `https://github.com/${ghHandleMatch[1]}`;
    }
  }

  // Also check for LeetCode handles written like `LeetCode: username`
  if (!leetcode) {
    const lcHandleMatch = text.match(/leetcode(?:\.com)?\s*[:\-\/]\s*@?([a-zA-Z0-9_-]{3,38})/i);
    if (lcHandleMatch && lcHandleMatch[1]) {
      leetcode = `https://leetcode.com/${lcHandleMatch[1]}`;
    }
  }

  return {
    text,
    pageCount,
    detectedSkills,
    detectedLinks: {
      github,
      linkedin,
      leetcode,
      others: others.slice(0, 10),
    },
  };
}
