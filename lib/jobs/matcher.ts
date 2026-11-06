export interface JobMatchOptions {
  studentSkills?: string[];
  interviewSkills?: string[];
  requiredSkills?: string[];
  candidateReadinessScore?: number;
  interviewScore?: number;
  targetRole?: string;
  minReadinessScore?: number;
  isMSOTInternal?: boolean;
  jobTitle?: string;
}

export interface JobMatchResult {
  fitPercentage: number;
  matchedSkills: string[];
  missingSkills: string[];
  isEligible: boolean;
  matchReason: string;
}

/**
 * Maps raw database recruiter verdicts to student-friendly, constructive feedback labels.
 */
export function formatVerdictLabel(verdict?: string | null): string {
  if (!verdict) return "Evaluated";
  const v = verdict.toUpperCase().trim();
  if (v === "STRONG_HIRE") return "Placement Ready (Distinction)";
  if (v === "HIRE" || v === "LEANING_HIRE") return "Placement Ready";
  if (v === "LEANING_NO") return "Needs Practice";
  if (v === "NO_HIRE" || v === "DO_NOT_HIRE") return "Needs Improvement";
  if (v === "INCOMPLETE") return "Incomplete Session";
  return verdict;
}

/**
 * Calculates candidate-to-job fit match percentage and generates
 * a comprehensive explanation integrating Resume data, Profile skills,
 * and live Interview Viva performance.
 */
export function calculateJobMatch(
  studentSkillsOrOptions: string[] | JobMatchOptions = [],
  requiredSkills: string[] = [],
  candidateReadinessScore: number = 0,
  minReadinessScore: number = 50,
  isMSOTInternal: boolean = false
): JobMatchResult {
  let studentSkills: string[] = [];
  let interviewSkills: string[] = [];
  let effectiveReadiness = candidateReadinessScore;
  let minScore = minReadinessScore;
  let isInternal = isMSOTInternal;
  let targetRole = "";
  let jobTitle = "";

  // Handle both object-based options and legacy positional arguments
  if (Array.isArray(studentSkillsOrOptions)) {
    studentSkills = studentSkillsOrOptions;
  } else if (typeof studentSkillsOrOptions === "object" && studentSkillsOrOptions !== null) {
    const opts = studentSkillsOrOptions;
    studentSkills = opts.studentSkills || [];
    interviewSkills = opts.interviewSkills || [];
    effectiveReadiness = opts.interviewScore ?? opts.candidateReadinessScore ?? 0;
    minScore = opts.minReadinessScore ?? 50;
    isInternal = opts.isMSOTInternal ?? false;
    targetRole = opts.targetRole || "";
    jobTitle = opts.jobTitle || "";
    if (opts.requiredSkills && opts.requiredSkills.length > 0) {
      requiredSkills = opts.requiredSkills;
    }
  }

  // Normalize all candidate skills (resume + interview target skills)
  const allCandidateSkills = new Set<string>();
  for (const s of [...studentSkills, ...interviewSkills]) {
    if (s && typeof s === "string") {
      allCandidateSkills.add(s.toLowerCase().trim());
    }
  }

  const matchedSkills: string[] = [];
  const missingSkills: string[] = [];

  for (const req of requiredSkills || []) {
    const cleanReq = req.trim();
    const cleanLower = cleanReq.toLowerCase();
    
    // Check direct equality or partial match (e.g. "React" in "React.js" or "Next.js" in "Next")
    let isMatched = allCandidateSkills.has(cleanLower);
    if (!isMatched) {
      for (const candSkill of allCandidateSkills) {
        if (
          candSkill.includes(cleanLower) ||
          cleanLower.includes(candSkill) ||
          (cleanLower === "rest apis" && candSkill.includes("api")) ||
          (cleanLower === "system design" && candSkill.includes("architecture")) ||
          (cleanLower === "microservices" && candSkill.includes("backend"))
        ) {
          isMatched = true;
          break;
        }
      }
    }

    if (isMatched) {
      matchedSkills.push(cleanReq);
    } else {
      missingSkills.push(cleanReq);
    }
  }

  const totalReq = (requiredSkills || []).length;
  const skillRatio = totalReq > 0 ? matchedSkills.length / totalReq : 0.75;

  // 1. Skill Overlap (45% weight)
  const skillPart = skillRatio * 45;

  // 2. Viva & Performance Score (35% weight)
  // Higher interview score directly lifts the candidate's verified match rate
  const performancePart = (Math.min(100, Math.max(0, effectiveReadiness)) / 100) * 35;

  // 3. Role Alignment (20% weight)
  let rolePart = 15;
  if (targetRole && jobTitle) {
    const tLower = targetRole.toLowerCase();
    const jLower = jobTitle.toLowerCase();
    if (
      (tLower.includes("full") && jLower.includes("full")) ||
      (tLower.includes("front") && jLower.includes("front")) ||
      (tLower.includes("back") && jLower.includes("back")) ||
      (tLower.includes("ai") && (jLower.includes("ai") || jLower.includes("ml"))) ||
      (tLower.includes("software") && jLower.includes("software"))
    ) {
      rolePart = 20;
    }
  }

  let fitPercentage = Math.round(skillPart + performancePart + rolePart);

  // Bonus for exclusive Campus Drives
  if (isInternal) {
    fitPercentage = Math.min(100, fitPercentage + 8);
  }

  const isEligible = effectiveReadiness >= minScore;

  // Generate actionable, personalized explanation
  let matchReason = "";
  if (matchedSkills.length > 0) {
    const topMatched = matchedSkills.slice(0, 3).join(", ");
    matchReason = `Matches ${matchedSkills.length} of ${totalReq} key skills (${topMatched}) based on your resume & viva.`;
  } else {
    matchReason = "Target role matches your profile track; practice the listed skills to strengthen candidacy.";
  }

  if (effectiveReadiness >= 75) {
    matchReason += ` Strong viva readiness score (${Math.round(effectiveReadiness)}/100).`;
  }

  if (isInternal) {
    matchReason = `Exclusive Campus Drive: ${matchReason}`;
  }

  if (!isEligible) {
    matchReason += ` (Target threshold: ${minScore}+; current viva score: ${Math.round(effectiveReadiness)})`;
  }

  return {
    fitPercentage: Math.max(30, Math.min(99, fitPercentage)),
    matchedSkills,
    missingSkills,
    isEligible,
    matchReason,
  };
}
