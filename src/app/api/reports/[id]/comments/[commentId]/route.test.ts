// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";
import { DELETE } from "./route";

vi.mock("@/lib/auth", () => ({
  getSession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    comment: {
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

const mockSession = { user: { id: "user-1", name: "山田 太郎", email: "yamada@example.com", isActive: true } };

function makeRequest(reportId: string, commentId: string) {
  return new Request(`http://localhost/api/reports/${reportId}/comments/${commentId}`, {
    method: "DELETE",
  });
}

describe("DELETE /api/reports/[id]/comments/[commentId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("正常系: 自分のコメントを削除して 204 を返す", async () => {
    const { getSession } = await import("@/lib/auth");
    vi.mocked(getSession).mockResolvedValue(mockSession as never);
    vi.mocked(prisma.comment.findUnique).mockResolvedValue({
      authorId: "user-1",
      reportId: "report-1",
    } as never);
    vi.mocked(prisma.comment.delete).mockResolvedValue({} as never);

    const res = await DELETE(makeRequest("report-1", "comment-1"), {
      params: Promise.resolve({ id: "report-1", commentId: "comment-1" }),
    });

    expect(res.status).toBe(204);
    expect(prisma.comment.delete).toHaveBeenCalledWith({ where: { id: "comment-1" } });
  });

  it("異常系: 未認証で 401 を返す", async () => {
    const { getSession } = await import("@/lib/auth");
    vi.mocked(getSession).mockResolvedValue(null as never);

    const res = await DELETE(makeRequest("report-1", "comment-1"), {
      params: Promise.resolve({ id: "report-1", commentId: "comment-1" }),
    });

    expect(res.status).toBe(401);
    expect(prisma.comment.findUnique).not.toHaveBeenCalled();
  });

  it("異常系: 存在しないコメントで 404 を返す", async () => {
    const { getSession } = await import("@/lib/auth");
    vi.mocked(getSession).mockResolvedValue(mockSession as never);
    vi.mocked(prisma.comment.findUnique).mockResolvedValue(null);

    const res = await DELETE(makeRequest("report-1", "nonexistent"), {
      params: Promise.resolve({ id: "report-1", commentId: "nonexistent" }),
    });

    expect(res.status).toBe(404);
    expect(prisma.comment.delete).not.toHaveBeenCalled();
  });

  it("異常系: 他ユーザーのコメントで 403 を返す", async () => {
    const { getSession } = await import("@/lib/auth");
    vi.mocked(getSession).mockResolvedValue(mockSession as never);
    vi.mocked(prisma.comment.findUnique).mockResolvedValue({
      authorId: "user-2",
      reportId: "report-1",
    } as never);

    const res = await DELETE(makeRequest("report-1", "comment-2"), {
      params: Promise.resolve({ id: "report-1", commentId: "comment-2" }),
    });

    expect(res.status).toBe(403);
    expect(prisma.comment.delete).not.toHaveBeenCalled();
  });

  it("異常系: 別の日報に属するコメントIDで 404 を返す", async () => {
    const { getSession } = await import("@/lib/auth");
    vi.mocked(getSession).mockResolvedValue(mockSession as never);
    vi.mocked(prisma.comment.findUnique).mockResolvedValue({
      authorId: "user-1",
      reportId: "report-2",
    } as never);

    const res = await DELETE(makeRequest("report-1", "comment-3"), {
      params: Promise.resolve({ id: "report-1", commentId: "comment-3" }),
    });

    expect(res.status).toBe(404);
    expect(prisma.comment.delete).not.toHaveBeenCalled();
  });
});
