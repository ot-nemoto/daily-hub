import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const UpdateReportSchema = z.object({
  workContent: z.string().min(1).max(5000),
  tomorrowPlan: z.string().min(1).max(5000),
  notes: z.string().max(5000).optional().default(""),
});

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const report = await prisma.report.findUnique({
    where: { id },
    include: {
      author: { select: { id: true, name: true } },
      comments: {
        include: {
          author: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: report.id,
    date: report.date.toISOString().slice(0, 10),
    workContent: report.workContent,
    tomorrowPlan: report.tomorrowPlan,
    notes: report.notes,
    author: report.author,
    comments: report.comments.map((c) => ({
      id: c.id,
      body: c.body,
      author: c.author,
      createdAt: c.createdAt.toISOString(),
    })),
    createdAt: report.createdAt.toISOString(),
    updatedAt: report.updatedAt.toISOString(),
  });
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role === "VIEWER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = UpdateReportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { id } = await params;

  const existing = await prisma.report.findUnique({ where: { id }, select: { authorId: true } });
  if (!existing) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }
  if (existing.authorId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { workContent, tomorrowPlan, notes } = parsed.data;
  const updated = await prisma.report.update({
    where: { id },
    data: { workContent, tomorrowPlan, notes },
    select: { id: true },
  });

  return NextResponse.json({ id: updated.id });
}
