import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeAdmin } from "@/lib/admin-auth";

export async function GET(req: Request) {
  try {
    if (!(await authorizeAdmin())) {
      return NextResponse.json(
        { error: "Unauthorized", events: [], pagination: { total: 0, page: 1, limit: 50, totalPages: 1 } },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const eventType = searchParams.get("eventType") || undefined;
    
    const skip = (page - 1) * limit;

    const where = eventType ? { eventType } : {};

    const [events, total] = await Promise.all([
      prisma.eventLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.eventLog.count({ where }),
    ]);

    return NextResponse.json({
      events,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[ADMIN_EVENTS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
