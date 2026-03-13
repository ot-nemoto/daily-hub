// @vitest-environment node
import bcrypt from "bcryptjs";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";
import { POST } from "./route";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn(),
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    invitation: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
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

const mockUser = {
  id: "test-id",
  name: "テスト ユーザー",
  email: "test@example.com",
  passwordHash: "hashed_password",
  role: "MEMBER" as never,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("POST /api/auth/signup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // $transaction はコールバックを prisma 自身で実行する
    vi.mocked(prisma.$transaction).mockImplementation(async (fn) => fn(prisma as never));
  });

  it("正常系: 有効な入力で 201 と id を返す", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.user.create).mockResolvedValue(mockUser);

    const res = await POST(makeRequest({ name: "テスト ユーザー", email: "test@example.com", password: "password123" }));
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data).toEqual({ id: "test-id" });
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

const validInvitation = {
  id: "inv-1",
  token: "valid-token",
  email: null,
  expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
  usedAt: null,
  createdAt: new Date(),
  invitedById: "admin-1",
};

describe("POST /api/auth/signup（招待トークンあり）", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.$transaction).mockImplementation(async (fn) => fn(prisma as never));
  });

  it("正常系: 有効なトークンで登録できる", async () => {
    vi.mocked(prisma.invitation.findUnique).mockResolvedValue(validInvitation as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.invitation.updateMany).mockResolvedValue({ count: 1 });
    vi.mocked(prisma.user.create).mockResolvedValue(mockUser);

    const res = await POST(makeRequest({ name: "テスト", email: "test@example.com", password: "password123", token: "valid-token" }));
    expect(res.status).toBe(201);
    expect(prisma.invitation.updateMany).toHaveBeenCalledWith({
      where: { id: "inv-1", usedAt: null },
      data: { usedAt: expect.any(Date) },
    });
  });

  it("正常系: email 指定ありのトークンで一致するメールで登録できる", async () => {
    vi.mocked(prisma.invitation.findUnique).mockResolvedValue({ ...validInvitation, email: "test@example.com" } as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.invitation.updateMany).mockResolvedValue({ count: 1 });
    vi.mocked(prisma.user.create).mockResolvedValue(mockUser);

    const res = await POST(makeRequest({ name: "テスト", email: "test@example.com", password: "password123", token: "valid-token" }));
    expect(res.status).toBe(201);
  });

  it("異常系: 存在しないトークンは 400 を返す", async () => {
    vi.mocked(prisma.invitation.findUnique).mockResolvedValue(null);

    const res = await POST(makeRequest({ name: "テスト", email: "test@example.com", password: "password123", token: "invalid-token" }));
    expect(res.status).toBe(400);
  });

  it("異常系: 使用済みトークンは 400 を返す", async () => {
    vi.mocked(prisma.invitation.findUnique).mockResolvedValue({ ...validInvitation, usedAt: new Date() } as never);

    const res = await POST(makeRequest({ name: "テスト", email: "test@example.com", password: "password123", token: "valid-token" }));
    expect(res.status).toBe(400);
  });

  it("異常系: 期限切れトークンは 400 を返す", async () => {
    vi.mocked(prisma.invitation.findUnique).mockResolvedValue({ ...validInvitation, expiresAt: new Date(Date.now() - 1000) } as never);

    const res = await POST(makeRequest({ name: "テスト", email: "test@example.com", password: "password123", token: "valid-token" }));
    expect(res.status).toBe(400);
  });

  it("異常系: email 不一致のトークンは 400 を返す", async () => {
    vi.mocked(prisma.invitation.findUnique).mockResolvedValue({ ...validInvitation, email: "other@example.com" } as never);

    const res = await POST(makeRequest({ name: "テスト", email: "test@example.com", password: "password123", token: "valid-token" }));
    expect(res.status).toBe(400);
  });

  it("異常系: トランザクション内での二重使用（count=0）は 400 を返す", async () => {
    vi.mocked(prisma.invitation.findUnique).mockResolvedValue(validInvitation as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.invitation.updateMany).mockResolvedValue({ count: 0 });

    const res = await POST(makeRequest({ name: "テスト", email: "test@example.com", password: "password123", token: "valid-token" }));
    expect(res.status).toBe(400);
  });
});
