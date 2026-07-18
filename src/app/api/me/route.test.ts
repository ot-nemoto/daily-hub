// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
  },
}));

vi.mock("@/lib/users", () => ({
  getMe: vi.fn(),
  updateMe: vi.fn(),
}));

import { NotFoundError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { getMe, updateMe } from "@/lib/users";
import { GET, PATCH } from "./route";

const VALID_API_KEY = "test-key";
const MEMBER = { id: "u1", role: "MEMBER", isActive: true };
const PROFILE = {
  id: "u1",
  name: "太郎",
  email: "taro@example.com",
  role: "MEMBER",
  isActive: true,
};

function makeRequest(method: "GET" | "PATCH", opts: { body?: unknown; apiKey?: string } = {}) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (opts.apiKey !== undefined) headers.authorization = `Bearer ${opts.apiKey}`;
  return new NextRequest("http://localhost/api/me", {
    method,
    headers,
    ...(opts.body !== undefined ? { body: JSON.stringify(opts.body) } : {}),
  });
}

function authOk(user = MEMBER) {
  vi.mocked(prisma.user.findUnique).mockResolvedValue(user as never);
}

describe("GET /api/me", () => {
  beforeEach(() => vi.clearAllMocks());

  it("Authorization ヘッダーなしで 401 を返す", async () => {
    const res = await GET(makeRequest("GET"));
    expect(res.status).toBe(401);
  });

  it("正常系: 整形済みプロフィールを返す", async () => {
    authOk();
    vi.mocked(getMe).mockResolvedValue(PROFILE as never);
    const res = await GET(makeRequest("GET", { apiKey: VALID_API_KEY }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual(PROFILE);
    expect(getMe).toHaveBeenCalledWith("u1");
  });

  it("本人が存在しない場合 404 を返す", async () => {
    authOk();
    vi.mocked(getMe).mockResolvedValue(null);
    const res = await GET(makeRequest("GET", { apiKey: VALID_API_KEY }));
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/me", () => {
  beforeEach(() => vi.clearAllMocks());

  it("Authorization ヘッダーなしで 401 を返す", async () => {
    const res = await PATCH(makeRequest("PATCH", { body: { name: "新名" } }));
    expect(res.status).toBe(401);
  });

  it("name が空なら 400 を返す", async () => {
    authOk();
    const res = await PATCH(makeRequest("PATCH", { body: { name: "" }, apiKey: VALID_API_KEY }));
    expect(res.status).toBe(400);
  });

  it("正常系: 氏名を更新し整形済みプロフィールを返す", async () => {
    authOk();
    const updated = { ...PROFILE, name: "新しい名前" };
    vi.mocked(updateMe).mockResolvedValue(updated as never);
    const res = await PATCH(
      makeRequest("PATCH", { body: { name: "新しい名前" }, apiKey: VALID_API_KEY }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual(updated);
    expect(updateMe).toHaveBeenCalledWith({ id: "u1", name: "新しい名前" });
  });

  it("VIEWER ロールでも自分の氏名を更新できる（200）", async () => {
    authOk({ ...MEMBER, role: "VIEWER" });
    vi.mocked(updateMe).mockResolvedValue({ ...PROFILE, role: "VIEWER", name: "新名" } as never);
    const res = await PATCH(
      makeRequest("PATCH", { body: { name: "新名" }, apiKey: VALID_API_KEY }),
    );
    expect(res.status).toBe(200);
  });

  it("本人が存在しない場合 404 を返す", async () => {
    authOk();
    vi.mocked(updateMe).mockRejectedValue(new NotFoundError());
    const res = await PATCH(
      makeRequest("PATCH", { body: { name: "新名" }, apiKey: VALID_API_KEY }),
    );
    expect(res.status).toBe(404);
  });
});
