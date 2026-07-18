import { prisma } from "@/lib/prisma";

import { ConflictError, NotFoundError } from "./errors";

/** 本人の休日一覧を date 昇順で取得する。 */
export async function getDayOffs(userId: string) {
  return prisma.dayOff.findMany({
    where: { userId },
    orderBy: { date: "asc" },
  });
}

export async function createDayOff(input: { userId: string; date: Date }) {
  const { userId, date } = input;

  const existing = await prisma.dayOff.findUnique({
    where: { userId_date: { userId, date } },
  });
  if (existing) throw new ConflictError("DayOff already exists for this date");

  // 作成レコードを返し、呼び出し側（REST の POST）が再取得せず整形できるようにする。
  try {
    return await prisma.dayOff.create({ data: { userId, date } });
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

/**
 * 所有者検証つきで休日を id 指定で解除する（外部 API の DELETE /api/day-off/{id} 用）。
 * `{ id, userId }` で絞り込み、0 件（未存在または他人の休日）なら NotFoundError。
 * 日付指定で本人の休日を解除する UI 用は `deleteDayOff` を使う。
 */
export async function deleteDayOffByOwner(input: { id: string; userId: string }): Promise<void> {
  const { id, userId } = input;
  const result = await prisma.dayOff.deleteMany({ where: { id, userId } });
  if (result.count === 0) {
    throw new NotFoundError("DayOff not found");
  }
}
