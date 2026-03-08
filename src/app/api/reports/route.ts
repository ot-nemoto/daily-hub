import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const DateQuerySchema = z.object({
  date: z.string().date(),
  userId: z.string().optional(),
});

const RangeQuerySchema = z.object({
  from: z.string().date(),
  to: z.string().date(),
  authorId: z.string().optional(),
});

const ReportSchema = z.object({
  date: z.string().date(),
  workContent: z.string().min(1).max(5000),
  tomorrowPlan: z.string().min(1).max(5000),
  notes: z.string().max(5000).optional().default(""),
});

function formatReport(report: {
  id: string;
  date: Date;
  workContent: string;
  tomorrowPlan: string;
  notes: string;
  authorId: string;
  createdAt: Date;
  updatedAt: Date;
  author: { id: string; name: string };
  _count: { comments: number };
}) {
  return {
    id: report.id,
    date: report.date.toISOString().slice(0, 10),
    workContent: report.workContent,
    tomorrowPlan: report.tomorrowPlan,
    notes: report.notes,
    author: report.author,
    commentCount: report._count.comments,
    createdAt: report.createdAt.toISOString(),
    updatedAt: report.updatedAt.toISOString(),
  };
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (date !== null) {
    const parsed = DateQuerySchema.safeParse({
      date,
      userId: searchParams.get("userId") ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const reports = await prisma.report.findMany({
      where: {
        date: new Date(`${parsed.data.date}T00:00:00.000Z`),
        ...(parsed.data.userId ? { authorId: parsed.data.userId } : {}),
      },
      include: {
        author: { select: { id: true, name: true } },
        _count: { select: { comments: true } },
      },
      orderBy: { author: { name: "asc" } },
    });

    return NextResponse.json(reports.map(formatReport));
  }

  if (from !== null && to !== null) {
    const parsed = RangeQuerySchema.safeParse({
      from,
      to,
      authorId: searchParams.get("authorId") ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const reports = await prisma.report.findMany({
      where: {
        date: {
          gte: new Date(`${parsed.data.from}T00:00:00.000Z`),
          lte: new Date(`${parsed.data.to}T00:00:00.000Z`),
        },
        ...(parsed.data.authorId ? { authorId: parsed.data.authorId } : {}),
      },
      include: {
        author: { select: { id: true, name: true } },
        _count: { select: { comments: true } },
      },
      orderBy: [{ date: "asc" }, { author: { name: "asc" } }],
    });

    return NextResponse.json(reports.map(formatReport));
  }

  return NextResponse.json(
    { error: "Query parameter 'date' or 'from'+'to' is required" },
    { status: 400 },
  );
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = ReportSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 });
  }

  const { date, workContent, tomorrowPlan, notes } = result.data;
  const dateObj = new Date(`${date}T00:00:00.000Z`);

  const existing = await prisma.report.findFirst({
    where: { authorId: session.user.id, date: dateObj },
  });
  if (existing) {
    return NextResponse.json({ error: "Report already exists for this date" }, { status: 409 });
  }

  try {
    const report = await prisma.report.create({
      data: { date: dateObj, workContent, tomorrowPlan, notes, authorId: session.user.id },
    });
    return NextResponse.json({ id: report.id }, { status: 201 });
  } catch (error) {
    // 同時リクエストによる競合（DB unique 制約違反）を 409 にマッピング
    if (error instanceof Error && "code" in error && (error as { code: string }).code === "P2002") {
      return NextResponse.json({ error: "Report already exists for this date" }, { status: 409 });
    }
    throw error;
  }
}
