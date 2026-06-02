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

export async function upsertReportForUserName(input: {
  userName: string;
  date: Date;
  workContent: string;
  tomorrowPlan: string;
  notes: string;
}): Promise<{ id: string; status: "created" | "updated" }> {
  const { userName, date, workContent, tomorrowPlan, notes } = input;

  const targetUser = await resolveOrCreateUserByName(userName);

  const existing = await prisma.report.findFirst({
    where: { authorId: targetUser.id, date },
    select: { id: true },
  });

  const report = await prisma.report.upsert({
    where: { authorId_date: { authorId: targetUser.id, date } },
    create: { date, workContent, tomorrowPlan, notes, authorId: targetUser.id },
    update: { workContent, tomorrowPlan, notes },
    select: { id: true },
  });

  return { id: report.id, status: existing ? "updated" : "created" };
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
