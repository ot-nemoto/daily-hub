// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: { user: { findMany: vi.fn() } },
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GET } from "./route";

const mockAuth = vi.mocked(auth);
const mockFindMany = vi.mocked(prisma.user.findMany);

const adminSession = { user: { id: "admin-1", role: "ADMIN" } };
const memberSession = { user: { id: "member-1", role: "MEMBER" } };

const today = new Date();
today.setHours(0, 0, 0, 0);
const yesterday = new Date(today);
yesterday.setDate(yesterday.getDate() - 1);

const mockUsers = [
  {
    id: "user-1",
    name: "田中 太郎",
    email: "tanaka@example.com",
    role: "ADMIN",
    isActive: true,
    createdAt: new Date("2026-01-01"),
    reports: [{ date: today }, { date: yesterday }],
  },
  {
    id: "user-2",
    name: "佐藤 花子",
    email: "sato@example.com",
    role: "MEMBER",
    isActive: true,
    createdAt: new Date("2026-01-02"),
    reports: [],
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
    mockAuth.mockResolvedValue(null);

    const res = await GET();
    expect(res.status).toBe(403);
  });
});
