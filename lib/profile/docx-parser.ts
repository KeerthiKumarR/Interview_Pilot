import mammoth from "mammoth";
import { extractSkillsFromResumeText } from "./skills-extractor";
import { ParsedResumeResult } from "./pdf-parser";

/**
 * Extracts plain text, links, and detected skills from a DOCX buffer using mammoth.
 */
export async function parseResumeDocx(buffer: Buffer): Promise<ParsedResumeResult> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    const text = (result.value || "").trim();

    // Estimate page count roughly (~500 words or 3000 chars per page)
    const pageCount = Math.max(1, Math.ceil(text.length / 3000));

    // Detect skills using regex extractor
    const detectedSkills = extractSkillsFromResumeText(text);

    // Detect links
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

    if (!linkedin) {
      const liMatch = text.match(/linkedin\.com\s*\/\s*in\s*\/\s*([a-zA-Z0-9_-]{3,50})/i);
      if (liMatch && liMatch[1]) {
        linkedin = `https://linkedin.com/in/${liMatch[1]}`;
      }
    }

    if (!github) {
      const ghUrlMatch = text.match(/github\.com\s*\/\s*([a-zA-Z0-9_-]{3,38})/i);
      if (ghUrlMatch && ghUrlMatch[1] && !["com", "org", "gmail", "email", "in"].includes(ghUrlMatch[1].toLowerCase())) {
        github = `https://github.com/${ghUrlMatch[1]}`;
      } else {
        const ghHandleMatch = text.match(/(?:github\s*[:\-\/]\s*@?|@)([a-zA-Z0-9_-]{3,38})/i);
        if (ghHandleMatch && ghHandleMatch[1] && !["com", "org", "gmail", "email", "in"].includes(ghHandleMatch[1].toLowerCase())) {
          github = `https://github.com/${ghHandleMatch[1]}`;
        }
      }
    }

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
  } catch (error: any) {
    console.error("DOCX parsing error:", error);
    throw new Error("Failed to extract text from DOCX file: " + (error?.message || "Corrupted file"));
  }
}
