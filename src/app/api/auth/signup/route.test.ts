// @vitest-environment node
import bcrypt from "bcryptjs";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";
import { POST } from "./route";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn().mockResolvedValue("hashed_password"),
  },
}));

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/signup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("正常系: 有効な入力で 201 と id を返す", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.user.create).mockResolvedValue({
      id: "test-id",
      name: "テスト ユーザー",
      email: "test@example.com",
      passwordHash: "hashed_password",
      role: "MEMBER" as never,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await POST(makeRequest({ name: "テスト ユーザー", email: "test@example.com", password: "password123" }));
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data).toEqual({ id: "test-id" });
    // パスワードがハッシュ化されて保存されることを保証
    expect(bcrypt.hash).toHaveBeenCalledWith("password123", 10);
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: { name: "テスト ユーザー", email: "test@example.com", passwordHash: "hashed_password" },
    });
  });

  it("異常系: name が空で 400 を返す", async () => {
    const res = await POST(makeRequest({ name: "", email: "test@example.com", password: "password123" }));
    expect(res.status).toBe(400);
  });

  it("異常系: email が不正で 400 を返す", async () => {
    const res = await POST(makeRequest({ name: "テスト", email: "not-an-email", password: "password123" }));
    expect(res.status).toBe(400);
  });

  it("異常系: password が 8 文字未満で 400 を返す", async () => {
    const res = await POST(makeRequest({ name: "テスト", email: "test@example.com", password: "short" }));
    expect(res.status).toBe(400);
  });

  it("異常系: メールアドレス重複で 409 を返す", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "existing-id",
      name: "既存ユーザー",
      email: "test@example.com",
      passwordHash: "hashed",
      role: "MEMBER" as never,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await POST(makeRequest({ name: "テスト", email: "test@example.com", password: "password123" }));
    expect(res.status).toBe(409);
  });

  it("異常系: 同時リクエストによる P2002 競合で 409 を返す", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    const p2002Error = Object.assign(new Error("Unique constraint failed"), { code: "P2002" });
    vi.mocked(prisma.user.create).mockRejectedValue(p2002Error);

    const res = await POST(makeRequest({ name: "テスト", email: "test@example.com", password: "password123" }));
    expect(res.status).toBe(409);
  });

  it("異常系: 不正な JSON で 400 を返す", async () => {
    const res = await POST(
      new Request("http://localhost/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "invalid-json",
      }),
    );
    expect(res.status).toBe(400);
  });
});
