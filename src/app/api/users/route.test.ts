// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";
import { GET } from "./route";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findMany: vi.fn(),
    },
  },
}));

const mockSession = { user: { id: "user-1", name: "山田 太郎", email: "yamada@example.com" } };
const mockUsers = [
  { id: "user-1", name: "山田 太郎", email: "yamada@example.com" },
  { id: "user-2", name: "鈴木 花子", email: "suzuki@example.com" },
];

describe("GET /api/users", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("正常系: 200 とユーザー一覧を返す", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(prisma.user.findMany).mockResolvedValue(mockUsers as never);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveLength(2);
    expect(data[0]).toEqual({ id: "user-1", name: "山田 太郎", email: "yamada@example.com" });
    expect(prisma.user.findMany).toHaveBeenCalledWith({
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    });
  });

  it("異常系: 未認証で 401 を返す", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth).mockResolvedValue(null as never);

    const res = await GET();

    expect(res.status).toBe(401);
    expect(prisma.user.findMany).not.toHaveBeenCalled();
  });
});
