// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: { user: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn() } },
}));
vi.mock("bcryptjs", () => ({
  default: { hash: vi.fn().mockResolvedValue("hashed") },
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GET, POST } from "./route";

const mockAuth = vi.mocked(auth);
const mockFindMany = vi.mocked(prisma.user.findMany);
const mockFindUnique = vi.mocked(prisma.user.findUnique);
const mockCreate = vi.mocked(prisma.user.create);

const adminSession = { user: { id: "admin-1", role: "ADMIN" } };
const memberSession = { user: { id: "member-1", role: "MEMBER" } };

const today = new Date();

const mockUsers = [
  {
    id: "user-1",
    name: "田中 太郎",
    email: "tanaka@example.com",
    role: "ADMIN",
    isActive: true,
    createdAt: new Date("2026-01-01"),
    reports: [{ date: today }],
    _count: { reports: 20 },
  },
  {
    id: "user-2",
    name: "佐藤 花子",
    email: "sato@example.com",
    role: "MEMBER",
    isActive: true,
    createdAt: new Date("2026-01-02"),
    reports: [],
    _count: { reports: 0 },
  },
];

describe("GET /api/admin/users", () => {
  beforeEach(() => vi.clearAllMocks());

  it("正常系: ADMIN はユーザー一覧を取得できる", async () => {
    mockAuth.mockResolvedValue(adminSession as never);
    mockFindMany.mockResolvedValue(mockUsers as never);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toHaveLength(2);
    expect(body[0]).toMatchObject({
      id: "user-1",
      name: "田中 太郎",
      role: "ADMIN",
      submissionRate30d: expect.any(Number),
    });
    expect(body[0].lastReportAt).not.toBeNull();
    expect(body[1].lastReportAt).toBeNull();
  });

  it("異常系: MEMBER は 403 を返す", async () => {
    mockAuth.mockResolvedValue(memberSession as never);

    const res = await GET();
    expect(res.status).toBe(403);
  });

  it("異常系: 未ログインは 403 を返す", async () => {
    mockAuth.mockResolvedValue(null as never);

    const res = await GET();
    expect(res.status).toBe(403);
  });
});

const makeRequest = (body: unknown) =>
  new Request("http://localhost/api/admin/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

describe("POST /api/admin/users", () => {
  beforeEach(() => vi.clearAllMocks());

  it("正常系: ADMIN はユーザーを作成できる", async () => {
    mockAuth.mockResolvedValue(adminSession as never);
    mockFindUnique.mockResolvedValue(null as never);
    mockCreate.mockResolvedValue({ id: "new-user-1" } as never);

    const res = await POST(makeRequest({ name: "新規 ユーザー", email: "new@example.com", password: "password123" }));
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body).toEqual({ id: "new-user-1" });
  });

  it("異常系: MEMBER は 403 を返す", async () => {
    mockAuth.mockResolvedValue(memberSession as never);

    const res = await POST(makeRequest({ name: "test", email: "test@example.com", password: "password123" }));
    expect(res.status).toBe(403);
  });

  it("異常系: バリデーションエラーは 400 を返す（passwordが短い）", async () => {
    mockAuth.mockResolvedValue(adminSession as never);

    const res = await POST(makeRequest({ name: "test", email: "test@example.com", password: "short" }));
    expect(res.status).toBe(400);
  });

  it("異常系: メールアドレス重複は 409 を返す", async () => {
    mockAuth.mockResolvedValue(adminSession as never);
    mockFindUnique.mockResolvedValue({ id: "existing" } as never);

    const res = await POST(makeRequest({ name: "test", email: "existing@example.com", password: "password123" }));
    expect(res.status).toBe(409);
  });
});
