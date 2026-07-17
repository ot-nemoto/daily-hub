// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
  },
}));

vi.mock("@/lib/users", () => ({
  updateUserAdmin: vi.fn(),
  deleteUser: vi.fn(),
}));

import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { deleteUser, updateUserAdmin } from "@/lib/users";
import { DELETE, PATCH } from "./route";

const VALID_API_KEY = "admin-key";
const ADMIN = { id: "admin-1", role: "ADMIN", isActive: true };
const TARGET = {
  id: "u2",
  name: "Bob",
  email: "bob@example.com",
  role: "MEMBER",
  isActive: true,
};

function makeRequest(method: "PATCH" | "DELETE", opts: { body?: unknown; apiKey?: string } = {}) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (opts.apiKey !== undefined) headers.authorization = `Bearer ${opts.apiKey}`;
  return new NextRequest("http://localhost/api/admin/users/u2", {
    method,
    headers,
    ...(opts.body !== undefined ? { body: JSON.stringify(opts.body) } : {}),
  });
}

const ctx = { params: Promise.resolve({ id: "u2" }) };

function auth(user = ADMIN) {
  vi.mocked(prisma.user.findUnique).mockResolvedValue(user as never);
}

describe("PATCH /api/admin/users/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("Authorization ヘッダーなしで 401 を返す", async () => {
    const res = await PATCH(makeRequest("PATCH", { body: { role: "MEMBER" } }), ctx);
    expect(res.status).toBe(401);
  });

  it("非 ADMIN で 403 を返す", async () => {
    auth({ ...ADMIN, role: "MEMBER" });
    const res = await PATCH(
      makeRequest("PATCH", { body: { role: "MEMBER" }, apiKey: VALID_API_KEY }),
      ctx,
    );
    expect(res.status).toBe(403);
    expect(updateUserAdmin).not.toHaveBeenCalled();
  });

  it("role も isActive もない body で 400 を返す", async () => {
    auth();
    const res = await PATCH(makeRequest("PATCH", { body: {}, apiKey: VALID_API_KEY }), ctx);
    expect(res.status).toBe(400);
  });

  it("自分自身の降格/無効化（ForbiddenError）で 403 を返す", async () => {
    auth();
    vi.mocked(updateUserAdmin).mockRejectedValue(new ForbiddenError());
    const res = await PATCH(
      makeRequest("PATCH", { body: { role: "MEMBER" }, apiKey: VALID_API_KEY }),
      ctx,
    );
    expect(res.status).toBe(403);
  });

  it("存在しないユーザー（NotFoundError）で 404 を返す", async () => {
    auth();
    vi.mocked(updateUserAdmin).mockRejectedValue(new NotFoundError());
    const res = await PATCH(
      makeRequest("PATCH", { body: { role: "MEMBER" }, apiKey: VALID_API_KEY }),
      ctx,
    );
    expect(res.status).toBe(404);
  });

  it("正常系: 更新後ユーザーを整形して返す", async () => {
    auth();
    const updated = { ...TARGET, role: "VIEWER" };
    vi.mocked(updateUserAdmin).mockResolvedValue(updated as never);
    const res = await PATCH(
      makeRequest("PATCH", { body: { role: "VIEWER" }, apiKey: VALID_API_KEY }),
      ctx,
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual(updated);
    expect(updateUserAdmin).toHaveBeenCalledWith({
      id: "u2",
      currentUserId: "admin-1",
      role: "VIEWER",
    });
  });
});

describe("DELETE /api/admin/users/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("Authorization ヘッダーなしで 401 を返す", async () => {
    const res = await DELETE(makeRequest("DELETE"), ctx);
    expect(res.status).toBe(401);
  });

  it("非 ADMIN で 403 を返す", async () => {
    auth({ ...ADMIN, role: "VIEWER" });
    const res = await DELETE(makeRequest("DELETE", { apiKey: VALID_API_KEY }), ctx);
    expect(res.status).toBe(403);
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it("正常系: 204 を返す", async () => {
    auth();
    vi.mocked(deleteUser).mockResolvedValue(undefined);
    const res = await DELETE(makeRequest("DELETE", { apiKey: VALID_API_KEY }), ctx);
    expect(res.status).toBe(204);
    expect(deleteUser).toHaveBeenCalledWith({ id: "u2", currentUserId: "admin-1" });
  });

  it("自分自身の削除（ForbiddenError）で 403 を返す", async () => {
    auth();
    vi.mocked(deleteUser).mockRejectedValue(new ForbiddenError());
    const res = await DELETE(makeRequest("DELETE", { apiKey: VALID_API_KEY }), ctx);
    expect(res.status).toBe(403);
  });

  it("存在しないユーザー（NotFoundError）で 404 を返す", async () => {
    auth();
    vi.mocked(deleteUser).mockRejectedValue(new NotFoundError());
    const res = await DELETE(makeRequest("DELETE", { apiKey: VALID_API_KEY }), ctx);
    expect(res.status).toBe(404);
  });
});
