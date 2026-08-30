import { prisma } from "@/lib/prisma";

import { ConflictError, NotFoundError } from "./errors";

/** name を正規化する（空文字・空白のみは null 扱い）。 */
function normalizeName(name?: string | null): string | null {
  const trimmed = name?.trim();
  return trimmed ? trimmed : null;
}

/** 祝日一覧を date 昇順で取得する。range 指定時は期間（from/to、いずれか片方でも可）で絞り込む。 */
export async function getHolidays(range?: { from?: Date; to?: Date }) {
  const where =
    range?.from || range?.to
      ? {
          date: {
            ...(range.from ? { gte: range.from } : {}),
            ...(range.to ? { lte: range.to } : {}),
          },
        }
      : undefined;

  return prisma.holiday.findMany({ where, orderBy: { date: "asc" } });
}

/** 祝日を新規登録する（外部 API の POST 用）。同日が既にあれば ConflictError。name は任意。 */
export async function createHoliday(input: { date: Date; name?: string | null }) {
  const { date } = input;
  const name = normalizeName(input.name);

  const existing = await prisma.holiday.findUnique({ where: { date } });
  if (existing) throw new ConflictError("Holiday already exists for this date");

  try {
    return await prisma.holiday.create({ data: { date, name } });
  } catch (error) {
    if (error instanceof Error && "code" in error && (error as { code: string }).code === "P2002") {
      throw new ConflictError("Holiday already exists for this date");
    }
    throw error;
  }
}

/** 祝日を date で upsert する（管理画面 UI の登録・名称更新兼用）。name は任意。 */
export async function upsertHoliday(input: { date: Date; name?: string | null }) {
  const { date } = input;
  const name = normalizeName(input.name);

  return prisma.holiday.upsert({
    where: { date },
    update: { name },
    create: { date, name },
  });
}

/** 日付指定で祝日を解除する（UI 用）。未登録日を指定しても 0 件削除で安全に無視される。 */
export async function deleteHolidayByDate(input: { date: Date }): Promise<void> {
  await prisma.holiday.deleteMany({ where: { date: input.date } });
}

/** id 指定で祝日を削除する（外部 API の DELETE /api/holidays/{id} 用）。未存在は NotFoundError。 */
export async function deleteHolidayById(input: { id: string }): Promise<void> {
  const result = await prisma.holiday.deleteMany({ where: { id: input.id } });
  if (result.count === 0) throw new NotFoundError("Holiday not found");
}
