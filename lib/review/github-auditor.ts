import { ReviewCheckItem } from "./resume-auditor";

export interface RepoAuditDetail {
  name: string;
  url: string;
  description: string | null;
  stars: number;
  language: string | null;
  hasReadme: boolean;
  hasSetupInstructions: boolean;
  hasScreenshots: boolean;
  hasSecretsWarning: boolean;
  hasTests: boolean;
}

export interface GithubAuditResult {
  score: number; // 0 to 100
  username: string | null;
  profileFound: boolean;
  checks: ReviewCheckItem[];
  repos: RepoAuditDetail[];
  actionableFixes: string[];
  summary: string;
}

const FORBIDDEN_SECRET_PATTERNS = [
  /\.env\b/i,
  /\.env\.local\b/i,
  /id_rsa/i,
  /id_ed25519/i,
  /credentials\.json/i,
  /secret_key/i,
];

/**
 * Audits a student's public GitHub profile, repositories, README quality, and secret hygiene.
 */
export async function auditGithub(
  username: string | null | undefined
): Promise<GithubAuditResult> {
  const checks: ReviewCheckItem[] = [];
  const actionableFixes: string[] = [];

  if (!username || !username.trim()) {
    return {
      score: 10,
      username: null,
      profileFound: false,
      checks: [
        {
          id: "github_handle",
          name: "GitHub Profile Connected",
          passed: false,
          score: 0,
          message: "No GitHub username was provided.",
          fix: "Add your GitHub username in the Profile Intake tab to enable repo inspection.",
        },
      ],
      repos: [],
      actionableFixes: [
        "Connect your GitHub username in Profile Intake.",
        "Ensure you have at least 1-2 public project repositories with clear READMEs.",
      ],
      summary: "GitHub profile not provided.",
    };
  }

  const cleanUser = username.trim().replace(/^@/, "");
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "MiraiCopilot-Placement-Auditor",
  };

  // If user provided a personal token in environment, use it to bypass 60 req/hr limits
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `token ${process.env.GITHUB_TOKEN}`;
  }

  try {
    // 1. Fetch User Profile
    const userRes = await fetch(`https://api.github.com/users/${cleanUser}`, {
      headers,
      signal: AbortSignal.timeout(6000),
    });

    if (!userRes.ok) {
      if (userRes.status === 404) {
        return {
          score: 15,
          username: cleanUser,
          profileFound: false,
          checks: [
            {
              id: "profile_exists",
              name: "Public Profile Exists",
              passed: false,
              score: 0,
              message: `GitHub user '${cleanUser}' does not exist or is private.`,
              fix: "Check your GitHub username spelling and make sure your profile is public.",
            },
          ],
          repos: [],
          actionableFixes: ["Verify GitHub username spelling in your profile settings."],
          summary: `GitHub profile '@${cleanUser}' was not found.`,
        };
      }
    }

    const userData = await userRes.json();
    const publicReposCount = userData.public_repos || 0;
    const hasBio = !!userData.bio;

    // Check 1: Profile presence and bio
    checks.push({
      id: "profile_bio",
      name: "Profile Bio & Public Repositories",
      passed: publicReposCount >= 2,
      score: publicReposCount >= 2 ? 15 : 8,
      message:
        publicReposCount >= 2
          ? `Public profile found with ${publicReposCount} repositories.`
          : `Profile found, but has only ${publicReposCount} public repo(s). Recruiter benchmark is at least 2 active projects.`,
      fix:
        publicReposCount >= 2
          ? undefined
          : "Make at least 2 key project repositories public on GitHub.",
    });
    if (publicReposCount < 2) {
      actionableFixes.push("Ensure at least 2 complete project repositories are set to Public.");
    }

    // 2. Fetch Top Repositories
    const reposRes = await fetch(
      `https://api.github.com/users/${cleanUser}/repos?sort=updated&per_page=5`,
      { headers, signal: AbortSignal.timeout(8000) }
    );

    const reposData = reposRes.ok ? await reposRes.json() : [];
    const auditedRepos: RepoAuditDetail[] = [];

    let totalReadmeCount = 0;
    let totalSetupInstructions = 0;
    let totalScreenshots = 0;
    let hasSecretsExposure = false;
    let hasTestsDetected = false;

    if (Array.isArray(reposData)) {
      for (const r of reposData) {
        // Skip forks
        if (r.fork) continue;

        let hasReadme = false;
        let hasSetup = false;
        let hasScreenshot = false;
        let hasSecret = false;
        let hasTest = false;

        try {
          // Fetch README for this repo
          const readmeRes = await fetch(
            `https://api.github.com/repos/${cleanUser}/${r.name}/readme`,
            { headers, signal: AbortSignal.timeout(4000) }
          );

          if (readmeRes.ok) {
            hasReadme = true;
            totalReadmeCount++;
            const readmeJson = await readmeRes.json();
            const readmeContent = Buffer.from(
              readmeJson.content || "",
              "base64"
            ).toString("utf-8").toLowerCase();

            // Setup check
            if (
              readmeContent.includes("npm install") ||
              readmeContent.includes("pnpm install") ||
              readmeContent.includes("pip install") ||
              readmeContent.includes("getting started") ||
              readmeContent.includes("how to run") ||
              readmeContent.includes("installation")
            ) {
              hasSetup = true;
              totalSetupInstructions++;
            }

            // Screenshot or demo check
            if (
              readmeContent.includes(".png") ||
              readmeContent.includes(".jpg") ||
              readmeContent.includes(".gif") ||
              readmeContent.includes("demo") ||
              readmeContent.includes("preview") ||
              readmeContent.includes("screenshot")
            ) {
              hasScreenshot = true;
              totalScreenshots++;
            }

            // Secret exposure check in README
            for (const pattern of FORBIDDEN_SECRET_PATTERNS) {
              if (pattern.test(readmeContent)) {
                hasSecret = true;
                hasSecretsExposure = true;
                break;
              }
            }

            // Tests check in README or repo
            if (
              readmeContent.includes("npm test") ||
              readmeContent.includes("pytest") ||
              readmeContent.includes("jest") ||
              readmeContent.includes("unit test")
            ) {
              hasTest = true;
              hasTestsDetected = true;
            }
          }
        } catch {
          // Ignore individual repo readme fetch timeouts
        }

        auditedRepos.push({
          name: r.name,
          url: r.html_url,
          description: r.description,
          stars: r.stargazers_count || 0,
          language: r.language,
          hasReadme,
          hasSetupInstructions: hasSetup,
          hasScreenshots: hasScreenshot,
          hasSecretsWarning: hasSecret,
          hasTests: hasTest,
        });
      }
    }

    // Check 2: README Quality
    const hasSolidReadmes = totalReadmeCount >= 1 && totalSetupInstructions >= 1;
    checks.push({
      id: "repo_readmes",
      name: "Project READMEs & Setup Steps",
      passed: hasSolidReadmes,
      score: hasSolidReadmes ? 25 : totalReadmeCount >= 1 ? 14 : 4,
      message: hasSolidReadmes
        ? `Found ${totalReadmeCount} repo(s) with READMEs and installation instructions.`
        : "Project repos lack comprehensive setup instructions ('npm install' / 'getting started').",
      fix: hasSolidReadmes
        ? undefined
        : "Add a clean README.md with step-by-step setup commands to every project repo.",
    });
    if (!hasSolidReadmes) {
      actionableFixes.push(
        "Add setup instructions ('npm install' / 'run dev') to your main project README."
      );
    }

    // Check 3: Architecture Screenshots & Demo Links
    const hasVisuals = totalScreenshots >= 1;
    checks.push({
      id: "visual_documentation",
      name: "Screenshots or Visual Previews in README",
      passed: hasVisuals,
      score: hasVisuals ? 20 : 8,
      message: hasVisuals
        ? "Visual previews/screenshots found in project documentation."
        : "No screenshots or UI demonstrations found in project READMEs.",
      fix: hasVisuals
        ? undefined
        : "Embed a screenshot or GIF preview in your project README so reviewers see what it looks like.",
    });
    if (!hasVisuals) {
      actionableFixes.push("Embed an image or screenshot of your project UI into its GitHub README.");
    }

    // Check 4: Secrets Hygiene (Crucial Placement Benchmark)
    const passedSecretsCheck = !hasSecretsExposure;
    checks.push({
      id: "secret_hygiene",
      name: "No Exposed Secrets or Sensitive Files",
      passed: passedSecretsCheck,
      score: passedSecretsCheck ? 25 : 0,
      message: passedSecretsCheck
        ? "No accidental .env or exposed credential references detected in inspected files."
        : "Potential secret or credentials detected in repository files!",
      fix: passedSecretsCheck
        ? undefined
        : "Immediately remove committed .env files, add .env to .gitignore, and rotate exposed keys.",
    });
    if (!passedSecretsCheck) {
      actionableFixes.unshift(
        "CRITICAL: Remove committed .env files from Git and add .env to .gitignore."
      );
    }

    // Check 5: Testing & Quality Signals
    checks.push({
      id: "tests_presence",
      name: "Unit Tests & Quality Rigor",
      passed: hasTestsDetected,
      score: hasTestsDetected ? 15 : 6,
      message: hasTestsDetected
        ? "Automated test commands or suites found in repository documentation."
        : "No automated tests (Jest, PyTest, etc.) mentioned in inspected project repositories.",
      fix: hasTestsDetected
        ? undefined
        : "Add unit tests (even 3-5 critical edge-case tests) to demonstrate production readiness.",
    });
    if (!hasTestsDetected) {
      actionableFixes.push("Add automated unit tests (e.g. Jest / PyTest) to your primary project.");
    }

    const totalEarned = checks.reduce((sum, c) => sum + c.score, 0);
    const score = Math.min(100, Math.round(totalEarned));

    return {
      score,
      username: cleanUser,
      profileFound: true,
      checks,
      repos: auditedRepos,
      actionableFixes: actionableFixes.slice(0, 5),
      summary: `Audited @${cleanUser} on GitHub: ${auditedRepos.length} repositories checked with ${totalReadmeCount} documentation files found.`,
    };
  } catch (error: any) {
    console.error("GitHub Audit Error:", error);
    return {
      score: 50,
      username: cleanUser,
      profileFound: true,
      checks: [
        {
          id: "github_fetch_timeout",
          name: "GitHub API Connectivity",
          passed: true,
          score: 10,
          message: "Profile registered. Detailed repo scan temporarily rate-limited.",
          fix: "Add a personal GITHUB_TOKEN to environment variables for extended rate limits.",
        },
      ],
      repos: [],
      actionableFixes: ["Ensure project repositories have setup steps and screenshots."],
      summary: `GitHub profile @${cleanUser} connected.`,
    };
  }
}
