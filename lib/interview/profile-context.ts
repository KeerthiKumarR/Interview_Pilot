export interface ProfileInterviewContext {
  targetRole?: string | null;
  skills?: string[] | null;
  projects?: Array<{
    title: string;
    description?: string | null;
    techStack?: any;
    repoUrl?: string | null;
    liveUrl?: string | null;
  }> | null;
  achievements?: Array<{
    title: string;
    category?: string | null;
  }> | null;
}

/**
 * Builds tailored skill-specific probing questions based on the candidate's verified skills.
 */
function buildSkillProbingGuides(skills: string[]): string {
  if (!skills || skills.length === 0) return "";

  const probes: string[] = [];

  for (const skill of skills.slice(0, 6)) {
    const s = skill.trim().toLowerCase();
    if (s.includes("react") || s.includes("next")) {
      probes.push(`- React / Next.js: Probe on Server vs Client Components, useEffect cleanup/dependency traps, state hydration, or avoiding unnecessary re-renders with memoization.`);
    } else if (s.includes("typescript")) {
      probes.push(`- TypeScript: Probe on Generics, discriminating unions, utility types (Pick, Omit, Partial), strict typing vs 'any', or interface vs type aliases.`);
    } else if (s.includes("javascript")) {
      probes.push(`- JavaScript: Probe on closures, prototype chain, microtasks vs macrotasks in the event loop, and Promises/async-await error bubbling.`);
    } else if (s.includes("node") || s.includes("express")) {
      probes.push(`- Node.js: Probe on libuv Event Loop phases, non-blocking I/O, middleware architecture, backpressure in streams, and memory profiling.`);
    } else if (s.includes("python") || s.includes("fastapi") || s.includes("django")) {
      probes.push(`- Python: Probe on async/await coroutines, generators, GIL implications in multi-threading vs multi-processing, and Pydantic validation.`);
    } else if (s.includes("java") && !s.includes("javascript")) {
      probes.push(`- Java / Spring: Probe on JVM Garbage Collection, Spring Boot dependency injection, multi-threading with CompletableFuture, and JPA entity caching.`);
    } else if (s.includes("c++") || s.includes("cpp")) {
      probes.push(`- C++: Probe on RAII, smart pointers (unique_ptr vs shared_ptr), move semantics, and cache-friendly data structures.`);
    } else if (s.includes("go") || s.includes("golang")) {
      probes.push(`- Go: Probe on goroutines, channels, context cancellation, race condition detection, and interface design.`);
    } else if (s.includes("sql") || s.includes("postgres") || s.includes("mysql") || s.includes("database")) {
      probes.push(`- SQL / Databases: Probe on indexing strategies (B-Tree vs Hash), composite indexes, ACID transaction isolation levels, EXPLAIN ANALYZE, or connection pooling.`);
    } else if (s.includes("mongo") || s.includes("nosql")) {
      probes.push(`- NoSQL / MongoDB: Probe on schema design (embedding vs referencing), indexing, replication sets, and eventual consistency.`);
    } else if (s.includes("redis")) {
      probes.push(`- Redis / Caching: Probe on cache invalidation patterns (cache-aside, write-through), TTL strategies, cache stampede prevention, and Redis data structures.`);
    } else if (s.includes("kafka") || s.includes("rabbitmq")) {
      probes.push(`- Messaging / Streaming: Probe on message ordering guarantees, consumer groups, partition balancing, dead-letter queues, and idempotency.`);
    } else if (s.includes("docker") || s.includes("kubernetes") || s.includes("cloud") || s.includes("aws")) {
      probes.push(`- Cloud / DevOps: Probe on containerization best practices, multi-stage builds, environment secrets hygiene, health-check probes, or horizontal pod autoscaling.`);
    } else if (s.includes("system design") || s.includes("architecture")) {
      probes.push(`- System Design: Probe on CAP theorem trade-offs, horizontal vs vertical scaling, load balancing algorithms, rate limiting, and database sharding.`);
    } else {
      probes.push(`- ${skill}: Ask how they implemented and tested ${skill} in a production environment, including edge cases and failure modes.`);
    }
  }

  return probes.join("\n");
}

/**
 * Generates an authoritative interview prompt directive incorporating
 * the candidate's actual projects, verified skills, and target role.
 */
export function buildProfileInterviewDirective(profile: ProfileInterviewContext | null): string {
  if (!profile) return "";

  const role = profile.targetRole || "Software Engineer";
  const rawSkills = Array.isArray(profile.skills) ? profile.skills : [];
  const skillsList = rawSkills.length > 0
    ? rawSkills.join(", ")
    : "Full Stack Web Technologies";

  const projects = profile.projects || [];
  let projectsBlock = "None provided.";

  if (projects.length > 0) {
    projectsBlock = projects
      .map((p, idx) => {
        const stack = Array.isArray(p.techStack) ? p.techStack.join(", ") : "Custom Stack";
        const hasLive = p.liveUrl ? ` (Live demo at: ${p.liveUrl})` : "";
        const desc = p.description ? ` - Description: ${p.description}` : "";
        return `${idx + 1}. "${p.title}" [Tech Stack: ${stack}]${hasLive}${desc}`;
      })
      .join("\n");
  }

  const skillProbes = buildSkillProbingGuides(rawSkills);

  return `
======================================================================
CANDIDATE PROFILE & RESUME DOSSIER (ACTIVE INTERVIEW DIRECTIVE)
======================================================================
TARGET ROLE: ${role}
VERIFIED RESUME SKILLS: ${skillsList}

CANDIDATE PORTFOLIO PROJECTS:
${projectsBlock}

SKILL-SPECIFIC QUESTIONING DIRECTIVES:
${skillProbes || "- Probe on their core claimed technologies and how they apply them in production."}

INTERVIEW CONDUCT RULES:
1. Skill Verification: You MUST actively evaluate the candidate's grasp of their selected skills (${skillsList}). Ask focused questions that test whether they have genuine hands-on experience or superficial familiarity.
2. Project Deep-Dive: Connect the technical problem or architecture questions to their projects (e.g. "${projects[0]?.title || "your recent project"}"). Ask about trade-offs, architecture decisions, and scaling considerations.
3. Natural Transition: Begin with technical background and skill probing, then smoothly pivot to live problem solving and code analysis.
4. Professional Persona: Maintain an encouraging yet rigorous interviewer persona (female interviewer "Ananya").
======================================================================
`;
}
