import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

const ReportItemSchema = z.object({
  userName: z.string().min(1, "userName は必須です"),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "date は YYYY-MM-DD 形式で入力してください")
    .refine((value) => {
      const parsed = new Date(`${value}T00:00:00.000Z`);
      return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
    }, "date は実在する日付を入力してください"),
  workContent: z.string().min(1, "workContent は必須です").max(5000),
  tomorrowPlan: z.string().min(1, "tomorrowPlan は必須です").max(5000),
  notes: z.string().max(5000).default(""),
});

const BulkReportSchema = z
  .array(ReportItemSchema)
  .min(1, "リクエストは1件以上必要です");

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
  if (!user?.isActive) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 3. ADMIN のみ利用可能
  if (user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "このエンドポイントは ADMIN のみ使用できます" },
      { status: 403 },
    );
  }

  // 4. リクエストボディのバリデーション
  const body = await req.json().catch(() => null);
  const parsed = BulkReportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 422 },
    );
  }

  // 5. 各レポートを処理
  const results: { date: string; id: string; status: "created" | "updated" }[] = [];

  for (const item of parsed.data) {
    const { userName, date, workContent, tomorrowPlan, notes } = item;
    const dateObj = new Date(`${date}T00:00:00.000Z`);

    // userName でユーザーを解決（最初の1件）
    let targetUser = await prisma.user.findFirst({
      where: { name: userName },
      select: { id: true },
    });

    // 存在しない場合は自動作成（email: ランダム文字列@example.com、role: VIEWER）
    if (!targetUser) {
      const randomEmail = `${generateRandomString()}@example.com`;
      targetUser = await prisma.user.create({
        data: { name: userName, email: randomEmail, role: "VIEWER" },
        select: { id: true },
      });
    }

    // 既存日報の有無を確認（created / updated の判定用）
    const existing = await prisma.report.findFirst({
      where: { authorId: targetUser.id, date: dateObj },
      select: { id: true },
    });

    // upsert
    const report = await prisma.report.upsert({
      where: { authorId_date: { authorId: targetUser.id, date: dateObj } },
      create: { date: dateObj, workContent, tomorrowPlan, notes, authorId: targetUser.id },
      update: { workContent, tomorrowPlan, notes },
      select: { id: true },
    });

    results.push({
      date,
      id: report.id,
      status: existing ? "updated" : "created",
    });
  }

  return NextResponse.json({ results }, { status: 200 });
}

function generateRandomString(): string {
  return Array.from({ length: 16 }, () =>
    Math.floor(Math.random() * 36).toString(36),
  ).join("");
}
