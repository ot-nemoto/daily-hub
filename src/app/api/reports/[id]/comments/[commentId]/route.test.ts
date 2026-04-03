// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  getSession: vi.fn(),
}));

vi.mock("@/lib/comments", () => ({
  deleteComment: vi.fn(),
}));

import { getSession } from "@/lib/auth";
import { deleteComment } from "@/lib/comments";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { DELETE } from "./route";

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
    vi.mocked(getSession).mockResolvedValue(mockSession as never);
    vi.mocked(deleteComment).mockResolvedValue(undefined);

    const res = await DELETE(makeRequest("report-1", "comment-1"), {
      params: Promise.resolve({ id: "report-1", commentId: "comment-1" }),
    });

    expect(res.status).toBe(204);
    expect(deleteComment).toHaveBeenCalledWith({
      commentId: "comment-1",
      reportId: "report-1",
      authorId: "user-1",
    });
  });

  it("異常系: 未認証で 401 を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(null as never);

    const res = await DELETE(makeRequest("report-1", "comment-1"), {
      params: Promise.resolve({ id: "report-1", commentId: "comment-1" }),
    });

    expect(res.status).toBe(401);
    expect(deleteComment).not.toHaveBeenCalled();
  });

  it("異常系: 存在しないコメントで 404 を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession as never);
    vi.mocked(deleteComment).mockRejectedValue(new NotFoundError("Comment not found"));

    const res = await DELETE(makeRequest("report-1", "nonexistent"), {
      params: Promise.resolve({ id: "report-1", commentId: "nonexistent" }),
    });

    expect(res.status).toBe(404);
  });

  it("異常系: 他ユーザーのコメントで 403 を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession as never);
    vi.mocked(deleteComment).mockRejectedValue(new ForbiddenError("Forbidden"));

    const res = await DELETE(makeRequest("report-1", "comment-2"), {
      params: Promise.resolve({ id: "report-1", commentId: "comment-2" }),
    });

    expect(res.status).toBe(403);
  });

  it("異常系: 別の日報に属するコメントIDで 404 を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession as never);
    vi.mocked(deleteComment).mockRejectedValue(new NotFoundError("Comment not found"));

    const res = await DELETE(makeRequest("report-1", "comment-3"), {
      params: Promise.resolve({ id: "report-1", commentId: "comment-3" }),
    });

    expect(res.status).toBe(404);
  });
});
