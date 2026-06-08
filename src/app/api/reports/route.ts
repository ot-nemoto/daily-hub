import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { ConflictError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { createReport } from "@/lib/reports";

const DateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "date は YYYY-MM-DD 形式で入力してください")
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  }, "date は実在する日付を入力してください");

const CreateReportSchema = z.object({
  date: DateString,
  workContent: z.string().min(1, "workContent は必須です").max(5000),
  tomorrowPlan: z.string().min(1, "tomorrowPlan は必須です").max(5000),
  notes: z.string().max(5000).default(""),
});

async function getAuthenticatedUser(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const apiKey = authHeader.slice(7).trim();
  if (!apiKey) return null;
  const user = await prisma.user.findUnique({
    where: { apiKey },
    select: { id: true, role: true, isActive: true },
  });
  return user?.isActive ? user : null;
}

export async function GET(req: NextRequest) {
  // 1. 認証
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. クエリパラメータ取得
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const authorId = searchParams.get("authorId");

  // 3. バリデーション
  if (date) {
    const result = DateString.safeParse(date);
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 422 });
    }
  } else if (from || to) {
    if (!from || !to) {
      return NextResponse.json(
        { error: "from と to はセットで指定してください" },
        { status: 422 },
      );
    }
    const fromResult = DateString.safeParse(from);
    if (!fromResult.success) {
      return NextResponse.json({ error: fromResult.error.issues[0].message }, { status: 422 });
    }
    const toResult = DateString.safeParse(to);
    if (!toResult.success) {
      return NextResponse.json({ error: toResult.error.issues[0].message }, { status: 422 });
    }
  }

  // 4. Prisma クエリ
  const where = {
    ...(date
      ? { date: new Date(`${date}T00:00:00.000Z`) }
      : from && to
        ? { date: { gte: new Date(`${from}T00:00:00.000Z`), lte: new Date(`${to}T00:00:00.000Z`) } }
        : {}),
    ...(authorId ? { authorId } : {}),
  };

  const reports = await prisma.report.findMany({
    where,
    include: { author: { select: { name: true } } },
    orderBy: [{ date: "desc" }, { author: { name: "asc" } }],
  });

  // 5. レスポンス
  return NextResponse.json({
    reports: reports.map((r) => ({
      id: r.id,
      date: r.date.toISOString().slice(0, 10),
      authorId: r.authorId,
      authorName: r.author.name,
      workContent: r.workContent,
      tomorrowPlan: r.tomorrowPlan,
      notes: r.notes,
    })),
  });
}

export async function POST(req: NextRequest) {
  // 1. 認証
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. VIEWER ロールは作成不可
  if (user.role === "VIEWER") {
    return NextResponse.json(
      { error: "日報を作成する権限がありません" },
      { status: 403 },
    );
  }

  // 3. リクエストボディのバリデーション
  const body = await req.json().catch(() => null);
  const parsed = CreateReportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 422 },
    );
  }

  // 4. 日報作成
  const { date, workContent, tomorrowPlan, notes } = parsed.data;
  try {
    const result = await createReport({
      date: new Date(`${date}T00:00:00.000Z`),
      workContent,
      tomorrowPlan,
      notes,
      authorId: user.id,
    });
    return NextResponse.json({ id: result.id }, { status: 201 });
  } catch (e) {
    if (e instanceof ConflictError) {
      return NextResponse.json(
        { error: "この日付の日報はすでに作成済みです" },
        { status: 409 },
      );
    }
    throw e;
  }
}
