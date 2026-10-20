/**
 * Extracts technical skills directly from the candidate's resume text.
 * Prioritizes parsing the dedicated Skills section so candidates get their
 * actual frameworks, languages, libraries, and tools instead of a rigid whitelist.
 */
export function extractSkillsFromResumeText(text: string): string[] {
  if (!text || text.trim().length === 0) return [];

  const extracted: string[] = [];
  const addSkill = (rawSkill: string) => {
    let clean = rawSkill
      .replace(/^[•*·\-\s–—]+|[•*·\-\s–—.,;:]+$/g, "")
      .trim();

    // Discard noise or conversational stop words
    if (
      clean.length < 2 ||
      clean.length > 35 ||
      /^(and|or|etc|tools|platforms|languages|frameworks|libraries|databases|skills|proficiencies|proficient|experienced|familiar|knowledge|basics)$/i.test(
        clean
      )
    ) {
      return;
    }

    if (!extracted.some((s) => s.toLowerCase() === clean.toLowerCase())) {
      extracted.push(clean);
    }
  };

  // 1. Locate the dedicated Technical Skills section
  const skillsHeaderRegex =
    /(?:TECHNICAL\s+SKILLS|TECHNICAL\s+PROFICIENCIES|SKILLS\s*&?\s*TECHNOLOGIES|CORE\s+SKILLS|CORE\s+COMPETENCIES|KEY\s+SKILLS|TECHNOLOGIES\s*&?\s*TOOLS|SKILLS)\b/i;

  const headerMatch = text.search(skillsHeaderRegex);
  if (headerMatch !== -1) {
    // Text starting right after the section header
    let sectionText = text.slice(headerMatch).replace(skillsHeaderRegex, "").trim();

    // Cut off at the next major resume section
    const nextSectionRegex =
      /(?:\n\s*(?:EXPERIENCE|WORK\s+EXPERIENCE|PROJECTS|EDUCATION|ACADEMIC|CERTIFICATIONS|ACHIEVEMENTS|HONORS|PUBLICATIONS|LEADERSHIP|EXTRACURRICULAR)\b|\s{2,}(?:EXPERIENCE|WORK\s+EXPERIENCE|PROJECTS|EDUCATION|ACADEMIC|CERTIFICATIONS|ACHIEVEMENTS|HONORS|PUBLICATIONS|LEADERSHIP)\s{2,})/i;

    const nextSectionIndex = sectionText.search(nextSectionRegex);
    if (nextSectionIndex !== -1) {
      sectionText = sectionText.slice(0, nextSectionIndex).trim();
    }

    // Split section into lines / bullets (handles \n, bullets •, ·, *, -, or wide spaces with bullets)
    const rawLines = sectionText
      .split(/(?:\r?\n|[•*·]|(?:\s{2,}[•*·]\s*))/)
      .map((l) => l.trim())
      .filter(Boolean);

    for (const rawLine of rawLines) {
      let line = rawLine.replace(/^[•*·\-\s–—]+/, "").trim();
      if (!line) continue;

      // If line has a category prefix like 'Languages:', 'ML & Data:', 'Web & Backend:', 'Data, Infra & Platforms:'
      // Strip everything up to the colon
      const colonIndex = line.indexOf(":");
      if (colonIndex !== -1 && colonIndex < 40) {
        line = line.slice(colonIndex + 1).trim();
      }

      // Split by commas, semicolons, pipes, or bullets
      const tokens = line.split(/[,;|•·]/).map((t) => t.trim()).filter(Boolean);
      for (const token of tokens) {
        addSkill(token);
      }
    }
  }

  // 2. If the skills section was found and yielded skills, return them immediately!
  // This guarantees candidate's actual skills are preserved with zero hardcoded fabrication.
  if (extracted.length > 0) {
    return extracted;
  }

  // 3. Fallback: Only if the resume did not have a standard "Skills" section header,
  // scan common technical terms (exact match, no fuzzy abbreviation inference).
  const COMMON_TECH_TERMS = [
    "JavaScript", "TypeScript", "Python", "Java", "C++", "C#", "C", "Go", "Rust", "PHP", "Ruby", "Swift", "Kotlin",
    "React", "Next.js", "Vue", "Angular", "Node.js", "Express", "FastAPI", "Django", "Flask", "Spring Boot",
    "HTML", "CSS", "Tailwind CSS", "Sass", "Bootstrap",
    "PostgreSQL", "MongoDB", "MySQL", "Redis", "SQLite", "Supabase", "Firebase", "Oracle",
    "Docker", "Kubernetes", "AWS", "Azure", "GCP", "Git", "GitHub", "GitLab", "Linux",
    "GraphQL", "REST APIs", "gRPC", "WebSockets", "Socket.IO", "Kafka", "RabbitMQ", "BullMQ",
    "PyTorch", "TensorFlow", "NumPy", "pandas", "scikit-learn", "Keras", "OpenCV", "Jupyter", "Matplotlib",
    "Jest", "Cypress", "Postman", "Prisma", "Nginx", "PM2"
  ];

  for (const term of COMMON_TECH_TERMS) {
    const escaped = term.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
    const regex = new RegExp(`(?:^|[^a-zA-Z0-9#+])${escaped}(?:$|[^a-zA-Z0-9#+])`, "i");
    if (regex.test(text)) {
      addSkill(term);
    }
  }

  return extracted;
}
