/**
 * Verification test for skill-based interviewing and WebSpeech voice flow.
 * Run with: npx tsx scripts/test-skills-interview.ts
 */
import { buildProfileInterviewDirective } from "../lib/interview/profile-context";
import { getAvailableVoices } from "../hooks/use-web-speech";

function runTests() {
  console.log("=================================================");
  console.log("1. TESTING VOICE SELECTION & WEBSPEECH DEFAULTS");
  console.log("=================================================");

  const voices = getAvailableVoices();
  console.log(`Total voices available: ${voices.length}`);
  const firstVoice = voices[0];
  console.log(`Top default voice: [${firstVoice.id}] ${firstVoice.name} - ${firstVoice.label} (${firstVoice.gender})`);

  if (firstVoice.id !== "local_female") {
    throw new Error(`Expected top voice to be local_female, got ${firstVoice.id}`);
  }
  if (firstVoice.gender !== "female") {
    throw new Error(`Expected female gender for local_female`);
  }
  console.log("✓ WebSpeech female voice is priority #1");

  console.log("\n=================================================");
  console.log("2. TESTING SKILL-SPECIFIC PROBING DIRECTIVES");
  console.log("=================================================");

  const mockProfile = {
    targetRole: "Senior Full Stack Engineer",
    skills: ["React", "TypeScript", "Node.js", "PostgreSQL", "Docker", "Redis"],
    projects: [
      {
        title: "E-Commerce Microservices Platform",
        techStack: ["Next.js", "TypeScript", "Node.js", "PostgreSQL", "Docker"],
        description: "High-scale checkout application handling 10k orders/min",
        liveUrl: "https://demo.example.com",
      },
    ],
    achievements: [
      { title: "Reduced checkout API latency by 45%", category: "Performance" },
    ],
  };

  const directive = buildProfileInterviewDirective(mockProfile);
  console.log("Generated Directive Preview:\n");
  console.log(directive);

  // Verifications
  if (!directive.includes("TARGET ROLE: Senior Full Stack Engineer")) {
    throw new Error("Missing target role");
  }
  if (!directive.includes("React / Next.js: Probe on Server vs Client Components")) {
    throw new Error("Missing React probe");
  }
  if (!directive.includes("TypeScript: Probe on Generics")) {
    throw new Error("Missing TypeScript probe");
  }
  if (!directive.includes("SQL / Databases: Probe on indexing strategies")) {
    throw new Error("Missing PostgreSQL probe");
  }
  if (!directive.includes("E-Commerce Microservices Platform")) {
    throw new Error("Missing candidate project reference");
  }
  if (!directive.includes("interviewer persona (female interviewer \"Ananya\")")) {
    throw new Error("Missing female interviewer persona rule");
  }

  console.log("✓ All skill-specific probes and project directives are verified successfully!");
}

runTests();
