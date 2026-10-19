import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { authorizeAdmin } from "@/lib/admin-auth";

export async function GET() {
  if (!(await authorizeAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const settings = await prisma.systemSetting.findMany();
    const feedbacks = await prisma.feedback.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: { name: true, email: true },
        },
      },
    });

    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        interviews: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            problemTitle: true,
            difficulty: true,
            createdAt: true,
            status: true,
            report: {
              select: { overallScore: true, isSolved: true },
            },
          },
        },
        _count: {
          select: { interviews: true },
        },
      },
    });

    const settingsMap = settings.reduce((acc, s) => {
      acc[s.key] = s.value;
      return acc;
    }, {} as Record<string, string>);

    return NextResponse.json({ settings: settingsMap, feedbacks, users });
  } catch (error) {
    console.error("Admin GET Error:", error);
    return NextResponse.json({ error: "Failed to fetch admin data" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!(await authorizeAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();

    // ─── Direct Key Testing Action ────────────────────────────
    if (body.action === "test_key") {
      const { testProvider, testKey } = body;
      if (!testKey || typeof testKey !== "string") {
        return NextResponse.json({ error: "No API key provided to test" }, { status: 400 });
      }

      if (testProvider === "openrouter") {
        try {
          const testRes = await fetch("https://openrouter.ai/api/v1/auth/key", {
            headers: { Authorization: `Bearer ${testKey.trim()}` },
          });
          const testData = await testRes.json().catch(() => ({}));
          if (!testRes.ok || testData.error) {
            return NextResponse.json(
              { error: testData.error?.message || `OpenRouter rejected key (status ${testRes.status})` },
              { status: 400 }
            );
          }
          return NextResponse.json({
            success: true,
            message: `OpenRouter key is valid! Free requests remaining: ${testData.data?.free_model_daily_requests?.remaining ?? "active"}`,
          });
        } catch (e: any) {
          return NextResponse.json({ error: `Connection failed: ${e.message}` }, { status: 500 });
        }
      }

      if (testProvider === "gemini") {
        try {
          const testRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${testKey.trim()}`);
          if (!testRes.ok) {
            const testData = await testRes.json().catch(() => ({}));
            return NextResponse.json(
              { error: testData.error?.message || `Google Gemini rejected key (status ${testRes.status})` },
              { status: 400 }
            );
          }
          return NextResponse.json({
            success: true,
            message: "Google Gemini API key is valid and active!",
          });
        } catch (e: any) {
          return NextResponse.json({ error: `Connection failed: ${e.message}` }, { status: 500 });
        }
      }

      if (testProvider === "deepseek") {
        try {
          const testRes = await fetch("https://api.deepseek.com/models", {
            headers: { Authorization: `Bearer ${testKey.trim()}` },
          });
          if (!testRes.ok) {
            const testData = await testRes.json().catch(() => ({}));
            return NextResponse.json(
              { error: testData.error?.message || `DeepSeek rejected key (status ${testRes.status})` },
              { status: 400 }
            );
          }
          return NextResponse.json({
            success: true,
            message: "DeepSeek API key is valid and active!",
          });
        } catch (e: any) {
          return NextResponse.json({ error: `Connection failed: ${e.message}` }, { status: 500 });
        }
      }

      return NextResponse.json({ error: "Unsupported test provider" }, { status: 400 });
    }

    const { provider, model, reportProvider, reportModel, geminiApiKey, zaiApiKey } = body;

    // Validate OpenRouter API Key if provided
    if (body.openrouterApiKey && typeof body.openrouterApiKey === "string" && body.openrouterApiKey.trim()) {
      try {
        const testRes = await fetch("https://openrouter.ai/api/v1/auth/key", {
          headers: { Authorization: `Bearer ${body.openrouterApiKey.trim()}` },
        });
        const testData = await testRes.json().catch(() => ({}));
        if (!testRes.ok || testData.error) {
          return NextResponse.json(
            { error: `OpenRouter key validation failed: ${testData.error?.message || `Status ${testRes.status}`}` },
            { status: 400 }
          );
        }
      } catch (e: any) {
        return NextResponse.json({ error: `Failed to connect to OpenRouter: ${e.message}` }, { status: 400 });
      }
    }

    // Validate Google Gemini API Key if provided
    if (geminiApiKey && typeof geminiApiKey === "string" && geminiApiKey.trim()) {
      try {
        const testRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${geminiApiKey.trim()}`);
        if (!testRes.ok) {
          const testData = await testRes.json().catch(() => ({}));
          return NextResponse.json(
            { error: `Google Gemini key validation failed: ${testData.error?.message || `Status ${testRes.status}`}` },
            { status: 400 }
          );
        }
      } catch (e: any) {
        return NextResponse.json({ error: `Failed to connect to Google Gemini: ${e.message}` }, { status: 400 });
      }
    }

    if (provider) {
      await prisma.systemSetting.upsert({
        where: { key: "DEFAULT_AI_PROVIDER" },
        update: { value: provider },
        create: { key: "DEFAULT_AI_PROVIDER", value: provider },
      });
      process.env.DEFAULT_AI_PROVIDER = provider;
    }

    if (model) {
      await prisma.systemSetting.upsert({
        where: { key: "DEFAULT_AI_MODEL" },
        update: { value: model },
        create: { key: "DEFAULT_AI_MODEL", value: model },
      });
      process.env.DEFAULT_AI_MODEL = model;
    }
    
    if (reportProvider) {
      await prisma.systemSetting.upsert({
        where: { key: "REPORT_AI_PROVIDER" },
        update: { value: reportProvider },
        create: { key: "REPORT_AI_PROVIDER", value: reportProvider },
      });
    }

    if (reportModel) {
      await prisma.systemSetting.upsert({
        where: { key: "REPORT_AI_MODEL" },
        update: { value: reportModel },
        create: { key: "REPORT_AI_MODEL", value: reportModel },
      });
    }

    if (geminiApiKey !== undefined) {
      await prisma.systemSetting.upsert({
        where: { key: "GEMINI_API_KEY" },
        update: { value: geminiApiKey },
        create: { key: "GEMINI_API_KEY", value: geminiApiKey },
      });
      if (geminiApiKey) process.env.GEMINI_API_KEY = geminiApiKey;
    }

    if (zaiApiKey !== undefined) {
      await prisma.systemSetting.upsert({
        where: { key: "ZAI_API_KEY" },
        update: { value: zaiApiKey },
        create: { key: "ZAI_API_KEY", value: zaiApiKey },
      });
      if (zaiApiKey) process.env.ZAI_API_KEY = zaiApiKey;
    }

    if (body.openrouterApiKey !== undefined) {
      await prisma.systemSetting.upsert({
        where: { key: "OPENROUTER_API_KEY" },
        update: { value: body.openrouterApiKey },
        create: { key: "OPENROUTER_API_KEY", value: body.openrouterApiKey },
      });
      if (body.openrouterApiKey) process.env.OPENROUTER_API_KEY = body.openrouterApiKey;
    }

    if (body.deepseekApiKey !== undefined) {
      await prisma.systemSetting.upsert({
        where: { key: "DEEPSEEK_API_KEY" },
        update: { value: body.deepseekApiKey },
        create: { key: "DEEPSEEK_API_KEY", value: body.deepseekApiKey },
      });
      if (body.deepseekApiKey) process.env.DEEPSEEK_API_KEY = body.deepseekApiKey;
    }

    if (body.showAiThinking !== undefined) {
      await prisma.systemSetting.upsert({
        where: { key: "SHOW_AI_THINKING" },
        update: { value: String(body.showAiThinking) },
        create: { key: "SHOW_AI_THINKING", value: String(body.showAiThinking) },
      });
    }

    if (body.ttsModel !== undefined) {
      await prisma.systemSetting.upsert({
        where: { key: "TTS_MODEL" },
        update: { value: body.ttsModel },
        create: { key: "TTS_MODEL", value: body.ttsModel },
      });
      process.env.OPENROUTER_TTS_MODEL = body.ttsModel;
    }

    if (body.ttsSpeed !== undefined) {
      await prisma.systemSetting.upsert({
        where: { key: "TTS_SPEED" },
        update: { value: String(body.ttsSpeed) },
        create: { key: "TTS_SPEED", value: String(body.ttsSpeed) },
      });
    }

    return NextResponse.json({
      success: true,
      message: "System configuration and API keys successfully updated.",
    });
  } catch (error: any) {
    console.error("Admin POST Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update settings" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  if (!(await authorizeAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");
    const interviewId = url.searchParams.get("interviewId");

    if (interviewId) {
      await prisma.interview.delete({
        where: { id: interviewId },
      });
      return NextResponse.json({ success: true });
    }

    if (userId) {
      await prisma.user.delete({
        where: { id: userId },
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "userId or interviewId parameter is required" }, { status: 400 });
  } catch (error) {
    console.error("Admin DELETE Error:", error);
    return NextResponse.json({ error: "Failed to perform deletion" }, { status: 500 });
  }
}
