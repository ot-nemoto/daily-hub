import { prisma } from "@/lib/prisma";

import { ConflictError } from "./errors";

export async function createDayOff(input: { userId: string; date: Date }): Promise<void> {
  const { userId, date } = input;

  const existing = await prisma.dayOff.findUnique({
    where: { userId_date: { userId, date } },
  });
  if (existing) throw new ConflictError("DayOff already exists for this date");

  try {
    await prisma.dayOff.create({ data: { userId, date } });
  } catch (error) {
    if (error instanceof Error && "code" in error && (error as { code: string }).code === "P2002") {
      throw new ConflictError("DayOff already exists for this date");
    }
    throw error;
  }
}

export async function deleteDayOff(input: { userId: string; date: Date }): Promise<void> {
  const { userId, date } = input;
  // deleteMany で実装するため、未登録日付を指定しても 0 件削除で安全に無視される
  await prisma.dayOff.deleteMany({ where: { userId, date } });
}
