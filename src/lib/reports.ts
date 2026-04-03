import { prisma } from "@/lib/prisma";

import { ConflictError, ForbiddenError, NotFoundError } from "./errors";

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
