import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { startOfTodayUtc } from "@/lib/dateUtils";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getSession();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const today = startOfTodayUtc();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 29);

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      // 最新日報1件のみ取得（最終日報日の表示用）
      reports: {
        select: { date: true },
        orderBy: { date: "desc" },
        take: 1,
      },
      // 過去30日の提出数はDBで集計
      _count: {
        select: {
          reports: {
            where: { date: { gte: thirtyDaysAgo, lte: today } },
          },
        },
      },
    },
  });

  const result = users.map((user) => {
    const lastReport = user.reports[0] ?? null;
    const submissionRate30d = Math.round((user._count.reports / 30) * 100) / 100;

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      lastReportAt: lastReport ? lastReport.date : null,
      submissionRate30d,
    };
  });

  return NextResponse.json(result);
}
