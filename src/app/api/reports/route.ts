import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { ConflictError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { createReport } from "@/lib/reports";

const CreateReportSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date は YYYY-MM-DD 形式で入力してください"),
  workContent: z.string().min(1, "workContent は必須です").max(5000),
  tomorrowPlan: z.string().min(1, "tomorrowPlan は必須です").max(5000),
  notes: z.string().max(5000).default(""),
});

export async function POST(req: NextRequest) {
  // 1. Authorization ヘッダーから API キーを取得
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const apiKey = authHeader.slice(7).trim();
  if (!apiKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. API キーで DB ユーザーを検索
  const user = await prisma.user.findUnique({
    where: { apiKey },
    select: { id: true, role: true, isActive: true },
  });
  if (!user || !user.isActive) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 3. VIEWER ロールは作成不可
  if (user.role === "VIEWER") {
    return NextResponse.json(
      { error: "日報を作成する権限がありません" },
      { status: 403 },
    );
  }

  // 4. リクエストボディのバリデーション
  const body = await req.json().catch(() => null);
  const parsed = CreateReportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 422 },
    );
  }

  // 5. 日報作成
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
