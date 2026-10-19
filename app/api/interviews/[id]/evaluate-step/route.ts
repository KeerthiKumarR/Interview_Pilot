import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { evaluateAnswerRubric } from "@/services/ai-service";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: interviewId } = await params;
    const body = await req.json();
    const { questionId, candidateAnswer, retryCount = 0, drawingLabels = [], hasDrawn = false } = body;

    if (!questionId || !candidateAnswer) {
      return NextResponse.json(
        { error: "questionId and candidateAnswer are required" },
        { status: 400 }
      );
    }

    // Get current question
    const question = await prisma.interviewQuestion.findUnique({
      where: { id: questionId },
    });

    if (!question) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    const expectedRubric = (question.expectedRubric as string[]) || [];
    const isRetry = retryCount > 0;

    // Load recent conversation history for context continuity
    const recentMessages = await prisma.message.findMany({
      where: { interviewId },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: { role: true, content: true },
    }).catch(() => []);
    recentMessages.reverse();

    // Run evaluation with conversational history and drawing diagram context
    const evaluation = await evaluateAnswerRubric({
      questionTitle: question.title,
      questionPrompt: question.promptText,
      expectedRubric,
      secondaryProbe: question.secondaryProbe,
      candidateAnswer,
      isRetry,
      category: question.category,
      options: (question.options as string[]) || null,
      correctOption: question.correctOption,
      recentConversation: recentMessages,
      drawingLabels: Array.isArray(drawingLabels) ? drawingLabels : [],
      hasDrawn: Boolean(hasDrawn),
    });

    // Check if should advance
    const shouldAdvance = evaluation.isSatisfactory || retryCount >= question.maxProbes;

    // Persist messages to DB for transcript replay & report generation
    await prisma.message.create({
      data: {
        interviewId,
        role: "user",
        content: candidateAnswer,
      },
    }).catch((err) => console.warn("Failed to persist user message:", err));

    if (evaluation.spokenFeedback) {
      await prisma.message.create({
        data: {
          interviewId,
          role: "assistant",
          content: evaluation.spokenFeedback,
        },
      }).catch((err) => console.warn("Failed to persist assistant message:", err));
    }

    // Save step evaluation in DB
    try {
      await prisma.stepEvaluation.create({
        data: {
          interviewId,
          questionId,
          candidateTranscript: candidateAnswer,
          matchedConcepts: evaluation.matchedConcepts,
          missedConcepts: evaluation.missedConcepts,
          probeCount: retryCount,
          score: evaluation.score,
          feedback: evaluation.spokenFeedback,
        },
      });
    } catch (dbErr) {
      console.warn("Failed to save step evaluation to DB:", dbErr);
    }

    // Find next question strictly within the SAME job role (or default pool if null)
    let nextQuestion = null;
    if (shouldAdvance) {
      nextQuestion = await prisma.interviewQuestion.findFirst({
        where: {
          jobRoleId: question.jobRoleId ?? null,
          order: { gt: question.order },
          isActive: true,
        },
        orderBy: { order: "asc" },
      });
    }

    return NextResponse.json({
      isSatisfactory: evaluation.isSatisfactory,
      spokenFeedback: evaluation.spokenFeedback,
      shouldAdvance,
      nextQuestion,
      matchedConcepts: evaluation.matchedConcepts,
      missedConcepts: evaluation.missedConcepts,
      score: evaluation.score,
    });
  } catch (error: any) {
    console.error("Step evaluation route error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to evaluate step" },
      { status: 500 }
    );
  }
}
