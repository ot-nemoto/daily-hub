// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";
import { POST } from "./route";

vi.mock("@/lib/auth", () => ({
  getSession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    report: {
      findUnique: vi.fn(),
    },
    comment: {
      create: vi.fn(),
    },
  },
}));

const mockSession = { user: { id: "user-1", name: "山田 太郎", email: "yamada@example.com", isActive: true } };
const mockReport = { id: "report-1" };
const mockComment = { id: "comment-1" };

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
    const { getSession } = await import("@/lib/auth");
    vi.mocked(getSession).mockResolvedValue(mockSession as never);
    vi.mocked(prisma.report.findUnique).mockResolvedValue(mockReport as never);
    vi.mocked(prisma.comment.create).mockResolvedValue(mockComment as never);

    const res = await POST(makeRequest("report-1", validBody), {
      params: Promise.resolve({ id: "report-1" }),
    });
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data).toEqual({ id: "comment-1" });
    expect(prisma.comment.create).toHaveBeenCalledWith({
      data: { body: "お疲れ様です", reportId: "report-1", authorId: "user-1" },
      select: { id: true },
    });
  });

  it("異常系: 未認証で 401 を返す", async () => {
    const { getSession } = await import("@/lib/auth");
    vi.mocked(getSession).mockResolvedValue(null as never);

    const res = await POST(makeRequest("report-1", validBody), {
      params: Promise.resolve({ id: "report-1" }),
    });

    expect(res.status).toBe(401);
    expect(prisma.report.findUnique).not.toHaveBeenCalled();
  });

  it("異常系: body が空で 400 を返す", async () => {
    const { getSession } = await import("@/lib/auth");
    vi.mocked(getSession).mockResolvedValue(mockSession as never);

    const res = await POST(makeRequest("report-1", { body: "" }), {
      params: Promise.resolve({ id: "report-1" }),
    });

    expect(res.status).toBe(400);
  });

  it("異常系: body が 1000 文字超で 400 を返す", async () => {
    const { getSession } = await import("@/lib/auth");
    vi.mocked(getSession).mockResolvedValue(mockSession as never);

    const res = await POST(makeRequest("report-1", { body: "a".repeat(1001) }), {
      params: Promise.resolve({ id: "report-1" }),
    });

    expect(res.status).toBe(400);
  });

  it("異常系: 存在しない reportId で 404 を返す", async () => {
    const { getSession } = await import("@/lib/auth");
    vi.mocked(getSession).mockResolvedValue(mockSession as never);
    vi.mocked(prisma.report.findUnique).mockResolvedValue(null);

    const res = await POST(makeRequest("nonexistent", validBody), {
      params: Promise.resolve({ id: "nonexistent" }),
    });

    expect(res.status).toBe(404);
    expect(prisma.comment.create).not.toHaveBeenCalled();
  });

  it("異常系: 不正な JSON で 400 を返す", async () => {
    const { getSession } = await import("@/lib/auth");
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
