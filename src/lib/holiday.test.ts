// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { ConflictError, NotFoundError } from "./errors";
import {
  createHoliday,
  deleteHolidayByDate,
  deleteHolidayById,
  getHolidays,
  upsertHoliday,
} from "./holiday";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    holiday: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

const date = new Date("2026-08-11T00:00:00.000Z");

describe("getHolidays", () => {
  beforeEach(() => vi.clearAllMocks());

  it("正常系: range 未指定なら where なしで date 昇順取得する", async () => {
    vi.mocked(prisma.holiday.findMany).mockResolvedValue([] as never);

    await getHolidays();

    expect(prisma.holiday.findMany).toHaveBeenCalledWith({
      where: undefined,
      orderBy: { date: "asc" },
    });
  });

  it("正常系: from/to を指定すると期間で絞り込む", async () => {
    vi.mocked(prisma.holiday.findMany).mockResolvedValue([] as never);
    const to = new Date("2026-08-31T00:00:00.000Z");

    await getHolidays({ from: date, to });

    expect(prisma.holiday.findMany).toHaveBeenCalledWith({
      where: { date: { gte: date, lte: to } },
      orderBy: { date: "asc" },
    });
  });

  it("境界値: from のみ指定なら gte だけで絞り込む", async () => {
    vi.mocked(prisma.holiday.findMany).mockResolvedValue([] as never);

    await getHolidays({ from: date });

    expect(prisma.holiday.findMany).toHaveBeenCalledWith({
      where: { date: { gte: date } },
      orderBy: { date: "asc" },
    });
  });
});

describe("createHoliday", () => {
  beforeEach(() => vi.clearAllMocks());

  it("正常系: 祝日を作成し作成レコードを返す（name をトリム）", async () => {
    const created = { id: "h1", date, name: "山の日" };
    vi.mocked(prisma.holiday.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.holiday.create).mockResolvedValue(created as never);

    await expect(createHoliday({ date, name: "  山の日  " })).resolves.toEqual(created);
    expect(prisma.holiday.create).toHaveBeenCalledWith({ data: { date, name: "山の日" } });
  });

  it("境界値: 空白のみの name は null として保存する", async () => {
    vi.mocked(prisma.holiday.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.holiday.create).mockResolvedValue({ id: "h1", date, name: null } as never);

    await createHoliday({ date, name: "   " });

    expect(prisma.holiday.create).toHaveBeenCalledWith({ data: { date, name: null } });
  });

  it("異常系: 同日が既に存在すれば ConflictError を throw する", async () => {
    vi.mocked(prisma.holiday.findUnique).mockResolvedValue({ id: "existing" } as never);

    await expect(createHoliday({ date })).rejects.toThrow(ConflictError);
    expect(prisma.holiday.create).not.toHaveBeenCalled();
  });

  it("異常系: 競合で P2002 が起きても ConflictError に変換する", async () => {
    vi.mocked(prisma.holiday.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.holiday.create).mockRejectedValue(
      Object.assign(new Error("unique"), { code: "P2002" }),
    );

    await expect(createHoliday({ date })).rejects.toThrow(ConflictError);
  });
});

describe("upsertHoliday", () => {
  beforeEach(() => vi.clearAllMocks());

  it("正常系: date で upsert し、name を正規化する", async () => {
    const record = { id: "h1", date, name: "元日" };
    vi.mocked(prisma.holiday.upsert).mockResolvedValue(record as never);

    await expect(upsertHoliday({ date, name: " 元日 " })).resolves.toEqual(record);
    expect(prisma.holiday.upsert).toHaveBeenCalledWith({
      where: { date },
      update: { name: "元日" },
      create: { date, name: "元日" },
    });
  });

  it("境界値: name 未指定なら null で upsert する", async () => {
    vi.mocked(prisma.holiday.upsert).mockResolvedValue({ id: "h1", date, name: null } as never);

    await upsertHoliday({ date });

    expect(prisma.holiday.upsert).toHaveBeenCalledWith({
      where: { date },
      update: { name: null },
      create: { date, name: null },
    });
  });
});

describe("deleteHolidayByDate", () => {
  beforeEach(() => vi.clearAllMocks());

  it("正常系: date 指定で deleteMany する", async () => {
    vi.mocked(prisma.holiday.deleteMany).mockResolvedValue({ count: 1 } as never);

    await deleteHolidayByDate({ date });

    expect(prisma.holiday.deleteMany).toHaveBeenCalledWith({ where: { date } });
  });
});

describe("deleteHolidayById", () => {
  beforeEach(() => vi.clearAllMocks());

  it("正常系: id 指定で削除する", async () => {
    vi.mocked(prisma.holiday.deleteMany).mockResolvedValue({ count: 1 } as never);

    await expect(deleteHolidayById({ id: "h1" })).resolves.toBeUndefined();
    expect(prisma.holiday.deleteMany).toHaveBeenCalledWith({ where: { id: "h1" } });
  });

  it("異常系: 対象が存在しなければ NotFoundError を throw する", async () => {
    vi.mocked(prisma.holiday.deleteMany).mockResolvedValue({ count: 0 } as never);

    await expect(deleteHolidayById({ id: "missing" })).rejects.toThrow(NotFoundError);
  });
});
