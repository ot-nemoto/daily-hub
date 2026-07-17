// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
  },
}));

vi.mock("@/lib/comments", () => ({
  deleteCommentByAuthor: vi.fn(),
}));

import { deleteCommentByAuthor } from "@/lib/comments";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { DELETE } from "./route";

const VALID_API_KEY = "test-key";
const MEMBER = { id: "u1", role: "MEMBER", isActive: true };

function makeRequest(apiKey?: string) {
  const headers: Record<string, string> = {};
  if (apiKey !== undefined) headers.authorization = `Bearer ${apiKey}`;
  return new NextRequest("http://localhost/api/comments/c1", { method: "DELETE", headers });
}

const ctx = { params: Promise.resolve({ id: "c1" }) };

function authOk(user = MEMBER) {
  vi.mocked(prisma.user.findUnique).mockResolvedValue(user as never);
}

describe("DELETE /api/comments/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("Authorization ヘッダーなしで 401 を返す", async () => {
    const res = await DELETE(makeRequest(), ctx);
    expect(res.status).toBe(401);
  });

  it("正常系: 204 を返す", async () => {
    authOk();
    vi.mocked(deleteCommentByAuthor).mockResolvedValue(undefined);
    const res = await DELETE(makeRequest(VALID_API_KEY), ctx);
    expect(res.status).toBe(204);
    expect(deleteCommentByAuthor).toHaveBeenCalledWith({ commentId: "c1", authorId: "u1" });
  });

  it("他人のコメント（ForbiddenError）で 403 を返す", async () => {
    authOk();
    vi.mocked(deleteCommentByAuthor).mockRejectedValue(new ForbiddenError());
    const res = await DELETE(makeRequest(VALID_API_KEY), ctx);
    expect(res.status).toBe(403);
  });

  it("存在しないコメント（NotFoundError）で 404 を返す", async () => {
    authOk();
    vi.mocked(deleteCommentByAuthor).mockRejectedValue(new NotFoundError());
    const res = await DELETE(makeRequest(VALID_API_KEY), ctx);
    expect(res.status).toBe(404);
  });
});
