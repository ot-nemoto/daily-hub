// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/lib/auth", () => ({ getSession: vi.fn() }));
vi.mock("@/lib/reports", () => ({ createReport: vi.fn() }));

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { ConflictError } from "@/lib/errors";
import { createReport as libCreateReport } from "@/lib/reports";
import { createReport } from "./actions";

const memberSession = { user: { id: "user-1", role: "MEMBER", isActive: true } };
const viewerSession = { user: { id: "user-2", role: "VIEWER", isActive: true } };
const input = {
  date: "2026-03-06",
  workContent: "○○機能の実装",
  tomorrowPlan: "レビュー対応",
  notes: "所感",
};

describe("createReport", () => {
  beforeEach(() => vi.clearAllMocks());

  it("正常系: 日報を作成して id を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(memberSession as never);
    vi.mocked(libCreateReport).mockResolvedValue({ id: "report-1" });

    const result = await createReport(input);

    expect(result).toEqual({ id: "report-1" });
    expect(libCreateReport).toHaveBeenCalledWith({
      date: new Date("2026-03-06T00:00:00.000Z"),
      workContent: input.workContent,
      tomorrowPlan: input.tomorrowPlan,
      notes: input.notes,
      authorId: "user-1",
    });
    expect(revalidatePath).toHaveBeenCalledWith("/reports/daily");
  });

  it("異常系: 未認証で redirect する", async () => {
    vi.mocked(getSession).mockResolvedValue(null as never);

    await createReport(input);

    expect(redirect).toHaveBeenCalledWith("/login");
    expect(libCreateReport).not.toHaveBeenCalled();
  });

  it("異常系: VIEWER ロールで error を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(viewerSession as never);

    const result = await createReport(input);

    expect(result).toMatchObject({ error: expect.any(String) });
    expect(libCreateReport).not.toHaveBeenCalled();
  });

  it("異常系: 日報の重複で error を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(memberSession as never);
    vi.mocked(libCreateReport).mockRejectedValue(new ConflictError());

    const result = await createReport(input);

    expect(result).toMatchObject({ error: expect.any(String) });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
