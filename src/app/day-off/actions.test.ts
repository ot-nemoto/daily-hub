// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/lib/auth", () => ({ getSession: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    dayOff: {
      findUnique: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { addDayOff, removeDayOff } from "./actions";

const selfSession = { user: { id: "self-1", name: "自分", role: "MEMBER", isActive: true } };
const adminSession = { user: { id: "admin-1", name: "管理者", role: "ADMIN", isActive: true } };
const validDate = "2026-06-10";

describe("addDayOff", () => {
  beforeEach(() => vi.clearAllMocks());

  it("正常系: 自分の休日を登録する", async () => {
    vi.mocked(getSession).mockResolvedValue(selfSession as never);
    vi.mocked(prisma.dayOff.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.dayOff.create).mockResolvedValue({} as never);

    const result = await addDayOff({ date: validDate });

    expect(result).toEqual({});
    expect(prisma.dayOff.create).toHaveBeenCalledWith({
      data: { userId: "self-1", date: new Date("2026-06-10T00:00:00.000Z") },
    });
    expect(revalidatePath).toHaveBeenCalledWith("/day-off");
  });

  it("正常系: ADMIN が他ユーザーの休日を登録する", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: "other-1" } as never);
    vi.mocked(prisma.dayOff.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.dayOff.create).mockResolvedValue({} as never);

    const result = await addDayOff({ date: validDate, userId: "other-1" });

    expect(result).toEqual({});
    expect(prisma.dayOff.create).toHaveBeenCalledWith({
      data: { userId: "other-1", date: new Date("2026-06-10T00:00:00.000Z") },
    });
  });

  it("異常系: 未認証で redirect する", async () => {
    vi.mocked(getSession).mockResolvedValue(null as never);

    await addDayOff({ date: validDate });

    expect(redirect).toHaveBeenCalledWith("/login");
    expect(prisma.dayOff.create).not.toHaveBeenCalled();
  });

  it("異常系: 日付形式不正でエラーを返す", async () => {
    vi.mocked(getSession).mockResolvedValue(selfSession as never);

    const result = await addDayOff({ date: "invalid" });

    expect(result).toMatchObject({ error: expect.any(String) });
    expect(prisma.dayOff.create).not.toHaveBeenCalled();
  });

  it("異常系: 重複日付でエラーを返す", async () => {
    vi.mocked(getSession).mockResolvedValue(selfSession as never);
    vi.mocked(prisma.dayOff.findUnique).mockResolvedValue({ id: "existing" } as never);

    const result = await addDayOff({ date: validDate });

    expect(result).toMatchObject({ error: "この日付はすでに休日として登録されています" });
    expect(prisma.dayOff.create).not.toHaveBeenCalled();
  });

  it("異常系: 非ADMIN が他ユーザーの休日を登録しようとするとエラーを返す", async () => {
    vi.mocked(getSession).mockResolvedValue(selfSession as never);

    const result = await addDayOff({ date: validDate, userId: "other-1" });

    expect(result).toMatchObject({ error: "他のユーザーの休日を変更する権限がありません" });
    expect(prisma.dayOff.create).not.toHaveBeenCalled();
  });

  it("異常系: ADMIN が存在しないユーザーの休日を登録しようとするとエラーを返す", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    const result = await addDayOff({ date: validDate, userId: "nonexistent" });

    expect(result).toMatchObject({ error: "指定されたユーザーが見つかりません" });
    expect(prisma.dayOff.create).not.toHaveBeenCalled();
  });
});

describe("removeDayOff", () => {
  beforeEach(() => vi.clearAllMocks());

  it("正常系: 自分の休日を削除する", async () => {
    vi.mocked(getSession).mockResolvedValue(selfSession as never);
    vi.mocked(prisma.dayOff.deleteMany).mockResolvedValue({ count: 1 } as never);

    const result = await removeDayOff({ date: validDate });

    expect(result).toEqual({});
    expect(prisma.dayOff.deleteMany).toHaveBeenCalledWith({
      where: { userId: "self-1", date: new Date("2026-06-10T00:00:00.000Z") },
    });
    expect(revalidatePath).toHaveBeenCalledWith("/day-off");
  });

  it("正常系: ADMIN が他ユーザーの休日を削除する", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: "other-1" } as never);
    vi.mocked(prisma.dayOff.deleteMany).mockResolvedValue({ count: 1 } as never);

    const result = await removeDayOff({ date: validDate, userId: "other-1" });

    expect(result).toEqual({});
    expect(prisma.dayOff.deleteMany).toHaveBeenCalledWith({
      where: { userId: "other-1", date: new Date("2026-06-10T00:00:00.000Z") },
    });
  });

  it("異常系: 未認証で redirect する", async () => {
    vi.mocked(getSession).mockResolvedValue(null as never);

    await removeDayOff({ date: validDate });

    expect(redirect).toHaveBeenCalledWith("/login");
    expect(prisma.dayOff.deleteMany).not.toHaveBeenCalled();
  });

  it("異常系: 日付形式不正でエラーを返す", async () => {
    vi.mocked(getSession).mockResolvedValue(selfSession as never);

    const result = await removeDayOff({ date: "2026/06/10" });

    expect(result).toMatchObject({ error: expect.any(String) });
    expect(prisma.dayOff.deleteMany).not.toHaveBeenCalled();
  });

  it("異常系: 非ADMIN が他ユーザーの休日を削除しようとするとエラーを返す", async () => {
    vi.mocked(getSession).mockResolvedValue(selfSession as never);

    const result = await removeDayOff({ date: validDate, userId: "other-1" });

    expect(result).toMatchObject({ error: "他のユーザーの休日を変更する権限がありません" });
    expect(prisma.dayOff.deleteMany).not.toHaveBeenCalled();
  });

  it("正常系: userId が自分と同じなら MEMBER でも許可する", async () => {
    vi.mocked(getSession).mockResolvedValue(selfSession as never);
    vi.mocked(prisma.dayOff.deleteMany).mockResolvedValue({ count: 0 } as never);

    const result = await removeDayOff({ date: validDate, userId: "self-1" });

    expect(result).toEqual({});
    expect(prisma.dayOff.deleteMany).toHaveBeenCalledWith({
      where: { userId: "self-1", date: new Date("2026-06-10T00:00:00.000Z") },
    });
  });
});
