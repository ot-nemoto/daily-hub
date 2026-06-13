// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { GET } from "./route";

const ADMIN_USER = { id: "admin-1", role: "ADMIN", isActive: true };
const MEMBER_USER = { id: "member-1", role: "MEMBER", isActive: true };
const VIEWER_USER = { id: "viewer-1", role: "VIEWER", isActive: true };
const INACTIVE_ADMIN = { id: "admin-2", role: "ADMIN", isActive: false };

const USERS_LIST = [
  { id: "u1", name: "Alice", email: "alice@example.com", role: "ADMIN", isActive: true },
  { id: "u2", name: "Bob", email: "bob@example.com", role: "MEMBER", isActive: true },
  { id: "u3", name: "Carol", email: "carol@example.com", role: "VIEWER", isActive: false },
];

function makeRequest(apiKey?: string) {
  const headers: Record<string, string> = {};
  if (apiKey !== undefined) {
    headers.authorization = `Bearer ${apiKey}`;
  }
  return new NextRequest("http://localhost/api/users", { method: "GET", headers });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/users", () => {
  describe("認証", () => {
    it("Authorization ヘッダーなし → 401", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      const res = await GET(makeRequest());
      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ error: "Unauthorized" });
    });

    it("無効な API キー → 401", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      const res = await GET(makeRequest("invalid-key"));
      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ error: "Unauthorized" });
    });

    it("無効化されたアカウント → 401", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(INACTIVE_ADMIN as never);
      const res = await GET(makeRequest("inactive-key"));
      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ error: "Unauthorized" });
    });
  });

  describe("認可", () => {
    it("MEMBER ロール → 403", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(MEMBER_USER as never);
      const res = await GET(makeRequest("member-key"));
      expect(res.status).toBe(403);
      expect(await res.json()).toEqual({ error: "この操作には ADMIN 権限が必要です" });
    });

    it("VIEWER ロール → 403", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(VIEWER_USER as never);
      const res = await GET(makeRequest("viewer-key"));
      expect(res.status).toBe(403);
      expect(await res.json()).toEqual({ error: "この操作には ADMIN 権限が必要です" });
    });
  });

  describe("正常系", () => {
    it("ADMIN → 200 でユーザー一覧を返す", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(ADMIN_USER as never);
      vi.mocked(prisma.user.findMany).mockResolvedValue(USERS_LIST as never);
      const res = await GET(makeRequest("admin-key"));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual({ users: USERS_LIST });
    });

    it("ユーザーが存在しない → 空配列を返す", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(ADMIN_USER as never);
      vi.mocked(prisma.user.findMany).mockResolvedValue([]);
      const res = await GET(makeRequest("admin-key"));
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ users: [] });
    });

    it("レスポンスに id, name, email, role, isActive が含まれる", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(ADMIN_USER as never);
      vi.mocked(prisma.user.findMany).mockResolvedValue(USERS_LIST as never);
      const res = await GET(makeRequest("admin-key"));
      const { users } = await res.json();
      expect(Object.keys(users[0]).sort()).toEqual(["email", "id", "isActive", "name", "role"].sort());
    });
  });
});
