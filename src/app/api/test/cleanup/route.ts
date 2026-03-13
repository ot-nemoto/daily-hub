import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

// E2E テスト用クリーンアップエンドポイント（非本番環境のみ有効）
export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  const testDates = [
    new Date("2099-01-01T00:00:00.000Z"), // reports.spec.ts
    new Date("2099-02-01T00:00:00.000Z"), // comments-and-views.spec.ts
  ];

  // FK 制約のため Comment を先に削除してから Report を削除する
  await prisma.comment.deleteMany({
    where: { report: { date: { in: testDates } } },
  });
  await prisma.report.deleteMany({
    where: { date: { in: testDates } },
  });

  return NextResponse.json({ ok: true });
}
