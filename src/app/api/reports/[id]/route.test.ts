// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  getSession: vi.fn(),
}));

vi.mock("@/lib/reports", () => ({
  updateReport: vi.fn(),
}));

import { getSession } from "@/lib/auth";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { updateReport } from "@/lib/reports";
import { PUT } from "./route";

const mockSession = { user: { id: "user-1", name: "山田 太郎", email: "yamada@example.com", role: "MEMBER", isActive: true } };
const mockViewerSession = { user: { id: "user-2", name: "閲覧 ユーザー", email: "viewer@example.com", role: "VIEWER", isActive: true } };

function makeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

const validBody = {
  workContent: "○○機能の実装（完了）",
  tomorrowPlan: "レビュー対応",
  notes: "解決できた",
};

describe("PUT /api/reports/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("正常系: 自分の日報を更新して 200 と id を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession as never);
    vi.mocked(updateReport).mockResolvedValue({ id: "report-1" });

    const res = await PUT(
      new Request("http://localhost/api/reports/report-1", {
        method: "PUT",
        body: JSON.stringify(validBody),
      }),
      makeContext("report-1"),
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual({ id: "report-1" });
    expect(updateReport).toHaveBeenCalledWith({
      id: "report-1",
      authorId: "user-1",
      workContent: validBody.workContent,
      tomorrowPlan: validBody.tomorrowPlan,
      notes: validBody.notes,
    });
  });

  it("正常系: notes 省略時は空文字で更新される", async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession as never);
    vi.mocked(updateReport).mockResolvedValue({ id: "report-1" });

    const { notes: _notes, ...bodyWithoutNotes } = validBody;
    await PUT(
      new Request("http://localhost/api/reports/report-1", {
        method: "PUT",
        body: JSON.stringify(bodyWithoutNotes),
      }),
      makeContext("report-1"),
    );

    expect(updateReport).toHaveBeenCalledWith(
      expect.objectContaining({ notes: "" }),
    );
  });

  it("異常系: 未認証で 401 を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(null as never);

    const res = await PUT(
      new Request("http://localhost/api/reports/report-1", {
        method: "PUT",
        body: JSON.stringify(validBody),
      }),
      makeContext("report-1"),
    );

    expect(res.status).toBe(401);
    expect(updateReport).not.toHaveBeenCalled();
  });

  it("異常系: workContent が空で 400 を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession as never);

    const res = await PUT(
      new Request("http://localhost/api/reports/report-1", {
        method: "PUT",
        body: JSON.stringify({ ...validBody, workContent: "" }),
      }),
      makeContext("report-1"),
    );

    expect(res.status).toBe(400);
    expect(updateReport).not.toHaveBeenCalled();
  });

  it("異常系: 存在しない ID で 404 を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession as never);
    vi.mocked(updateReport).mockRejectedValue(new NotFoundError("Report not found"));

    const res = await PUT(
      new Request("http://localhost/api/reports/nonexistent", {
        method: "PUT",
        body: JSON.stringify(validBody),
      }),
      makeContext("nonexistent"),
    );

    expect(res.status).toBe(404);
  });

  it("異常系: 他ユーザーの日報で 403 を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession as never);
    vi.mocked(updateReport).mockRejectedValue(new ForbiddenError("Forbidden"));

    const res = await PUT(
      new Request("http://localhost/api/reports/report-1", {
        method: "PUT",
        body: JSON.stringify(validBody),
      }),
      makeContext("report-1"),
    );

    expect(res.status).toBe(403);
  });

  it("異常系: 不正な JSON で 400 を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession as never);

    const res = await PUT(
      new Request("http://localhost/api/reports/report-1", {
        method: "PUT",
        body: "not json",
      }),
      makeContext("report-1"),
    );

    expect(res.status).toBe(400);
  });

  it("異常系: VIEWER ロールで 403 を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(mockViewerSession as never);

    const res = await PUT(
      new Request("http://localhost/api/reports/report-1", {
        method: "PUT",
        body: JSON.stringify(validBody),
      }),
      makeContext("report-1"),
    );

    expect(res.status).toBe(403);
    expect(updateReport).not.toHaveBeenCalled();
  });
});
