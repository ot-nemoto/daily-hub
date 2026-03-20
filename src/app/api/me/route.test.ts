// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  getSession: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PATCH } from "./route";

const mockAuth = vi.mocked(getSession);
const mockFindUnique = vi.mocked(prisma.user.findUnique);
const mockUpdate = vi.mocked(prisma.user.update);

const session = { user: { id: "user-1", role: "MEMBER", isActive: true } };
const existingUser = {
  id: "user-1",
  name: "田中 太郎",
  email: "tanaka@example.com",
};
const updatedUser = { id: "user-1", name: "田中 太郎", email: "tanaka@example.com" };

const makeRequest = (body: object) =>
  new Request("http://localhost/api/me", {
    method: "PATCH",
    body: JSON.stringify(body),
  });

const makeRawRequest = (body: string) =>
  new Request("http://localhost/api/me", {
    method: "PATCH",
    body,
  });

describe("PATCH /api/me", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("名前変更", () => {
    it("正常系: 名前を変更できる", async () => {
      mockAuth.mockResolvedValue(session as never);
      mockFindUnique.mockResolvedValue(existingUser as never);
      mockUpdate.mockResolvedValue(updatedUser as never);

      const res = await PATCH(makeRequest({ name: "新しい名前" }) as never);
      expect(res.status).toBe(200);
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: "user-1" },
        data: { name: "新しい名前" },
        select: { id: true, name: true, email: true },
      });
    });

    it("異常系: 名前が空文字は 400 を返す", async () => {
      mockAuth.mockResolvedValue(session as never);

      const res = await PATCH(makeRequest({ name: "" }) as never);
      expect(res.status).toBe(400);
    });

    it("異常系: 名前が 100 文字超は 400 を返す", async () => {
      mockAuth.mockResolvedValue(session as never);

      const res = await PATCH(makeRequest({ name: "a".repeat(101) }) as never);
      expect(res.status).toBe(400);
    });
  });

  describe("認証", () => {
    it("異常系: 未認証は 401 を返す", async () => {
      mockAuth.mockResolvedValue(null);

      const res = await PATCH(makeRequest({ name: "新しい名前" }) as never);
      expect(res.status).toBe(401);
    });
  });

  describe("バリデーション", () => {
    it("異常系: 不正 JSON は 400 を返す", async () => {
      mockAuth.mockResolvedValue(session as never);

      const res = await PATCH(makeRawRequest("not-json") as never);
      expect(res.status).toBe(400);
    });
  });
});
