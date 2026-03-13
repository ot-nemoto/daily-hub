// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));
vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn().mockResolvedValue("hashed-password"),
  },
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PATCH } from "./route";

const mockAuth = vi.mocked(auth);
const mockFindUnique = vi.mocked(prisma.user.findUnique);
const mockUpdate = vi.mocked(prisma.user.update);

const adminSession = { user: { id: "admin-1", role: "ADMIN" } };
const memberSession = { user: { id: "member-1", role: "MEMBER" } };

const makeRequest = (body: object) =>
  new Request("http://localhost/api/admin/users/user-1/password", {
    method: "PATCH",
    body: JSON.stringify(body),
  });

const makeRawRequest = (body: string) =>
  new Request("http://localhost/api/admin/users/user-1/password", {
    method: "PATCH",
    body,
  });

const makeParams = (id = "user-1") =>
  ({ params: Promise.resolve({ id }) }) as never;

describe("PATCH /api/admin/users/[id]/password", () => {
  beforeEach(() => vi.clearAllMocks());

  it("正常系: パスワードをリセットできる", async () => {
    mockAuth.mockResolvedValue(adminSession as never);
    mockFindUnique.mockResolvedValue({ id: "user-1" } as never);
    mockUpdate.mockResolvedValue({ id: "user-1" } as never);

    const res = await PATCH(makeRequest({ password: "newpassword123" }) as never, makeParams());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { passwordHash: "hashed-password" },
    });
  });

  it("異常系: MEMBER は 403 を返す", async () => {
    mockAuth.mockResolvedValue(memberSession as never);

    const res = await PATCH(makeRequest({ password: "newpassword123" }) as never, makeParams());
    expect(res.status).toBe(403);
  });

  it("異常系: 未認証は 403 を返す", async () => {
    mockAuth.mockResolvedValue(null);

    const res = await PATCH(makeRequest({ password: "newpassword123" }) as never, makeParams());
    expect(res.status).toBe(403);
  });

  it("異常系: 存在しないユーザーは 404 を返す", async () => {
    mockAuth.mockResolvedValue(adminSession as never);
    mockFindUnique.mockResolvedValue(null);

    const res = await PATCH(makeRequest({ password: "newpassword123" }) as never, makeParams("no-user"));
    expect(res.status).toBe(404);
  });

  it("異常系: password が未指定は 400 を返す", async () => {
    mockAuth.mockResolvedValue(adminSession as never);

    const res = await PATCH(makeRequest({}) as never, makeParams());
    expect(res.status).toBe(400);
  });

  it("異常系: password が 8 文字未満は 400 を返す", async () => {
    mockAuth.mockResolvedValue(adminSession as never);

    const res = await PATCH(makeRequest({ password: "short" }) as never, makeParams());
    expect(res.status).toBe(400);
  });

  it("異常系: 不正 JSON は 400 を返す", async () => {
    mockAuth.mockResolvedValue(adminSession as never);

    const res = await PATCH(makeRawRequest("not-json") as never, makeParams());
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: "Invalid JSON" });
  });
});
