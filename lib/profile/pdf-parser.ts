import { PDFParse } from "pdf-parse";

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

// Common tech keywords to auto-tag during initial parsing
const COMMON_SKILLS = [
  "React",
  "Next.js",
  "TypeScript",
  "JavaScript",
  "Node.js",
  "Express",
  "Python",
  "Django",
  "FastAPI",
  "Java",
  "Spring Boot",
  "C++",
  "C",
  "Go",
  "Rust",
  "SQL",
  "PostgreSQL",
  "MySQL",
  "MongoDB",
  "Redis",
  "GraphQL",
  "REST API",
  "Docker",
  "Kubernetes",
  "AWS",
  "GCP",
  "Azure",
  "Git",
  "GitHub",
  "Tailwind CSS",
  "HTML",
  "CSS",
  "Prisma",
  "CI/CD",
  "Jest",
  "PyTest",
  "Linux",
  "Machine Learning",
  "Redux",
];

/**
 * Fallback text extraction using raw PDF byte stream pattern matching
 * in case standard PDF parser encountered non-standard font encoding.
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
  let parser: PDFParse | null = null;
  let text = "";
  let pageCount = 1;

  try {
    parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    text = (result.text || "").trim();
    pageCount = result.pages?.length || 1;
  } catch (error: any) {
    console.warn("Primary PDFParse getText failed, attempting fallback:", error.message);
  } finally {
    if (parser) {
      await parser.destroy().catch(() => {});
    }
  }

  // If primary parser returned minimal text (under 50 chars), trigger fallback stream decoder
  if (text.length < 50) {
    const fallback = extractFallbackTextFromBuffer(buffer);
    if (fallback.text.length > text.length) {
      text = fallback.text;
    }
    if (pageCount <= 1 && fallback.pageCount > 1) {
      pageCount = fallback.pageCount;
    }
  }

  // 1. Detect common tech skills (case-insensitive boundary match)
  const detectedSkills: string[] = [];
  const normalizedText = text.toLowerCase();

  for (const skill of COMMON_SKILLS) {
    const escaped = skill.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
    const regex = new RegExp(`(?:^|\\W)${escaped}(?:$|\\W)`, "i");
    if (regex.test(normalizedText)) {
      detectedSkills.push(skill);
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
