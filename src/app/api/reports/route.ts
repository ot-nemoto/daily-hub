import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, serializeReport, unauthorized } from "@/lib/api-response";
import { getAuthenticatedUser } from "@/lib/apiAuth";
import { prisma } from "@/lib/prisma";
import { upsertReportByAuthorId } from "@/lib/reports";
import { firstZodError } from "@/lib/schemas/_zod-error";
import { dateStringField } from "@/lib/schemas/common";
import { reportCreateBodySchema } from "@/lib/schemas/report";

export async function GET(req: NextRequest) {
  // 1. 認証
  const user = await getAuthenticatedUser(req);
  if (!user) return unauthorized();

  // 2. クエリパラメータ取得
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const authorId = searchParams.get("authorId");

  // 3. バリデーション（検証エラーは 400 に統一）
  if (date) {
    const result = dateStringField("date").safeParse(date);
    if (!result.success) return jsonError(firstZodError(result.error), 400);
  } else if (from || to) {
    if (!from || !to) return jsonError("from と to はセットで指定してください", 400);
    const fromResult = dateStringField("from").safeParse(from);
    if (!fromResult.success) return jsonError(firstZodError(fromResult.error), 400);
    const toResult = dateStringField("to").safeParse(to);
    if (!toResult.success) return jsonError(firstZodError(toResult.error), 400);
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
  return NextResponse.json({ reports: reports.map(serializeReport) });
}

export async function POST(req: NextRequest) {
  // 1. 認証
  const user = await getAuthenticatedUser(req);
  if (!user) return unauthorized();

  // 2. VIEWER ロールは作成不可
  if (user.role === "VIEWER") {
    return jsonError("日報を作成する権限がありません", 403);
  }

  // 3. リクエストボディのバリデーション（単体・配列どちらも配列に正規化）
  const body = await req.json().catch(() => null);
  if (body === null) return jsonError("リクエストボディが不正な JSON です", 400);
  const normalized = Array.isArray(body) ? body : [body];

  const parsed = z
    .array(reportCreateBodySchema)
    .min(1, { error: "1件以上の日報を指定してください" })
    .safeParse(normalized);
  if (!parsed.success) return jsonError(firstZodError(parsed.error), 400);

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
