// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  getSession: vi.fn(),
}));

vi.mock("@/lib/reports", () => ({
  createReport: vi.fn(),
}));

import { getSession } from "@/lib/auth";
import { ConflictError } from "@/lib/errors";
import { createReport } from "@/lib/reports";
import { POST } from "./route";

const mockSession = { user: { id: "user-1", name: "山田 太郎", email: "yamada@example.com", role: "MEMBER", isActive: true } };
const mockViewerSession = { user: { id: "user-2", name: "閲覧 ユーザー", email: "viewer@example.com", role: "VIEWER", isActive: true } };

function makePostRequest(body: unknown) {
  return new Request("http://localhost/api/reports", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validPostBody = {
  date: "2026-03-06",
  workContent: "○○機能の実装",
  tomorrowPlan: "レビュー対応",
  notes: "DBの設計で詰まった",
};

describe("POST /api/reports", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("正常系: 有効な入力で 201 と id を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession as never);
    vi.mocked(createReport).mockResolvedValue({ id: "report-1" });

    const res = await POST(makePostRequest(validPostBody));
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data).toEqual({ id: "report-1" });
    expect(createReport).toHaveBeenCalledWith({
      date: new Date("2026-03-06T00:00:00.000Z"),
      workContent: "○○機能の実装",
      tomorrowPlan: "レビュー対応",
      notes: "DBの設計で詰まった",
      authorId: "user-1",
    });
  });

  it("正常系: notes 省略時は空文字で保存される", async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession as never);
    vi.mocked(createReport).mockResolvedValue({ id: "report-1" });

    await POST(makePostRequest({ date: "2026-03-06", workContent: "作業内容", tomorrowPlan: "明日の予定" }));

    expect(createReport).toHaveBeenCalledWith(
      expect.objectContaining({ notes: "" }),
    );
  });

  it("異常系: 未認証で 401 を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(null as never);

    const res = await POST(makePostRequest(validPostBody));

    expect(res.status).toBe(401);
    expect(createReport).not.toHaveBeenCalled();
  });

  it("異常系: date が不正な形式で 400 を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession as never);

    const res = await POST(makePostRequest({ ...validPostBody, date: "20260306" }));
    expect(res.status).toBe(400);
  });

  it("異常系: date が存在しない日付で 400 を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession as never);

    const res = await POST(makePostRequest({ ...validPostBody, date: "2026-99-99" }));
    expect(res.status).toBe(400);
  });

  it("異常系: workContent が空で 400 を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession as never);

    const res = await POST(makePostRequest({ ...validPostBody, workContent: "" }));
    expect(res.status).toBe(400);
  });

  it("異常系: tomorrowPlan が空で 400 を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession as never);

    const res = await POST(makePostRequest({ ...validPostBody, tomorrowPlan: "" }));
    expect(res.status).toBe(400);
  });

  it("異常系: 日報の重複で 409 を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession as never);
    vi.mocked(createReport).mockRejectedValue(new ConflictError("Report already exists for this date"));

    const res = await POST(makePostRequest(validPostBody));
    expect(res.status).toBe(409);
  });

  it("異常系: 不正な JSON で 400 を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession as never);

    const res = await POST(
      new Request("http://localhost/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "invalid-json",
      }),
    );
    expect(res.status).toBe(400);
  });

  it("異常系: VIEWER ロールで 403 を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(mockViewerSession as never);

    const res = await POST(makePostRequest(validPostBody));

    expect(res.status).toBe(403);
    expect(createReport).not.toHaveBeenCalled();
  });
});
