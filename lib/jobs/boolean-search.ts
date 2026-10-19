export interface BooleanSearchOutput {
  query: string;
  roleTerms: string[];
  skillTerms: string[];
  locationTerms: string[];
  externalPlatformUrls: {
    linkedin: string;
    wellfound: string;
    internshala: string;
    googleJobs: string;
  };
}

/**
 * Builds optimized Boolean search queries and compliant platform search links
 * based on candidate skills, target role, and location preferences.
 * Example output:
 * ("React" OR "Next.js") AND ("Full Stack" OR "Frontend") AND (intern OR internship) AND (Bangalore OR remote)
 */
export function buildBooleanSearchQuery(
  skills: string[] = [],
  targetRole: string = "Software Engineer",
  location: string = "Bangalore OR remote"
): BooleanSearchOutput {
  // 1. Skill terms (clean & take top 4)
  const topSkills = (skills && skills.length > 0 ? skills : ["React", "TypeScript", "Node.js"])
    .slice(0, 4)
    .map((s) => s.trim())
    .filter(Boolean);

  const skillsSegment = topSkills.length > 1
    ? `(${topSkills.map((s) => `"${s}"`).join(" OR ")})`
    : topSkills.length === 1
    ? `"${topSkills[0]}"`
    : `("Full Stack" OR "Software")`;

  // 2. Role terms
  const roleKeywords: string[] = [];
  if (targetRole.toLowerCase().includes("full stack") || targetRole.toLowerCase().includes("fullstack")) {
    roleKeywords.push('"Full Stack"', '"Fullstack"', '"Software Engineer"');
  } else if (targetRole.toLowerCase().includes("frontend")) {
    roleKeywords.push('"Frontend"', '"Web Developer"', '"UI Engineer"');
  } else if (targetRole.toLowerCase().includes("backend")) {
    roleKeywords.push('"Backend"', '"API Engineer"', '"Python Developer"');
  } else {
    roleKeywords.push(`"${targetRole}"`, '"Software Engineer"');
  }
  const roleSegment = `(${roleKeywords.join(" OR ")})`;

  // 3. Internship / Entry level intent
  const levelSegment = `(intern OR internship OR "entry level" OR fresher)`;

  // 4. Location
  const locSegment = `(${location})`;

  // Combine into standard Boolean Search Query
  const fullBooleanQuery = `${skillsSegment} AND ${roleSegment} AND ${levelSegment} AND ${locSegment}`;

  // Safe URL encoding for query strings
  const encodedQuery = encodeURIComponent(fullBooleanQuery);
  const simpleQuery = encodeURIComponent(
    `${targetRole} ${topSkills.slice(0, 2).join(" ")} intern`
  );

  return {
    query: fullBooleanQuery,
    roleTerms: roleKeywords,
    skillTerms: topSkills,
    locationTerms: ["Bangalore", "Remote"],
    externalPlatformUrls: {
      linkedin: `https://www.linkedin.com/jobs/search/?keywords=${encodedQuery}&location=India`,
      wellfound: `https://wellfound.com/jobs?role=${encodeURIComponent(targetRole)}`,
      internshala: `https://internshala.com/internships/matching-preference/?keywords=${simpleQuery}`,
      googleJobs: `https://www.google.com/search?q=${encodedQuery}+jobs`,
    },
  };
}
