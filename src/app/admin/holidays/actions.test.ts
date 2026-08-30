// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/lib/auth", () => ({ getSession: vi.fn() }));
vi.mock("@/lib/holiday", () => ({ upsertHoliday: vi.fn(), deleteHolidayByDate: vi.fn() }));

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { deleteHolidayByDate, upsertHoliday } from "@/lib/holiday";
import { removeHoliday, saveHoliday } from "./actions";

const adminSession = { user: { id: "admin-1", role: "ADMIN", isActive: true } };
const memberSession = { user: { id: "member-1", role: "MEMBER", isActive: true } };

describe("saveHoliday", () => {
  beforeEach(() => vi.clearAllMocks());

  it("正常系: 祝日を upsert し空オブジェクトを返す", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);
    vi.mocked(upsertHoliday).mockResolvedValue({ id: "h1" } as never);

    const result = await saveHoliday({ date: "2026-08-11", name: " 山の日 " });

    expect(result).toEqual({});
    expect(upsertHoliday).toHaveBeenCalledWith({
      date: new Date("2026-08-11T00:00:00.000Z"),
      name: "山の日",
    });
    expect(revalidatePath).toHaveBeenCalledWith("/admin/holidays");
    expect(revalidatePath).toHaveBeenCalledWith("/reports/status");
  });

  it("正常系: name 空文字は null として保存する", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);
    vi.mocked(upsertHoliday).mockResolvedValue({ id: "h1" } as never);

    await saveHoliday({ date: "2026-08-11", name: "  " });

    expect(upsertHoliday).toHaveBeenCalledWith({
      date: new Date("2026-08-11T00:00:00.000Z"),
      name: null,
    });
  });

  it("異常系: 未認証は /login へ redirect する", async () => {
    vi.mocked(getSession).mockResolvedValue(null as never);

    await saveHoliday({ date: "2026-08-11" });

    expect(redirect).toHaveBeenCalledWith("/login");
    expect(upsertHoliday).not.toHaveBeenCalled();
  });

  it("異常系: ADMIN 以外はエラーを返す", async () => {
    vi.mocked(getSession).mockResolvedValue(memberSession as never);

    const result = await saveHoliday({ date: "2026-08-11" });

    expect(result).toEqual({ error: "祝日を設定する権限がありません" });
    expect(upsertHoliday).not.toHaveBeenCalled();
  });

  it("異常系: 不正な日付はバリデーションエラーを返す", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);

    const result = await saveHoliday({ date: "2026-13-40" });

    expect(result.error).toBeTruthy();
    expect(upsertHoliday).not.toHaveBeenCalled();
  });
});

describe("removeHoliday", () => {
  beforeEach(() => vi.clearAllMocks());

  it("正常系: 日付指定で解除し空オブジェクトを返す", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);
    vi.mocked(deleteHolidayByDate).mockResolvedValue(undefined as never);

    const result = await removeHoliday({ date: "2026-08-11" });

    expect(result).toEqual({});
    expect(deleteHolidayByDate).toHaveBeenCalledWith({
      date: new Date("2026-08-11T00:00:00.000Z"),
    });
  });

  it("異常系: 未認証は /login へ redirect する", async () => {
    vi.mocked(getSession).mockResolvedValue(null as never);

    await removeHoliday({ date: "2026-08-11" });

    expect(redirect).toHaveBeenCalledWith("/login");
    expect(deleteHolidayByDate).not.toHaveBeenCalled();
  });

  it("異常系: ADMIN 以外はエラーを返す", async () => {
    vi.mocked(getSession).mockResolvedValue(memberSession as never);

    const result = await removeHoliday({ date: "2026-08-11" });

    expect(result).toEqual({ error: "祝日を解除する権限がありません" });
    expect(deleteHolidayByDate).not.toHaveBeenCalled();
  });

  it("異常系: 不正な日付はバリデーションエラーを返す", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);

    const result = await removeHoliday({ date: "2026-13-40" });

    expect(result.error).toBeTruthy();
    expect(deleteHolidayByDate).not.toHaveBeenCalled();
  });
});
