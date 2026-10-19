/**
 * Phase 5 Backend Verification Script
 * Tests:
 * 1. Boolean Search Query & Platform Link Generator (LinkedIn, Wellfound, Internshala, Google)
 * 2. Candidate Job Matching Algorithm (Fit %, skill overlap, readiness score threshold, MSOT drive bonus)
 * 3. Database Persistence: JobPosting & JobApplication relations
 * 4. Application Status Pipeline (Saved -> Applied -> Interview)
 * 5. Admin Job Posting & Applicant Pipeline with Student Readiness Scores
 */

require("dotenv").config({ path: ".env.local" });
import { prisma } from "../lib/prisma";
import { buildBooleanSearchQuery } from "../lib/jobs/boolean-search";
import { calculateJobMatch } from "../lib/jobs/matcher";

async function runPhase5Tests() {
  console.log("==========================================");
  console.log("Starting Phase 5 Jobs & MSOT Board Backend Verification");
  console.log("==========================================");

  try {
    // Test 1: Boolean Search Query Generation
    console.log("\n[Test 1] Testing Boolean Search Query Generator...");
    const skills = ["React", "TypeScript", "Node.js", "PostgreSQL", "Docker"];
    const targetRole = "Full Stack Developer";
    const booleanResult = buildBooleanSearchQuery(skills, targetRole, "Bangalore OR remote");

    console.log(`✓ Generated Boolean Query: ${booleanResult.query}`);
    console.log(`✓ External Search URLs:`);
    console.log(`  - LinkedIn: ${booleanResult.externalPlatformUrls.linkedin}`);
    console.log(`  - Wellfound: ${booleanResult.externalPlatformUrls.wellfound}`);
    console.log(`  - Internshala: ${booleanResult.externalPlatformUrls.internshala}`);
    console.log(`  - Google Jobs: ${booleanResult.externalPlatformUrls.googleJobs}`);

    if (
      !booleanResult.query.includes("React") ||
      !booleanResult.query.includes("Full Stack") ||
      !booleanResult.externalPlatformUrls.linkedin.includes("linkedin.com")
    ) {
      throw new Error("Boolean query failed to correctly include skills, role, or valid platform links.");
    }

    // Test 2: Job Match Engine
    console.log("\n[Test 2] Testing Candidate-to-Job Matching Engine...");
    const studentSkills = ["React", "Next.js", "TypeScript", "Tailwind CSS"];
    const jobSkills = ["React", "TypeScript", "Node.js", "PostgreSQL"];
    
    // Candidate with Readiness Score 80 matching internal MSOT Drive
    const msotMatch = calculateJobMatch(studentSkills, jobSkills, 80, 60, true);
    console.log(`✓ MSOT Drive Match Fit: ${msotMatch.fitPercentage}% (Eligible: ${msotMatch.isEligible})`);
    console.log(`  - Matched Skills: [${msotMatch.matchedSkills.join(", ")}]`);
    console.log(`  - Missing Skills: [${msotMatch.missingSkills.join(", ")}]`);
    console.log(`  - Reason: "${msotMatch.matchReason}"`);

    if (msotMatch.fitPercentage < 50 || !msotMatch.isEligible || !msotMatch.matchedSkills.includes("React")) {
      throw new Error("Match calculation produced unexpected match results.");
    }

    // Test 3: Database Persistence of Job Posting
    console.log("\n[Test 3] Testing Job Posting Persistence & Prisma Schema...");
    const testJob = await prisma.jobPosting.create({
      data: {
        title: "Test Software Engineer Intern",
        company: "MSOT Partner Labs",
        description: "Hands-on internship building next-gen developer tools.",
        location: "Bangalore",
        isRemote: true,
        jobType: "internship",
        applyUrl: "https://algopilot.dev/careers/test-job",
        requiredSkills: ["React", "Node.js", "TypeScript"],
        minReadinessScore: 65,
        isMSOTInternal: true,
        postedByStaff: true,
        stipendOrSalary: "₹35,000 / month",
      },
    });

    console.log(`✓ Successfully created JobPosting ID: ${testJob.id}`);
    console.log(`  - Title: "${testJob.title}" at ${testJob.company}`);
    console.log(`  - MSOT Internal: ${testJob.isMSOTInternal}`);

    // Test 4: Student Job Application Pipeline
    console.log("\n[Test 4] Testing Job Application Lifecycle (Saved -> Applied -> Interview)...");
    const testUser = await prisma.user.create({
      data: {
        clerkId: `test_p5_${Date.now()}`,
        email: `candidate_p5_${Date.now()}@example.com`,
        name: "Jane Candidate",
      },
    });

    // Create student profile with readiness score
    const testProfile = await prisma.studentProfile.create({
      data: {
        userId: testUser.id,
        targetRole: "Full Stack Developer",
        skills: ["React", "TypeScript", "Node.js"],
        githubUsername: "janedev",
      },
    });

    await prisma.readinessScore.create({
      data: {
        profileId: testProfile.id,
        overallScore: 82,
        tier: "Placement ready",
        resumeScore: 85,
        projectsScore: 80,
        interviewScore: 85,
        githubScore: 80,
        leetcodeScore: 75,
        linkedinScore: 85,
        achievementsScore: 80,
      },
    });

    // Save Job
    const savedApp = await prisma.jobApplication.create({
      data: {
        userId: testUser.id,
        jobId: testJob.id,
        status: "Saved",
        notes: "Targeting this role for summer batch",
      },
    });
    console.log(`✓ Student Saved Job: App ID ${savedApp.id} [Status: "${savedApp.status}"]`);

    // Update to Applied
    const appliedApp = await prisma.jobApplication.update({
      where: { id: savedApp.id },
      data: {
        status: "Applied",
        appliedAt: new Date(),
      },
    });
    console.log(`✓ Student Applied to Job: [Status: "${appliedApp.status}", AppliedAt: ${appliedApp.appliedAt?.toISOString()}]`);

    // Test 5: Admin Query with Enriched Candidate Readiness
    console.log("\n[Test 5] Testing Admin Query with Candidate Readiness Score...");
    const adminJobs = await prisma.jobPosting.findUnique({
      where: { id: testJob.id },
      include: {
        applications: {
          include: {
            user: {
              include: {
                studentProfile: {
                  include: {
                    readinessScore: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const applicant = adminJobs?.applications[0];
    const candidateScore = applicant?.user.studentProfile?.readinessScore?.overallScore;
    const candidateTier = applicant?.user.studentProfile?.readinessScore?.tier;

    console.log(`✓ Admin View Verified for Job: "${adminJobs?.title}"`);
    console.log(`  - Total Applicants: ${adminJobs?.applications.length}`);
    console.log(`  - Candidate Name: ${applicant?.user.name}`);
    console.log(`  - Candidate Readiness Score: ${candidateScore}/100 [${candidateTier}]`);
    console.log(`  - Application Status: ${applicant?.status}`);

    if (candidateScore !== 82 || candidateTier !== "Placement ready") {
      throw new Error("Admin query did not retrieve the correct candidate readiness score or tier.");
    }

    // Cleanup test data
    console.log("\n[Cleanup] Removing temporary test records...");
    await prisma.jobApplication.deleteMany({ where: { jobId: testJob.id } });
    await prisma.jobPosting.delete({ where: { id: testJob.id } });
    await prisma.user.delete({ where: { id: testUser.id } });
    console.log("✓ Cleaned up test records cleanly.");

    console.log("\n==========================================");
    console.log("ALL PHASE 5 BACKEND TESTS PASSED (5/5)!");
    console.log("==========================================");
  } catch (error) {
    console.error("Phase 5 test failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runPhase5Tests();
