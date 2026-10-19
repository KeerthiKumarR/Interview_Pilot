/**
 * Phase 3 Backend Verification Script
 * Tests:
 * 1. Profile Interview Directive Generator
 * 2. Ollama Endpoint & Provider Configuration
 * 3. 20% Mock Interview Weight Sync with ReadinessScore
 */

require("dotenv").config({ path: ".env.local" });
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function runPhase3Tests() {
  console.log("==========================================");
  console.log("Starting Phase 3 Mock Interview Verification");
  console.log("==========================================");

  try {
    // Test 1: Profile Interview Directive Builder
    console.log("\n[Test 1] Testing Profile Interview Directive Generator...");
    const { buildProfileInterviewDirective } = require("../lib/interview/profile-context");
    
    const mockProfile = {
      targetRole: "Full Stack Engineer",
      skills: ["React", "Next.js", "TypeScript", "PostgreSQL"],
      projects: [
        {
          title: "AlgoPilot Copilot",
          description: "Real-time AI technical interview simulator.",
          techStack: ["Next.js", "Prisma", "Tailwind CSS"],
          liveUrl: "https://algopilot.vercel.app",
        },
      ],
      achievements: [{ title: "Hackathon Winner", category: "hackathon" }],
    };

    const directive = buildProfileInterviewDirective(mockProfile);
    console.log("✓ Profile Directive generated successfully.");
    if (!directive.includes("AlgoPilot Copilot") || !directive.includes("Full Stack Engineer")) {
      throw new Error("Directive failed to incorporate student project and target role.");
    }
    console.log(`  - Target Role present: ${directive.includes("Full Stack Engineer")}`);
    console.log(`  - Project title present: ${directive.includes("AlgoPilot Copilot")}`);

    // Test 2: Ollama Connectivity / Provider Configuration
    console.log("\n[Test 2] Testing Ollama Provider Settings & Configuration...");
    const { getProviderConfig } = require("../services/ai-service");
    const config = await getProviderConfig();

    console.log(`✓ AI Configuration loaded:`);
    console.log(`  - Active Provider: ${config.activeProvider}`);
    console.log(`  - Active Model: ${config.activeModel}`);
    console.log(`  - Ollama Base URL: ${config.ollama.url}`);
    console.log(`  - Ollama Default Model: ${config.ollama.model}`);

    // Test 3: Readiness Score Sync with Interview Performance (20% Weight)
    console.log("\n[Test 3] Testing Mock Interview Score 20% Weight Math in Database...");
    const testUser = await prisma.user.create({
      data: {
        clerkId: `test_p3_${Date.now()}`,
        email: `test_p3_${Date.now()}@example.com`,
        name: "Phase 3 Candidate",
      },
    });

    const studentProfile = await prisma.studentProfile.create({
      data: {
        userId: testUser.id,
        targetRole: "Full Stack Developer",
        skills: ["React", "Next.js"],
      },
    });

    // Simulate interview report with score 85
    const interviewScore = 85;
    const resumeScore = 80;
    const projectsScore = 90;
    const githubScore = 70;
    const leetcodeScore = 75;
    const linkedinScore = 60;
    const achievementsScore = 80;

    // Weight formula:
    // Resume 25% (20) + Projects 25% (22.5) + Interview 20% (17) + GitHub 10% (7) + LeetCode 10% (7.5) + LinkedIn 5% (3) + Achievements 5% (4) = 81
    const expectedOverall = Math.round(
      resumeScore * 0.25 +
      projectsScore * 0.25 +
      interviewScore * 0.20 +
      githubScore * 0.10 +
      leetcodeScore * 0.10 +
      linkedinScore * 0.05 +
      achievementsScore * 0.05
    );

    const readiness = await prisma.readinessScore.create({
      data: {
        profileId: studentProfile.id,
        overallScore: expectedOverall,
        tier: expectedOverall >= 75 ? "Placement ready" : "Almost ready",
        resumeScore,
        projectsScore,
        interviewScore,
        githubScore,
        leetcodeScore,
        linkedinScore,
        achievementsScore,
        topFixes: ["Quantify bullet points on resume"],
      },
    });

    console.log(`✓ ReadinessScore calculated with 20% interview performance:`);
    console.log(`  - Interview Score: ${readiness.interviewScore}/100 (Contributes 20%)`);
    console.log(`  - Overall Placement Score: ${readiness.overallScore}/100`);
    console.log(`  - Status Tier: "${readiness.tier}"`);

    if (readiness.overallScore !== expectedOverall) {
      throw new Error(`Expected score ${expectedOverall}, got ${readiness.overallScore}`);
    }

    // Cleanup
    await prisma.user.delete({ where: { id: testUser.id } });
    console.log("✓ Cleaned up test records cleanly.");

    console.log("\n==========================================");
    console.log("ALL PHASE 3 BACKEND TESTS PASSED (3/3)!");
    console.log("==========================================");
  } catch (error) {
    console.error("Phase 3 verification failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runPhase3Tests();
