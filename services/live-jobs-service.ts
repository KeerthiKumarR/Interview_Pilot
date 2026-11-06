/**
 * Live Online Jobs Service
 * Dynamically aggregates real-time, currently open software engineering jobs
 * from live public APIs (RemoteOK, Remotive, Jobicy), filters for technical roles,
 * and matches them against the candidate's verified resume, target role, and interview viva score.
 */

import { calculateJobMatch, JobMatchResult } from "@/lib/jobs/matcher";

export interface LiveJobItem {
  id: string;
  title: string;
  company: string;
  description: string;
  location: string;
  isRemote: boolean;
  jobType: string;
  applyUrl: string;
  requiredSkills: string[];
  minReadinessScore: number;
  isMSOTInternal: boolean;
  stipendOrSalary?: string | null;
  postedAt?: string;
  // Match evaluation
  fitPercentage: number;
  matchedSkills: string[];
  missingSkills: string[];
  isEligible: boolean;
  matchReason: string;
  applicationStatus?: string;
}

interface RawLiveJob {
  id: string;
  title: string;
  company: string;
  description: string;
  location: string;
  isRemote: boolean;
  jobType: string;
  applyUrl: string;
  tags: string[];
  salary?: string | null;
  date?: string;
}

// In-memory cache for live jobs (5-minute TTL)
let cachedLiveJobs: RawLiveJob[] = [];
let lastFetchTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Fetches real, currently active online jobs from live job feeds.
 */
async function fetchOnlineJobs(): Promise<RawLiveJob[]> {
  const now = Date.now();
  if (cachedLiveJobs.length > 0 && now - lastFetchTime < CACHE_TTL) {
    return cachedLiveJobs;
  }

  const rawJobs: RawLiveJob[] = [];

  const [remotiveRes, remoteokRes, jobicyRes] = await Promise.allSettled([
    // 1. Remotive Live API
    fetch("https://remotive.com/api/remote-jobs?category=software-dev&limit=25", {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
      signal: AbortSignal.timeout(6000),
    }).then((r) => r.json()),

    // 2. RemoteOK Live API
    fetch("https://remoteok.com/api", {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
      signal: AbortSignal.timeout(6000),
    }).then((r) => r.json()),

    // 3. Jobicy Live Engineering API
    fetch("https://jobicy.com/api/v2/remote-jobs?count=25&industry=engineering", {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
      signal: AbortSignal.timeout(6000),
    }).then((r) => r.json()),
  ]);

  // Parse Remotive
  if (remotiveRes.status === "fulfilled" && Array.isArray(remotiveRes.value?.jobs)) {
    for (const j of remotiveRes.value.jobs) {
      if (!j.title || !j.company_name) continue;
      const cleanDesc = (j.description || "")
        .replace(/<[^>]+>/g, " ")
        .slice(0, 300)
        .trim();

      rawJobs.push({
        id: `remotive-${j.id}`,
        title: j.title.trim(),
        company: j.company_name.trim(),
        description: cleanDesc || "Full-stack software engineering opportunity.",
        location: j.candidate_required_location || "Remote / Global",
        isRemote: true,
        jobType: j.job_type === "full_time" ? "fulltime" : "internship",
        applyUrl: j.url,
        tags: Array.isArray(j.tags) ? j.tags.filter(Boolean) : ["Software"],
        salary: j.salary || null,
        date: j.publication_date,
      });
    }
  }

  // Parse RemoteOK
  if (remoteokRes.status === "fulfilled" && Array.isArray(remoteokRes.value)) {
    const list = remoteokRes.value.filter(
      (j: any) => j && typeof j === "object" && j.position && j.company
    );
    for (const j of list) {
      const position = (j.position || "").trim();
      const posLower = position.toLowerCase();
      // Filter for software / engineering roles
      const isTech =
        posLower.includes("engineer") ||
        posLower.includes("developer") ||
        posLower.includes("architect") ||
        posLower.includes("full stack") ||
        posLower.includes("frontend") ||
        posLower.includes("backend") ||
        posLower.includes("software") ||
        (Array.isArray(j.tags) && j.tags.some((t: string) => ["dev", "react", "python", "node"].includes(t.toLowerCase())));

      if (!isTech) continue;

      const cleanDesc = (j.description || "")
        .replace(/<[^>]+>/g, " ")
        .slice(0, 300)
        .trim();

      let salaryStr: string | null = null;
      if (j.salary_min && j.salary_max && j.salary_max > 0) {
        salaryStr = `$${j.salary_min.toLocaleString()} - $${j.salary_max.toLocaleString()} / year`;
      }

      rawJobs.push({
        id: `remoteok-${j.id || j.slug || Math.random().toString(36).slice(2, 8)}`,
        title: position,
        company: j.company.trim(),
        description: cleanDesc || "Active remote tech opening.",
        location: j.location || "Remote",
        isRemote: true,
        jobType: "fulltime",
        applyUrl: j.url || `https://remoteok.com/remote-jobs/${j.slug}`,
        tags: Array.isArray(j.tags) ? j.tags.filter(Boolean) : ["Engineer"],
        salary: salaryStr,
        date: j.date,
      });
    }
  }

  // Parse Jobicy
  if (jobicyRes.status === "fulfilled" && Array.isArray(jobicyRes.value?.jobs)) {
    for (const j of jobicyRes.value.jobs) {
      if (!j.jobTitle || !j.companyName) continue;
      const cleanDesc = (j.jobDescription || "")
        .replace(/<[^>]+>/g, " ")
        .slice(0, 300)
        .trim();

      rawJobs.push({
        id: `jobicy-${j.id}`,
        title: j.jobTitle.trim(),
        company: j.companyName.trim(),
        description: cleanDesc || "Engineering role on Jobicy.",
        location: j.jobGeo || "Remote",
        isRemote: true,
        jobType: j.jobType === "full-time" ? "fulltime" : "internship",
        applyUrl: j.url,
        tags: Array.isArray(j.jobTags) ? j.jobTags.filter(Boolean) : ["Software"],
        salary: j.annualSalaryMin ? `$${j.annualSalaryMin} - $${j.annualSalaryMax}` : null,
        date: j.pubDate,
      });
    }
  }

  if (rawJobs.length > 0) {
    cachedLiveJobs = rawJobs;
    lastFetchTime = now;
  }

  return rawJobs;
}

export interface MatchLiveJobsOptions {
  studentSkills: string[];
  interviewSkills?: string[];
  candidateReadinessScore?: number;
  interviewScore?: number;
  targetRole?: string;
  limit?: number;
}

/**
 * Dynamically fetches live online jobs and ranks them against
 * candidate resume skills, target role, and interview performance.
 */
export async function matchLiveOnlineJobs(options: MatchLiveJobsOptions): Promise<LiveJobItem[]> {
  const onlineJobs = await fetchOnlineJobs();
  const {
    studentSkills = [],
    interviewSkills = [],
    candidateReadinessScore = 0,
    interviewScore = 70,
    targetRole = "Software Engineer",
    limit = 10,
  } = options;

  // Rank every live job with our multi-dimensional matching engine
  const scoredJobs: LiveJobItem[] = onlineJobs.map((raw) => {
    // Treat tags + inferred role terms as required skills
    const requiredSkills = raw.tags && raw.tags.length > 0 ? raw.tags.slice(0, 8) : ["Software Development"];

    const match: JobMatchResult = calculateJobMatch({
      studentSkills,
      interviewSkills,
      requiredSkills,
      candidateReadinessScore,
      interviewScore,
      targetRole,
      minReadinessScore: 50,
      isMSOTInternal: false,
      jobTitle: raw.title,
    });

    return {
      id: raw.id,
      title: raw.title,
      company: raw.company,
      description: raw.description,
      location: raw.location,
      isRemote: raw.isRemote,
      jobType: raw.jobType,
      applyUrl: raw.applyUrl,
      requiredSkills,
      minReadinessScore: 50,
      isMSOTInternal: false,
      stipendOrSalary: raw.salary,
      postedAt: raw.date,
      fitPercentage: match.fitPercentage,
      matchedSkills: match.matchedSkills,
      missingSkills: match.missingSkills,
      isEligible: match.isEligible,
      matchReason: match.matchReason,
    };
  });

  // Sort by highest match fit percentage first
  scoredJobs.sort((a, b) => b.fitPercentage - a.fitPercentage);

  return scoredJobs.slice(0, limit);
}
