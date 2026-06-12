import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getAuthenticatedUser } from "@/lib/apiAuth";
import { prisma } from "@/lib/prisma";
import { upsertReportByAuthorId } from "@/lib/reports";

const DateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "date は YYYY-MM-DD 形式で入力してください")
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  }, "date は実在する日付を入力してください");

const ReportItemSchema = z.object({
  date: DateString,
  workContent: z.string().min(1, "workContent は必須です").max(5000),
  tomorrowPlan: z.string().min(1, "tomorrowPlan は必須です").max(5000),
  notes: z.string().max(5000).default(""),
});

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

  // 3. リクエストボディのバリデーション（単体・配列どちらも配列に正規化）
  const body = await req.json().catch(() => null);
  if (body === null) {
    return NextResponse.json({ error: "リクエストボディが不正な JSON です" }, { status: 422 });
  }
  const normalized = Array.isArray(body) ? body : [body];

  const parsed = z
    .array(ReportItemSchema)
    .min(1, "1件以上の日報を指定してください")
    .safeParse(normalized);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 422 },
    );
  }

  // 4. 日報を upsert（全件 created → 201、1件でも updated → 200）
  const results = await Promise.all(
    parsed.data.map(async ({ date, workContent, tomorrowPlan, notes }) => {
      const { id, status } = await upsertReportByAuthorId({
        authorId: user.id,
        date: new Date(`${date}T00:00:00.000Z`),
        workContent,
        tomorrowPlan,
        notes,
      });
      return { date, id, status };
    }),
  );

  const httpStatus = results.every((r) => r.status === "created") ? 201 : 200;
  return NextResponse.json({ results }, { status: httpStatus });
}
