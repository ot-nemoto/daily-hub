import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { startOfTodayUtc } from "@/lib/dateUtils";
import { NextResponse } from "next/server";
import { z } from "zod";

const CreateUserSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  role: z.enum(["MEMBER", "VIEWER"]).optional().default("MEMBER"),
});

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

export async function POST(request: Request) {
  const session = await getSession();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = CreateUserSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 });
  }

  const { name, email, role } = result.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Email already in use" }, { status: 409 });
  }

  try {
    const user = await prisma.user.create({
      data: { name, email, role },
    });
    return NextResponse.json({ id: user.id }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && "code" in error && (error as { code: string }).code === "P2002") {
      return NextResponse.json({ error: "Email already in use" }, { status: 409 });
    }
    throw error;
  }
}
