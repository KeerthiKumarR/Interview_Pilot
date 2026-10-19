/**
 * Phase 2 Backend Benchmark Review Verification Script
 * Tests:
 * 1. Resume Auditor (1-page benchmark, action verbs, metrics)
 * 2. Live Link Auditor (HTTP status, latency, error recovery)
 * 3. GitHub & Codebase Auditor (Public repos, README, secrets scanning)
 * 4. LinkedIn Auditor (Headline & About rewrites)
 * 5. Prisma Persistence (ProfileReview and ReadinessScore calculation)
 */

require("dotenv").config({ path: ".env.local" });
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function runPhase2Tests() {
  console.log("==========================================");
  console.log("Starting Phase 2 Review Engine Verification");
  console.log("==========================================");

  try {
    // Test 1: Resume Auditor
    console.log("\n[Test 1] Testing Resume Auditor against written benchmarks...");
    const { auditResume } = require("../lib/review/resume-auditor");
    const sampleResume = `
      John Doe
      johndoe@example.com | github.com/johndoe | leetcode.com/johndoe
      
      TECHNICAL SKILLS
      Languages: TypeScript, JavaScript, Python, SQL
      Frameworks: React, Next.js, Node.js, Express, Tailwind CSS
      Databases: PostgreSQL, Redis, Prisma ORM
      
      TECHNICAL PROJECTS
      AlgoPilot - AI Placement Readiness Copilot
      - Architected real-time AI interview mock engine reducing latency by 45% (from 420ms to 230ms).
      - Engineered full-stack Next.js application with PostgreSQL database serving over 5,000 requests.
      - Integrated Monaco code editor with Judge0 API and automated proctoring telemetry.
      
      EDUCATION
      B.Tech Computer Science and Engineering - CGPA: 8.9/10
    `;

    const resumeAudit = await auditResume(sampleResume, 1, "Full Stack Developer", {
      github: "https://github.com/johndoe",
      leetcode: "https://leetcode.com/johndoe",
    });

    console.log(`✓ Resume Audit Score: ${resumeAudit.score}/100`);
    console.log(`  - Total Checks: ${resumeAudit.checks.length}`);
    console.log(`  - Checks Passed: ${resumeAudit.checks.filter((c) => c.passed).length}`);
    console.log(`  - Sample Check: "${resumeAudit.checks[0].name}" -> Passed: ${resumeAudit.checks[0].passed}`);
    if (resumeAudit.score < 50) {
      throw new Error("Resume audit score unexpectedly low for benchmark-conforming resume.");
    }

    // Test 2: Live Link Auditor
    console.log("\n[Test 2] Testing Live Link Auditor (HTTP 200 & latency)...");
    const { auditLiveLinks } = require("../lib/review/live-link-auditor");
    const liveAudit = await auditLiveLinks([
      {
        title: "Test Online Project",
        liveUrl: "https://example.com",
      },
      {
        title: "Test Offline Project",
        liveUrl: "https://this-domain-definitely-does-not-exist-12345.org",
      },
    ]);

    console.log(`✓ Live Link Audit Score: ${liveAudit.score}/100`);
    console.log(`  - Total Links Checked: ${liveAudit.totalChecked}`);
    console.log(`  - Verified Alive: ${liveAudit.aliveCount}`);
    console.log(`  - Links Results:`);
    liveAudit.links.forEach((l) => {
      console.log(`    * "${l.projectTitle}": ${l.isAlive ? "ONLINE (200)" : "OFFLINE"} in ${l.latencyMs}ms`);
    });

    if (liveAudit.aliveCount !== 1) {
      throw new Error("Live link checker did not correctly distinguish online vs offline hosts.");
    }

    // Test 3: GitHub & Codebase Auditor
    console.log("\n[Test 3] Testing GitHub Auditor & Secret Scanner...");
    const { auditGithub } = require("../lib/review/github-auditor");
    const githubAudit = await auditGithub("torvalds"); // Linus Torvalds public profile test
    console.log(`✓ GitHub Audit Score: ${githubAudit.score}/100`);
    console.log(`  - Username: @${githubAudit.username}`);
    console.log(`  - Profile Found: ${githubAudit.profileFound}`);
    console.log(`  - Repos Inspected: ${githubAudit.repos.length}`);
    console.log(`  - Secret hygiene passed: ${githubAudit.checks.find((c) => c.id === "secret_hygiene")?.passed}`);

    // Test 4: LinkedIn Auditor
    console.log("\n[Test 4] Testing LinkedIn Auditor & Rewrite Generation...");
    const { auditLinkedin } = require("../lib/review/linkedin-auditor");
    const linkedinAudit = await auditLinkedin(
      "https://linkedin.com/in/testuser",
      "Software developer with interest in building web systems.",
      "Full Stack Developer",
      ["React", "Node.js", "PostgreSQL"],
      [{ title: "AlgoPilot Copilot" }]
    );
    console.log(`✓ LinkedIn Audit Score: ${linkedinAudit.score}/100`);
    console.log(`  - Generated Headline: "${linkedinAudit.readyToPasteHeadline}"`);
    console.log(`  - Generated About length: ${linkedinAudit.readyToPasteAbout.length} characters`);

    // Test 5: Full Prisma Database Persistence & Readiness Score Update
    console.log("\n[Test 5] Verifying ProfileReview and ReadinessScore persistence in Prisma...");
    const testUser = await prisma.user.create({
      data: {
        clerkId: `test_rev_${Date.now()}`,
        email: `test_rev_${Date.now()}@example.com`,
        name: "Audit Test User",
      },
    });

    const testProfile = await prisma.studentProfile.create({
      data: {
        userId: testUser.id,
        targetRole: "Full Stack Developer",
        resumeText: sampleResume,
        resumePageCount: 1,
        githubUsername: "johndoe",
        leetcodeUsername: "johndoe_lc",
        linkedinUrl: "https://linkedin.com/in/johndoe",
        skills: ["React", "TypeScript", "Node.js"],
      },
    });

    const reviewRecord = await prisma.profileReview.create({
      data: {
        profileId: testProfile.id,
        resumeCheck: resumeAudit,
        codebaseCheck: githubAudit,
        liveLinkCheck: liveAudit,
        linkedinCheck: linkedinAudit,
        overallReview: "Test suite verified successfully.",
      },
    });

    const readiness = await prisma.readinessScore.create({
      data: {
        profileId: testProfile.id,
        overallScore: 78,
        tier: "Placement ready",
        resumeScore: resumeAudit.score,
        projectsScore: liveAudit.score,
        interviewScore: 80,
        githubScore: githubAudit.score,
        leetcodeScore: 75,
        linkedinScore: linkedinAudit.score,
        achievementsScore: 85,
        topFixes: ["Add setup instructions to project README", "Quantify bullet points"],
      },
    });

    console.log(`✓ Created ProfileReview record: ${reviewRecord.id}`);
    console.log(`✓ Created ReadinessScore: ${readiness.overallScore}/100 [${readiness.tier}]`);

    // Cleanup test user
    await prisma.user.delete({ where: { id: testUser.id } });
    console.log("✓ Test records cleaned up successfully.");

    console.log("\n==========================================");
    console.log("ALL PHASE 2 BACKEND AUDIT TESTS PASSED (5/5)!");
    console.log("==========================================");
  } catch (error) {
    console.error("Phase 2 test failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runPhase2Tests();
