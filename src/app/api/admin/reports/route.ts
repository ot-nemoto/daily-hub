import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { resolveOrCreateUserByName, upsertReportByAuthorId } from "@/lib/reports";

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

  // 5. ユニークな userName を事前に順次解決（並列 create による重複ユーザー作成を防ぐ）
  const uniqueUserNames = [...new Set(parsed.data.map((d) => d.userName))];
  const userMap = new Map<string, string>();
  for (const userName of uniqueUserNames) {
    const resolved = await resolveOrCreateUserByName(userName);
    userMap.set(userName, resolved.id);
  }

  // 6. 各レポートを処理
  const results = await Promise.all(
    parsed.data.map(async ({ userName, date, workContent, tomorrowPlan, notes }) => {
      const authorId = userMap.get(userName);
      if (!authorId) throw new Error(`userName not resolved: ${userName}`);
      const { id, status } = await upsertReportByAuthorId({
        authorId,
        date: new Date(`${date}T00:00:00.000Z`),
        workContent,
        tomorrowPlan,
        notes,
      });
      return { date, id, status };
    }),
  );

  return NextResponse.json({ results }, { status: 200 });
}
