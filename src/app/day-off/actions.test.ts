// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/lib/auth", () => ({ getSession: vi.fn() }));
vi.mock("@/lib/day-off", () => ({
  createDayOff: vi.fn(),
  deleteDayOff: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
  },
}));

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { createDayOff, deleteDayOff } from "@/lib/day-off";
import { ConflictError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { addDayOff, removeDayOff } from "./actions";

const selfSession = { user: { id: "self-1", name: "自分", role: "MEMBER", isActive: true } };
const adminSession = { user: { id: "admin-1", name: "管理者", role: "ADMIN", isActive: true } };
const viewerSession = { user: { id: "viewer-1", name: "閲覧者", role: "VIEWER", isActive: true } };
const validDate = "2026-06-10";

describe("addDayOff", () => {
  beforeEach(() => vi.clearAllMocks());

  it("正常系: 自分の休日を登録する", async () => {
    vi.mocked(getSession).mockResolvedValue(selfSession as never);
    vi.mocked(createDayOff).mockResolvedValue(undefined);

    const result = await addDayOff({ date: validDate });

    expect(result).toEqual({});
    expect(createDayOff).toHaveBeenCalledWith({
      userId: "self-1",
      date: new Date("2026-06-10T00:00:00.000Z"),
    });
    expect(revalidatePath).toHaveBeenCalledWith("/day-off");
  });

  it("正常系: ADMIN が他ユーザーの休日を登録する", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: "other-1" } as never);
    vi.mocked(createDayOff).mockResolvedValue(undefined);

    const result = await addDayOff({ date: validDate, userId: "other-1" });

    expect(result).toEqual({});
    expect(createDayOff).toHaveBeenCalledWith({
      userId: "other-1",
      date: new Date("2026-06-10T00:00:00.000Z"),
    });
  });

  it("異常系: 未認証で redirect する", async () => {
    vi.mocked(getSession).mockResolvedValue(null as never);

    await addDayOff({ date: validDate });

    expect(redirect).toHaveBeenCalledWith("/login");
    expect(createDayOff).not.toHaveBeenCalled();
  });

  it("異常系: VIEWER はエラーを返す", async () => {
    vi.mocked(getSession).mockResolvedValue(viewerSession as never);

    const result = await addDayOff({ date: validDate });

    expect(result).toMatchObject({ error: "休日を登録する権限がありません" });
    expect(createDayOff).not.toHaveBeenCalled();
  });

  it("異常系: 日付形式不正でエラーを返す", async () => {
    vi.mocked(getSession).mockResolvedValue(selfSession as never);

    const result = await addDayOff({ date: "invalid" });

    expect(result).toMatchObject({ error: expect.any(String) });
    expect(createDayOff).not.toHaveBeenCalled();
  });

  it("異常系: 重複日付で ConflictError が来たらエラーを返す", async () => {
    vi.mocked(getSession).mockResolvedValue(selfSession as never);
    vi.mocked(createDayOff).mockRejectedValue(new ConflictError());

    const result = await addDayOff({ date: validDate });

    expect(result).toMatchObject({ error: "この日付はすでに休日として登録されています" });
  });

  it("異常系: 非ADMIN が他ユーザーの休日を登録しようとするとエラーを返す", async () => {
    vi.mocked(getSession).mockResolvedValue(selfSession as never);

    const result = await addDayOff({ date: validDate, userId: "other-1" });

    expect(result).toMatchObject({ error: "他のユーザーの休日を変更する権限がありません" });
    expect(createDayOff).not.toHaveBeenCalled();
  });

  it("異常系: ADMIN が存在しないユーザーの休日を登録しようとするとエラーを返す", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    const result = await addDayOff({ date: validDate, userId: "nonexistent" });

    expect(result).toMatchObject({ error: "指定されたユーザーが見つかりません" });
    expect(createDayOff).not.toHaveBeenCalled();
  });
});

describe("removeDayOff", () => {
  beforeEach(() => vi.clearAllMocks());

  it("正常系: 自分の休日を削除する", async () => {
    vi.mocked(getSession).mockResolvedValue(selfSession as never);
    vi.mocked(deleteDayOff).mockResolvedValue(undefined);

    const result = await removeDayOff({ date: validDate });

    expect(result).toEqual({});
    expect(deleteDayOff).toHaveBeenCalledWith({
      userId: "self-1",
      date: new Date("2026-06-10T00:00:00.000Z"),
    });
    expect(revalidatePath).toHaveBeenCalledWith("/day-off");
  });

  it("正常系: ADMIN が他ユーザーの休日を削除する", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: "other-1" } as never);
    vi.mocked(deleteDayOff).mockResolvedValue(undefined);

    const result = await removeDayOff({ date: validDate, userId: "other-1" });

    expect(result).toEqual({});
    expect(deleteDayOff).toHaveBeenCalledWith({
      userId: "other-1",
      date: new Date("2026-06-10T00:00:00.000Z"),
    });
  });

  it("異常系: 未認証で redirect する", async () => {
    vi.mocked(getSession).mockResolvedValue(null as never);

    await removeDayOff({ date: validDate });

    expect(redirect).toHaveBeenCalledWith("/login");
    expect(deleteDayOff).not.toHaveBeenCalled();
  });

  it("異常系: VIEWER はエラーを返す", async () => {
    vi.mocked(getSession).mockResolvedValue(viewerSession as never);

    const result = await removeDayOff({ date: validDate });

    expect(result).toMatchObject({ error: "休日を解除する権限がありません" });
    expect(deleteDayOff).not.toHaveBeenCalled();
  });

  it("異常系: 日付形式不正でエラーを返す", async () => {
    vi.mocked(getSession).mockResolvedValue(selfSession as never);

    const result = await removeDayOff({ date: "2026/06/10" });

    expect(result).toMatchObject({ error: expect.any(String) });
    expect(deleteDayOff).not.toHaveBeenCalled();
  });

  it("異常系: 非ADMIN が他ユーザーの休日を削除しようとするとエラーを返す", async () => {
    vi.mocked(getSession).mockResolvedValue(selfSession as never);

    const result = await removeDayOff({ date: validDate, userId: "other-1" });

    expect(result).toMatchObject({ error: "他のユーザーの休日を変更する権限がありません" });
    expect(deleteDayOff).not.toHaveBeenCalled();
  });

  it("正常系: userId が自分と同じなら MEMBER でも許可する", async () => {
    vi.mocked(getSession).mockResolvedValue(selfSession as never);
    vi.mocked(deleteDayOff).mockResolvedValue(undefined);

    const result = await removeDayOff({ date: validDate, userId: "self-1" });

    expect(result).toEqual({});
    expect(deleteDayOff).toHaveBeenCalledWith({
      userId: "self-1",
      date: new Date("2026-06-10T00:00:00.000Z"),
    });
  });
});
