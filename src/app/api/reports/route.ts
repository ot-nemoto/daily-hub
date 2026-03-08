import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ReportSchema = z.object({
  date: z.string().date(),
  workContent: z.string().min(1).max(5000),
  tomorrowPlan: z.string().min(1).max(5000),
  notes: z.string().max(5000).optional().default(""),
});

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
