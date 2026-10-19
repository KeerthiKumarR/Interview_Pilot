export interface JobMatchResult {
  fitPercentage: number;
  matchedSkills: string[];
  missingSkills: string[];
  isEligible: boolean;
  matchReason: string;
}

/**
 * Calculates candidate-to-job fit match percentage and generates
 * an explanation of why the job matched.
 */
export function calculateJobMatch(
  studentSkills: string[] = [],
  requiredSkills: string[] = [],
  candidateReadinessScore: number = 0,
  minReadinessScore: number = 50,
  isMSOTInternal: boolean = false
): JobMatchResult {
  const normStudentSkills = new Set(
    (studentSkills || []).map((s) => s.toLowerCase().trim())
  );

  const matchedSkills: string[] = [];
  const missingSkills: string[] = [];

  for (const req of requiredSkills || []) {
    const cleanReq = req.trim();
    if (normStudentSkills.has(cleanReq.toLowerCase())) {
      matchedSkills.push(cleanReq);
    } else {
      missingSkills.push(cleanReq);
    }
  }

  const totalReq = (requiredSkills || []).length;
  let skillRatio = totalReq > 0 ? matchedSkills.length / totalReq : 0.7;

  // Base fit score from skill overlap (70% weight) + candidate readiness (30% weight)
  const skillPart = skillRatio * 70;
  const readinessPart = Math.min(100, candidateReadinessScore) * 0.3;
  let fitPercentage = Math.round(skillPart + readinessPart);

  // Bonus for MSOT Internal drives
  if (isMSOTInternal) {
    fitPercentage = Math.min(100, fitPercentage + 10);
  }

  const isEligible = candidateReadinessScore >= minReadinessScore;

  // Generate explanation
  let matchReason = "";
  if (matchedSkills.length > 0) {
    matchReason = `Matches ${matchedSkills.length} of ${totalReq} required skills (${matchedSkills.slice(0, 3).join(", ")}).`;
  } else {
    matchReason = "Target role matches your background; learn listed skills to strengthen candidacy.";
  }

  if (isMSOTInternal) {
    matchReason = `Exclusive MSOT Campus Drive: ${matchReason}`;
  }

  if (!isEligible) {
    matchReason += ` (Requires readiness score of ${minReadinessScore}+; currently ${candidateReadinessScore})`;
  }

  return {
    fitPercentage: Math.max(25, Math.min(100, fitPercentage)),
    matchedSkills,
    missingSkills,
    isEligible,
    matchReason,
  };
}
