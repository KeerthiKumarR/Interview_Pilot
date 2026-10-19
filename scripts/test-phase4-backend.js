/**
 * Phase 4 Backend Verification Script
 * Tests:
 * 1. Placement Readiness Scoring Engine & Formula Weights
 * 2. Status Tiers (Not ready, Almost ready, Placement ready)
 * 3. Dynamic Top 5 High-Impact Actions
 * 4. Consistency Benchmark Test (5 consecutive runs within ±3 points)
 * 5. Prisma Persistence & API readiness response
 */

require("dotenv").config({ path: ".env.local" });
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function runPhase4Tests() {
  console.log("==========================================");
  console.log("Starting Phase 4 Placement Readiness Verification");
  console.log("==========================================");

  try {
    const { calculateReadinessMetrics } = require("../lib/scoring/readiness");

    // Test 1: Incomplete Profile Check
    console.log("\n[Test 1] Testing Incomplete Profile (Brand New Student)...");
    const emptyReport = calculateReadinessMetrics(null);
    console.log(`✓ Empty Profile Score: ${emptyReport.overallScore}/100 [Tier: "${emptyReport.tier}"]`);
    console.log(`  - Top Actions identified: ${emptyReport.topFixes.length}`);
    console.log(`  - Priority #1: "${emptyReport.topFixes[0]?.action}" (+${emptyReport.topFixes[0]?.impactPoints} pts)`);
    if (emptyReport.overallScore >= 50 || emptyReport.tier !== "Not ready") {
      throw new Error("Empty profile should be classified as 'Not ready' (<50 pts).");
    }

    // Test 2: Optimized Profile Check
    console.log("\n[Test 2] Testing Optimized Profile (Placement Ready Candidate)...");
    const optimizedProfile = {
      id: "opt-1",
      targetRole: "Full Stack Developer",
      resumeFileName: "resume.pdf",
      resumeText: "Architected scalable applications...",
      resumePageCount: 1,
      githubUsername: "johndoe",
      leetcodeUsername: "johndoe_lc",
      linkedinUrl: "https://linkedin.com/in/johndoe",
      projects: [
        {
          id: "p1",
          title: "AlgoPilot Copilot",
          liveUrl: "https://algopilot.vercel.app",
          techStack: ["Next.js", "PostgreSQL"],
        },
      ],
      achievements: [
        { id: "a1", title: "Hackathon Winner", category: "hackathon" },
        { id: "a2", title: "AWS Certified Developer", category: "certification" },
      ],
    };

    const optimizedReport = calculateReadinessMetrics(optimizedProfile, {
      resumeScore: 90,
      projectsScore: 85,
      interviewScore: 88,
      githubScore: 80,
      leetcodeScore: 85,
      linkedinScore: 90,
      achievementsScore: 90,
    });

    console.log(`✓ Optimized Profile Score: ${optimizedReport.overallScore}/100 [Tier: "${optimizedReport.tier}"]`);
    console.log(`  - Total Components: ${optimizedReport.components.length}`);
    optimizedReport.components.forEach((c) => {
      console.log(`    * ${c.name} (${c.weight}%): ${c.score}/100 -> Contribution: ${c.weightedScore} pts [${c.status}]`);
    });

    if (optimizedReport.overallScore < 75 || optimizedReport.tier !== "Placement ready") {
      throw new Error("Optimized profile should be classified as 'Placement ready' (>=75 pts).");
    }

    // Test 3: Consistency Benchmark (Challenge Test Area: Same profile 5 times gives score within ±3 points)
    console.log("\n[Test 3] Testing Consistency Rule (5 Consecutive Runs)...");
    const scores = [];
    for (let i = 0; i < 5; i++) {
      const run = calculateReadinessMetrics(optimizedProfile, {
        resumeScore: 88,
        projectsScore: 82,
        interviewScore: 80,
        githubScore: 78,
        leetcodeScore: 75,
        linkedinScore: 85,
        achievementsScore: 80,
      });
      scores.push(run.overallScore);
    }

    const minScore = Math.min(...scores);
    const maxScore = Math.max(...scores);
    const variance = maxScore - minScore;
    console.log(`✓ Scores recorded across 5 runs: [${scores.join(", ")}]`);
    console.log(`✓ Variance: ${variance} points (Requirement: within ±3 points). PASSED!`);
    if (variance > 3) {
      throw new Error(`Score variance too high: ${variance} points.`);
    }

    // Test 4: Database Persistence & Recalculate Flow
    console.log("\n[Test 4] Testing Prisma Database Persistence...");
    const testUser = await prisma.user.create({
      data: {
        clerkId: `test_p4_${Date.now()}`,
        email: `test_p4_${Date.now()}@example.com`,
        name: "Readiness Candidate",
      },
    });

    const testProfile = await prisma.studentProfile.create({
      data: {
        userId: testUser.id,
        targetRole: "Full Stack Developer",
        resumePageCount: 1,
        githubUsername: "johndoe",
        leetcodeUsername: "johndoe_lc",
      },
    });

    const savedScore = await prisma.readinessScore.create({
      data: {
        profileId: testProfile.id,
        overallScore: optimizedReport.overallScore,
        tier: optimizedReport.tier,
        resumeScore: 90,
        projectsScore: 85,
        interviewScore: 88,
        githubScore: 80,
        leetcodeScore: 85,
        linkedinScore: 90,
        achievementsScore: 90,
        topFixes: optimizedReport.topFixes.map((f) => f.action) as any,
      },
    });

    console.log(`✓ Persisted ReadinessScore: ID ${savedScore.id}`);
    console.log(`  - Overall Score: ${savedScore.overallScore}/100`);
    console.log(`  - Tier: "${savedScore.tier}"`);
    console.log(`  - Top Fixes saved: ${JSON.stringify(savedScore.topFixes)}`);

    // Cleanup
    await prisma.user.delete({ where: { id: testUser.id } });
    console.log("✓ Cleaned up test records cleanly.");

    console.log("\n==========================================");
    console.log("ALL PHASE 4 BACKEND TESTS PASSED (4/4)!");
    console.log("==========================================");
  } catch (error) {
    console.error("Phase 4 test failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runPhase4Tests();
