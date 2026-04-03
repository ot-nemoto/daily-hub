// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  getSession: vi.fn(),
}));

vi.mock("@/lib/comments", () => ({
  createComment: vi.fn(),
}));

import { getSession } from "@/lib/auth";
import { createComment } from "@/lib/comments";
import { NotFoundError } from "@/lib/errors";
import { POST } from "./route";

const mockSession = { user: { id: "user-1", name: "山田 太郎", email: "yamada@example.com", isActive: true } };

function makeRequest(reportId: string, body: unknown) {
  return new Request(`http://localhost/api/reports/${reportId}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validBody = { body: "お疲れ様です" };

describe("POST /api/reports/[id]/comments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("正常系: 有効な入力で 201 と id を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession as never);
    vi.mocked(createComment).mockResolvedValue({ id: "comment-1" });

    const res = await POST(makeRequest("report-1", validBody), {
      params: Promise.resolve({ id: "report-1" }),
    });
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data).toEqual({ id: "comment-1" });
    expect(createComment).toHaveBeenCalledWith({
      reportId: "report-1",
      authorId: "user-1",
      body: "お疲れ様です",
    });
  });

  it("異常系: 未認証で 401 を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(null as never);

    const res = await POST(makeRequest("report-1", validBody), {
      params: Promise.resolve({ id: "report-1" }),
    });

    expect(res.status).toBe(401);
    expect(createComment).not.toHaveBeenCalled();
  });

  it("異常系: body が空で 400 を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession as never);

    const res = await POST(makeRequest("report-1", { body: "" }), {
      params: Promise.resolve({ id: "report-1" }),
    });

    expect(res.status).toBe(400);
  });

  it("異常系: body が 1000 文字超で 400 を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession as never);

    const res = await POST(makeRequest("report-1", { body: "a".repeat(1001) }), {
      params: Promise.resolve({ id: "report-1" }),
    });

    expect(res.status).toBe(400);
  });

  it("異常系: 存在しない reportId で 404 を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession as never);
    vi.mocked(createComment).mockRejectedValue(new NotFoundError("Report not found"));

    const res = await POST(makeRequest("nonexistent", validBody), {
      params: Promise.resolve({ id: "nonexistent" }),
    });

    expect(res.status).toBe(404);
  });

  it("異常系: 不正な JSON で 400 を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession as never);

    const res = await POST(
      new Request("http://localhost/api/reports/report-1/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "invalid-json",
      }),
      { params: Promise.resolve({ id: "report-1" }) },
    );

    expect(res.status).toBe(400);
  });
});
