import { prisma } from "@/lib/prisma";

import { ConflictError, ForbiddenError, NotFoundError } from "./errors";

export async function resolveOrCreateUserByName(userName: string): Promise<{ id: string }> {
  const existing = await prisma.user.findFirst({
    where: { name: userName },
    select: { id: true },
  });
  if (existing) return existing;

  const randomEmail = `${crypto.randomUUID()}@example.com`;
  return prisma.user.create({
    data: { name: userName, email: randomEmail, role: "VIEWER" },
    select: { id: true },
  });
}

export async function upsertReportByAuthorId(input: {
  authorId: string;
  date: Date;
  workContent: string;
  tomorrowPlan: string;
  notes: string;
}): Promise<{ id: string; status: "created" | "updated" }> {
  const { authorId, date, workContent, tomorrowPlan, notes } = input;

  const existing = await prisma.report.findFirst({
    where: { authorId, date },
    select: { id: true },
  });

  const report = await prisma.report.upsert({
    where: { authorId_date: { authorId, date } },
    create: { date, workContent, tomorrowPlan, notes, authorId },
    update: { workContent, tomorrowPlan, notes },
    select: { id: true },
  });

  return { id: report.id, status: existing ? "updated" : "created" };
}

export async function upsertReportForUserName(input: {
  userName: string;
  date: Date;
  workContent: string;
  tomorrowPlan: string;
  notes: string;
}): Promise<{ id: string; status: "created" | "updated" }> {
  const { userName, date, workContent, tomorrowPlan, notes } = input;
  const targetUser = await resolveOrCreateUserByName(userName);
  return upsertReportByAuthorId({
    authorId: targetUser.id,
    date,
    workContent,
    tomorrowPlan,
    notes,
  });
}

export async function createReport(input: {
  date: Date;
  workContent: string;
  tomorrowPlan: string;
  notes: string;
  authorId: string;
}): Promise<{ id: string }> {
  const { date, workContent, tomorrowPlan, notes, authorId } = input;

  const existing = await prisma.report.findFirst({
    where: { authorId, date },
  });
  if (existing) {
    throw new ConflictError("Report already exists for this date");
  }

  try {
    const report = await prisma.report.create({
      data: { date, workContent, tomorrowPlan, notes, authorId },
    });
    return { id: report.id };
  } catch (error) {
    if (error instanceof Error && "code" in error && (error as { code: string }).code === "P2002") {
      throw new ConflictError("Report already exists for this date");
    }
    throw error;
  }
}

export async function deleteReportById(input: { id: string }): Promise<void> {
  const { id } = input;

  // FK制約の順序で、その日報についたコメントを先に削除してから日報を削除する。
  // 事前の存在確認は行わず、削除対象が存在しない場合（競合削除含む）の P2025 を
  // NotFoundError に変換して 404 を返せるようにする。
  try {
    await prisma.$transaction([
      prisma.comment.deleteMany({ where: { reportId: id } }),
      prisma.report.delete({ where: { id } }),
    ]);
  } catch (error) {
    if (error instanceof Error && "code" in error && (error as { code: string }).code === "P2025") {
      throw new NotFoundError("Report not found");
    }
    throw error;
  }
}

export async function updateReport(input: {
  id: string;
  authorId: string;
  workContent: string;
  tomorrowPlan: string;
  notes: string;
}): Promise<{ id: string }> {
  const { id, authorId, workContent, tomorrowPlan, notes } = input;

  const existing = await prisma.report.findUnique({
    where: { id },
    select: { authorId: true },
  });
  if (!existing) {
    throw new NotFoundError("Report not found");
  }
  if (existing.authorId !== authorId) {
    throw new ForbiddenError("Forbidden");
  }

  const updated = await prisma.report.update({
    where: { id },
    data: { workContent, tomorrowPlan, notes },
    select: { id: true },
  });
  return { id: updated.id };
}
