import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeStaff } from "@/lib/admin-auth";
import { CODING_PROBLEMS } from "@/data/problems";
import { Prisma } from "@prisma/client";

const INITIAL_QUIZ_PROBLEMS = [
  {
    title: "Array vs Linked List Access Complexity",
    category: "option_quiz",
    difficulty: "easy",
    stage: "approach",
    durationMinutes: 2,
    promptText: "What is the worst-case time complexity of accessing an arbitrary element by index in a singly linked list versus a standard contiguous array?",
    options: [
      "Linked List: O(1), Array: O(n)",
      "Linked List: O(n), Array: O(1)",
      "Linked List: O(log n), Array: O(1)",
      "Linked List: O(n), Array: O(n)",
    ],
    correctOption: 1,
    explanation: "Arrays allow instant O(1) random memory offset indexing, whereas a singly linked list requires sequential pointer traversal of O(n) steps to reach index k.",
    skillTags: ["Data Structures", "Algorithms", "Complexity"],
  },
  {
    title: "JavaScript Event Loop Microtask Ordering",
    category: "option_quiz",
    difficulty: "medium",
    stage: "approach",
    durationMinutes: 3,
    promptText: "In JavaScript V8 engine, which task queue has higher priority and executes first when the call stack empties?",
    options: [
      "setTimeout macrotask callbacks",
      "Promise .then() / catch() microtask queue",
      "setInterval timer callbacks",
      "setImmediate callback queue",
    ],
    correctOption: 1,
    explanation: "Microtasks (Promises, queueMicrotask, MutationObserver) are always drained completely before the event loop advances to the next macrotask (setTimeout, setInterval).",
    skillTags: ["JavaScript", "Event Loop", "Asynchronous"],
  },
  {
    title: "Database Indexing B-Tree vs Hash Index",
    category: "option_quiz",
    difficulty: "medium",
    stage: "approach",
    durationMinutes: 3,
    promptText: "Why is a B-Tree / B+Tree index preferred over a Hash index for primary database table columns?",
    options: [
      "Hash indexes require O(n^2) disk writes",
      "B-Tree indexes support efficient range scans (BETWEEN, >, <) and sorting",
      "Hash indexes cannot handle string keys",
      "B-Tree indexes use zero disk storage",
    ],
    correctOption: 1,
    explanation: "Hash indexes only support point equality lookups (=). B-Trees maintain ordered keys enabling logarithmic range scans, prefix matching, and ORDER BY queries.",
    skillTags: ["Databases", "System Design", "SQL"],
  },
  {
    title: "HTTP Status Codes: Idempotency",
    category: "option_quiz",
    difficulty: "easy",
    stage: "approach",
    durationMinutes: 2,
    promptText: "Which of the following HTTP methods is NOT idempotent according to RFC 7231 specifications?",
    options: ["GET", "PUT", "DELETE", "POST"],
    correctOption: 3,
    explanation: "POST is designed for non-idempotent operations where multiple identical requests may create multiple distinct server resources or trigger side effects repeatedly.",
    skillTags: ["HTTP", "Networking", "Web APIs"],
  },
  {
    title: "CAP Theorem Trade-Offs in Distributed Systems",
    category: "option_quiz",
    difficulty: "hard",
    stage: "approach",
    durationMinutes: 3,
    promptText: "Under the CAP theorem, when an unavoidable network partition (P) occurs between distributed nodes, what choice must a distributed database make?",
    options: [
      "Sacrifice Partition tolerance to preserve both Consistency and Availability",
      "Choose either Consistency (rejecting updates) or Availability (serving potentially stale data)",
      "Always reboot all replica nodes automatically",
      "Switch to single-threaded in-memory processing",
    ],
    correctOption: 1,
    explanation: "Network partitions in distributed systems cannot be avoided. A system must therefore choose between strong Consistency (CP, rejecting writes when consensus cannot be reached) or High Availability (AP, returning responses that might be stale).",
    skillTags: ["Distributed Systems", "System Design", "Architecture"],
  },
];

export async function GET(req: Request) {
  const isStaff = await authorizeStaff();
  if (!isStaff) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const url = new URL(req.url);
    const category = url.searchParams.get("category");
    const difficulty = url.searchParams.get("difficulty");
    const search = url.searchParams.get("search")?.toLowerCase().trim();

    // Check count and auto-seed if bank is empty
    const count = await prisma.questionBankItem.count();
    if (count === 0) {
      // Seed first 12 coding problems from CODING_PROBLEMS
      const initialCoding = CODING_PROBLEMS.slice(0, 15);
      for (const p of initialCoding) {
        // Derive test cases from examples
        const testCases = p.examples.map((ex, idx) => ({
          input: ex.input,
          expectedOutput: ex.output,
          isHidden: idx > 0,
        }));

        await prisma.questionBankItem.create({
          data: {
            title: p.title,
            category: "code_editor",
            difficulty: p.difficulty,
            stage: "coding",
            durationMinutes: p.difficulty === "hard" ? 20 : p.difficulty === "medium" ? 15 : 10,
            promptText: p.description,
            examples: (p.examples as unknown as Prisma.InputJsonValue) ?? undefined,
            constraints: (p.constraints as unknown as Prisma.InputJsonValue) ?? undefined,
            testCases: (testCases as unknown as Prisma.InputJsonValue) ?? undefined,
            starterCode: (p.starterCode as unknown as Prisma.InputJsonValue) ?? undefined,
            skillTags: (p.tags as unknown as Prisma.InputJsonValue) ?? undefined,
            isActive: true,
          },
        });
      }

      // Seed initial quiz questions
      for (const q of INITIAL_QUIZ_PROBLEMS) {
        await prisma.questionBankItem.create({
          data: {
            title: q.title,
            category: q.category,
            difficulty: q.difficulty,
            stage: q.stage,
            durationMinutes: q.durationMinutes,
            promptText: q.promptText,
            options: (q.options as unknown as Prisma.InputJsonValue) ?? undefined,
            correctOption: q.correctOption,
            explanation: q.explanation,
            skillTags: (q.skillTags as unknown as Prisma.InputJsonValue) ?? undefined,
            isActive: true,
          },
        });
      }
    }

    // Build query filters
    const where: Prisma.QuestionBankItemWhereInput = {};
    if (category && category !== "all") {
      where.category = category;
    }
    if (difficulty && difficulty !== "all") {
      where.difficulty = difficulty;
    }
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { promptText: { contains: search, mode: "insensitive" } },
      ];
    }

    const questions = await prisma.questionBankItem.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
    });

    return NextResponse.json({ questions, total: questions.length });
  } catch (error) {
    console.error("GET /api/admin/question-bank error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch question bank" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const isStaff = await authorizeStaff();
  if (!isStaff) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      title,
      category = "code_editor",
      difficulty = "medium",
      stage = "coding",
      durationMinutes = 10,
      promptText,
      options,
      correctOption,
      explanation,
      examples,
      constraints,
      testCases,
      starterCode,
      skillTags,
    } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }
    if (!promptText || !promptText.trim()) {
      return NextResponse.json({ error: "Question prompt / description is required" }, { status: 400 });
    }

    // Clean inputs
    const created = await prisma.questionBankItem.create({
      data: {
        title: title.trim(),
        category,
        difficulty,
        stage,
        durationMinutes: Number(durationMinutes) || 10,
        promptText: promptText.trim(),
        options: options ? (options as Prisma.InputJsonValue) : undefined,
        correctOption: typeof correctOption === "number" ? correctOption : null,
        explanation: explanation?.trim() || null,
        examples: examples ? (examples as Prisma.InputJsonValue) : undefined,
        constraints: constraints ? (constraints as Prisma.InputJsonValue) : undefined,
        testCases: testCases ? (testCases as Prisma.InputJsonValue) : undefined,
        starterCode: starterCode ? (starterCode as Prisma.InputJsonValue) : undefined,
        skillTags: skillTags ? (skillTags as Prisma.InputJsonValue) : undefined,
        isActive: true,
      },
    });

    return NextResponse.json({ success: true, question: created });
  } catch (error) {
    console.error("POST /api/admin/question-bank error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create question" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  const isStaff = await authorizeStaff();
  if (!isStaff) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      id,
      title,
      category,
      difficulty,
      stage,
      durationMinutes,
      promptText,
      options,
      correctOption,
      explanation,
      examples,
      constraints,
      testCases,
      starterCode,
      skillTags,
      isActive,
    } = body;

    if (!id) {
      return NextResponse.json({ error: "Question ID is required" }, { status: 400 });
    }

    const updated = await prisma.questionBankItem.update({
      where: { id },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(category !== undefined && { category }),
        ...(difficulty !== undefined && { difficulty }),
        ...(stage !== undefined && { stage }),
        ...(durationMinutes !== undefined && { durationMinutes: Number(durationMinutes) }),
        ...(promptText !== undefined && { promptText: promptText.trim() }),
        ...(options !== undefined && { options: options as Prisma.InputJsonValue }),
        ...(correctOption !== undefined && { correctOption }),
        ...(explanation !== undefined && { explanation }),
        ...(examples !== undefined && { examples: examples as Prisma.InputJsonValue }),
        ...(constraints !== undefined && { constraints: constraints as Prisma.InputJsonValue }),
        ...(testCases !== undefined && { testCases: testCases as Prisma.InputJsonValue }),
        ...(starterCode !== undefined && { starterCode: starterCode as Prisma.InputJsonValue }),
        ...(skillTags !== undefined && { skillTags: skillTags as Prisma.InputJsonValue }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) }),
      },
    });

    return NextResponse.json({ success: true, question: updated });
  } catch (error) {
    console.error("PUT /api/admin/question-bank error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update question" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  const isStaff = await authorizeStaff();
  if (!isStaff) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Question ID is required" }, { status: 400 });
    }

    await prisma.questionBankItem.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error("DELETE /api/admin/question-bank error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete question" },
      { status: 500 }
    );
  }
}
