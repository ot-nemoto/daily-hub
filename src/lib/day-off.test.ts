// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";

import { ConflictError } from "./errors";
import { createDayOff, deleteDayOff } from "./day-off";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    dayOff: {
      findUnique: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

const userId = "user-1";
const date = new Date("2026-06-10T00:00:00.000Z");

describe("createDayOff", () => {
  beforeEach(() => vi.clearAllMocks());

  it("正常系: 休日を作成する", async () => {
    vi.mocked(prisma.dayOff.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.dayOff.create).mockResolvedValue({} as never);

    await expect(createDayOff({ userId, date })).resolves.toBeUndefined();
    expect(prisma.dayOff.create).toHaveBeenCalledWith({ data: { userId, date } });
  });

  it("異常系: 重複する休日があれば ConflictError を throw する", async () => {
    vi.mocked(prisma.dayOff.findUnique).mockResolvedValue({ id: "existing" } as never);

    await expect(createDayOff({ userId, date })).rejects.toThrow(ConflictError);
    expect(prisma.dayOff.create).not.toHaveBeenCalled();
  });

  it("異常系: DB の P2002 競合エラーを ConflictError に変換する", async () => {
    vi.mocked(prisma.dayOff.findUnique).mockResolvedValue(null);
    const p2002 = Object.assign(new Error("Unique constraint failed"), { code: "P2002" });
    vi.mocked(prisma.dayOff.create).mockRejectedValue(p2002);

    await expect(createDayOff({ userId, date })).rejects.toThrow(ConflictError);
  });

  it("異常系: P2002 以外のエラーは rethrow する", async () => {
    vi.mocked(prisma.dayOff.findUnique).mockResolvedValue(null);
    const unexpected = new Error("connection error");
    vi.mocked(prisma.dayOff.create).mockRejectedValue(unexpected);

    await expect(createDayOff({ userId, date })).rejects.toThrow("connection error");
  });
});

describe("deleteDayOff", () => {
  beforeEach(() => vi.clearAllMocks());

  it("正常系: 休日を削除する", async () => {
    vi.mocked(prisma.dayOff.deleteMany).mockResolvedValue({ count: 1 } as never);

    await expect(deleteDayOff({ userId, date })).resolves.toBeUndefined();
    expect(prisma.dayOff.deleteMany).toHaveBeenCalledWith({ where: { userId, date } });
  });

  it("正常系: 未登録日付でも 0 件削除で正常終了する", async () => {
    vi.mocked(prisma.dayOff.deleteMany).mockResolvedValue({ count: 0 } as never);

    await expect(deleteDayOff({ userId, date })).resolves.toBeUndefined();
  });
});
