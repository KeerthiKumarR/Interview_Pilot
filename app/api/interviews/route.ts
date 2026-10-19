import { auth, clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { CODING_PROBLEMS } from "@/data/problems";

/**
 * POST /api/interviews
 * Creates a new interview session with a randomly-selected problem
 * matching the requested difficulty.
 */
export async function POST(req: Request) {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      language,
      difficulty,
      style = "standard",
      duration,
      jobRoleId,
      personalizeWithProfile = false,
      provider = "hosted",
    } = body;

    // Validate inputs
    const validLanguages = ["javascript", "typescript", "python", "java", "cpp", "go"];
    const validDifficulties = ["easy", "medium", "hard"];
    const validStyles = ["standard", "product", "startup", "service"];
    const validDurations = [10, 15, 20, 30, 45];
    const validProviders = ["hosted", "ollama"];

    if (!validLanguages.includes(language)) {
      return NextResponse.json({ error: "Invalid language" }, { status: 400 });
    }
    if (!validDifficulties.includes(difficulty)) {
      return NextResponse.json({ error: "Invalid difficulty" }, { status: 400 });
    }
    if (!validStyles.includes(style)) {
      return NextResponse.json({ error: "Invalid style" }, { status: 400 });
    }
    if (!validDurations.includes(duration)) {
      return NextResponse.json({ error: "Invalid duration" }, { status: 400 });
    }
    if (!validProviders.includes(provider)) {
      return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
    }

    // Find or auto-sync the user in the database
    let user = await prisma.user.findUnique({
      where: { clerkId },
      select: { id: true },
    });

    if (!user) {
      try {
        const clerk = await clerkClient();
        const cu = await clerk.users.getUser(clerkId);
        const email = cu.emailAddresses[0]?.emailAddress || `${clerkId}@user.com`;
        const name = `${cu.firstName || ""} ${cu.lastName || ""}`.trim() || "Candidate";
        user = await prisma.user.upsert({
          where: { email },
          update: { clerkId, name },
          create: { clerkId, email, name },
          select: { id: true },
        });
      } catch (e) {
        return NextResponse.json(
          { error: "User account could not be synchronized." },
          { status: 500 }
        );
      }
    }

    // Check if the user has an active Student Profile (Module 1 Intake)
    const studentProfile = await prisma.studentProfile.findUnique({
      where: { userId: user.id },
      include: {
        projects: { orderBy: { order: "asc" } },
        achievements: { orderBy: { createdAt: "desc" } },
      },
    });

    let problemTitle: string;
    let problemDescription: string;
    let starterCode: string;

    if (studentProfile && (personalizeWithProfile || (studentProfile.projects && studentProfile.projects.length > 0))) {
      const roleName = studentProfile.targetRole || "Full Stack Developer";
      const primaryProj = studentProfile.projects?.[0];
      const projectTitle = primaryProj?.title?.trim();
      const liveUrl = primaryProj?.liveUrl?.trim();
      const repoUrl = primaryProj?.repoUrl?.trim();
      const stackList = Array.isArray(primaryProj?.techStack) && primaryProj.techStack.length > 0
        ? primaryProj.techStack.join(", ")
        : Array.isArray(studentProfile.skills) && studentProfile.skills.length > 0
          ? (studentProfile.skills as string[]).slice(0, 5).join(", ")
          : "";

      problemTitle = projectTitle
        ? `${roleName} Placement Viva: ${projectTitle}`
        : `${roleName} Placement Viva`;

      const projectSections: string[] = [];
      if (projectTitle) {
        projectSections.push(`## Featured Project in Scope: ${projectTitle}`);
      }
      if (liveUrl) {
        projectSections.push(`- **Live Deployment**: ${liveUrl}`);
      }
      if (repoUrl) {
        projectSections.push(`- **Source Code Repository**: ${repoUrl}`);
      }
      if (stackList) {
        projectSections.push(`- **Verified Tech Stack**: ${stackList}`);
      }

      problemDescription = `# ${roleName} Placement Viva Dossier
${projectSections.length > 0 ? projectSections.join("\n") + "\n\n---\n" : ""}
### Interview Objectives & Defense Rubric (15–20 Mins):
1. **System Architecture & Data Flow**:
   - Component hierarchy, state hydration, and client-server boundaries.
   - Database schema design, document relationships, and indexing strategies.
2. **API Design & Network Latency**:
   - RESTful API endpoints, request/response lifecycle, and middleware architecture.
   - Error boundary handling, response validation, and CORS hygiene.
3. **Engineering Trade-offs & Production Scaling**:
   - Caching strategies, handling stream buffering, and database connection pooling.
   - Code modularity, clean architecture, and technical debt management.
4. **Behavioral & Hackathon Ownership**:
   - STAR-method evaluation on handling production bugs, deadline pressure, and execution.

---

### Instructions for Candidate:
- The AI interviewer will converse with you in real time via speech or text.
- Use the code editor on the right if the interviewer asks you to draft an API route, middleware, or optimize a data structure.`;

      const projectRef = projectTitle || "Application";
      if (language === "python") {
        starterCode = `# ──────────────────────────────────────────────
# ${roleName} Viva Scratchpad
# Language: Python
# ──────────────────────────────────────────────
# Use this scratchpad when the interviewer asks you to write or optimize
# an API route, helper function, or data transformation.

def handle_request(request_data: dict) -> dict:
    """
    Example handler for processing ${projectRef} requests.
    """
    # Write your implementation here when requested
    return {"status": "ok", "project": "${projectRef}"}
`;
      } else {
        starterCode = `// ──────────────────────────────────────────────
// ${roleName} Viva Scratchpad
// Language: JavaScript / TypeScript ${stackList ? `(${stackList})` : ""}
// ──────────────────────────────────────────────
// Use this scratchpad when the interviewer asks you to write or optimize
// an API endpoint, middleware, or system component for ${projectRef}.

/**
 * API handler for ${projectRef}
 * @param {object} req - Incoming request payload
 * @param {object} res - Response stream
 */
export async function handleProjectRequest(req, res) {
  // Write your implementation here when requested by the interviewer
  return {
    success: true,
    project: "${projectRef}",
    timestamp: Date.now(),
  };
}
`;
      }
    } else if (style !== "dsa") {
      // Placement Viva anchored to target role and tech stack for candidates who haven't uploaded resume yet
      const isBehavioral = style === "service";
      let roleRecord = null;

      if (jobRoleId) {
        roleRecord = await prisma.jobRole.findUnique({ where: { id: jobRoleId } });
      }
      if (!roleRecord) {
        if (isBehavioral) {
          roleRecord = await prisma.jobRole.findFirst({
            where: { title: { contains: "HR", mode: "insensitive" } },
          });
        } else {
          roleRecord =
            (await prisma.jobRole.findFirst({
              where: {
                isDefault: true,
                NOT: { title: { contains: "HR", mode: "insensitive" } },
              },
            })) ||
            (await prisma.jobRole.findFirst({
              where: {
                isActive: true,
                NOT: { title: { contains: "HR", mode: "insensitive" } },
              },
            }));
        }
      }

      const roleName =
        studentProfile?.targetRole ||
        (isBehavioral ? "HR & Behavioral Fit" : roleRecord?.title || "Full Stack Developer");

      const stackSkills =
        Array.isArray(studentProfile?.skills) && studentProfile.skills.length > 0
          ? (studentProfile.skills as string[]).slice(0, 6).join(", ")
          : roleRecord?.targetSkills || (isBehavioral ? "STAR Method, Teamwork, Ownership, Leadership" : "React, Next.js, Node.js, TypeScript, REST APIs, Databases");

      problemTitle = isBehavioral
        ? "HR & Situational Fit Viva: Leadership & Behavioral Competency"
        : `${roleName} Placement Viva: Core Tech Stack & Architecture`;

      problemDescription = `# ${problemTitle}
- **Evaluation Track**: ${isBehavioral ? "Behavioral & HR Competency (STAR Method)" : "Placement Technical Viva"}
- **Target Focus**: ${stackSkills}
- **Experience Level**: Campus Placement / Fresher

---

### Interview Objectives & Defense Rubric (15–20 Mins):
1. **Core Language & Framework Fundamentals**:
   - Component rendering, state flow, asynchronous lifecycle, and error boundaries.
2. **System Architecture & API Design**:
   - RESTful API endpoints, request validation, database query optimization, and CORS/auth hygiene.
3. **Engineering Trade-offs & Production Scaling**:
   - Caching strategies, handling high concurrency, indexing strategies, and network latency.
4. **Behavioral & Engineering Ownership**:
   - Handling production bugs, learning new tech stacks quickly, and team collaboration.

---

### Instructions for Candidate:
- The AI interviewer will converse with you in real time via voice or chat.
- Speak naturally or type your responses.
- Use the code editor on the right if the interviewer asks you to draft an API route, middleware, or optimize a data structure.
> *Tip: To personalize future vivas around your exact personal projects and GitHub repos, upload your resume in the **Profile** tab!*`;

      if (language === "python") {
        starterCode = `# ──────────────────────────────────────────────
# ${roleName} Placement Viva Scratchpad
# Language: Python | Stack: ${stackSkills}
# ──────────────────────────────────────────────
# Use this scratchpad when the interviewer asks you to write or optimize
# an API route, helper function, or data transformation.

def handle_request(request_data: dict) -> dict:
    """
    Example handler for processing requests.
    """
    return {"status": "ok", "role": "${roleName}"}
`;
      } else {
        starterCode = `// ──────────────────────────────────────────────
// ${roleName} Placement Viva Scratchpad
// Language: JavaScript / TypeScript | Stack: ${stackSkills}
// ──────────────────────────────────────────────
// Use this scratchpad when the interviewer asks you to write or optimize
// an API endpoint, middleware, or system component.

/**
 * API handler for ${roleName} Viva
 * @param {object} req - Incoming request payload
 * @param {object} res - Response stream
 */
export async function handleRequest(req, res) {
  // Write your implementation here when requested by the interviewer
  return {
    success: true,
    role: "${roleName}",
    timestamp: Date.now(),
  };
}
`;
      }
    } else {
      // Fallback to random coding problem ONLY if user explicitly requested DSA algorithmic track
      let matchingProblems = CODING_PROBLEMS.filter(
        (p) => p.difficulty === difficulty
      );

      if (matchingProblems.length === 0) {
        matchingProblems = CODING_PROBLEMS;
      }

      // Avoid repeating problems the user has already seen
      const pastInterviews = await prisma.interview.findMany({
        where: { userId: user.id },
        select: { problemTitle: true },
      });
      
      const pastTitles = new Set(pastInterviews.map((i) => i.problemTitle));
      const newProblems = matchingProblems.filter(p => !pastTitles.has(p.title));
      
      if (newProblems.length > 0) {
        matchingProblems = newProblems;
      }

      const problem =
        matchingProblems[Math.floor(Math.random() * matchingProblems.length)];

      const lang = language as keyof typeof problem.starterCode;
      starterCode =
        problem.starterCode[lang] ??
        (language === "typescript" ? problem.starterCode["javascript"] : "") ??
        "";

      problemTitle = problem.title;
      problemDescription = [
        problem.description,
        "",
        ...problem.examples.map(
          (ex, i) =>
            `Example ${i + 1}:\nInput: ${ex.input}\nOutput: ${ex.output}${ex.explanation ? `\nExplanation: ${ex.explanation}` : ""}`
        ),
        "",
        "Constraints:",
        ...problem.constraints.map((c) => `  - ${c}`),
      ].join("\n");
    }

    // Create the interview record (do not attach legacy seed jobRoleId if personalized viva)
    const interview = await prisma.interview.create({
      data: {
        userId: user.id,
        jobRoleId: studentProfile ? null : (jobRoleId || null),
        language,
        difficulty,
        style,
        duration,
        status: "setup",
        problemTitle,
        problemDescription,
        code: starterCode,
      },
    });

    return NextResponse.json({ interview }, { status: 201 });
  } catch (error) {
    console.error("Interview creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/interviews
 * Returns the current user's interviews (most recent first).
 */
export async function GET(req: Request) {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({
        interviews: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0, hasMore: false },
      });
    }

    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get("limit") || "20", 10)));
    const skip = (page - 1) * limit;

    const [interviews, total] = await Promise.all([
      prisma.interview.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          jobRoleId: true,
          jobRole: {
            select: {
              title: true,
              level: true,
              mode: true,
            },
          },
          language: true,
          difficulty: true,
          duration: true,
          status: true,
          problemTitle: true,
          startedAt: true,
          endedAt: true,
          createdAt: true,
          report: {
            select: { overallScore: true },
          },
        },
        skip,
        take: limit,
      }),
      prisma.interview.count({
        where: { userId: user.id },
      }),
    ]);

    const totalPages = Math.ceil(total / limit);
    const hasMore = page < totalPages;

    return NextResponse.json({
      interviews,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore,
      },
    });
  } catch (error: unknown) {
    console.error("Interview fetch error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
