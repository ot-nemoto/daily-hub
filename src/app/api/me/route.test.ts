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
    compare: vi.fn(),
    hash: vi.fn().mockResolvedValue("hashed-new-password"),
  },
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { PATCH } from "./route";

const mockAuth = vi.mocked(auth);
const mockFindUnique = vi.mocked(prisma.user.findUnique);
const mockUpdate = vi.mocked(prisma.user.update);
const mockCompare = vi.mocked(bcrypt.compare);

const session = { user: { id: "user-1", role: "MEMBER" } };
const existingUser = {
  id: "user-1",
  name: "田中 太郎",
  email: "tanaka@example.com",
  passwordHash: "hashed-current",
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

  describe("パスワード変更", () => {
    it("正常系: パスワードを変更できる", async () => {
      mockAuth.mockResolvedValue(session as never);
      mockFindUnique.mockResolvedValue(existingUser as never);
      mockCompare.mockResolvedValue(true as never);
      mockUpdate.mockResolvedValue(updatedUser as never);

      const res = await PATCH(
        makeRequest({ currentPassword: "current123", newPassword: "newpassword1" }) as never
      );
      expect(res.status).toBe(200);
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: "user-1" },
        data: { passwordHash: "hashed-new-password" },
        select: { id: true, name: true, email: true },
      });
    });

    it("異常系: currentPassword が一致しない場合は 403 を返す", async () => {
      mockAuth.mockResolvedValue(session as never);
      mockFindUnique.mockResolvedValue(existingUser as never);
      mockCompare.mockResolvedValue(false as never);

      const res = await PATCH(
        makeRequest({ currentPassword: "wrongpassword", newPassword: "newpassword1" }) as never
      );
      expect(res.status).toBe(403);
    });

    it("異常系: newPassword が 8 文字未満は 400 を返す", async () => {
      mockAuth.mockResolvedValue(session as never);

      const res = await PATCH(
        makeRequest({ currentPassword: "current123", newPassword: "short" }) as never
      );
      expect(res.status).toBe(400);
    });

    it("異常系: newPassword のみ指定は 400 を返す", async () => {
      mockAuth.mockResolvedValue(session as never);

      const res = await PATCH(makeRequest({ newPassword: "newpassword1" }) as never);
      expect(res.status).toBe(400);
    });

    it("異常系: currentPassword のみ指定は 400 を返す", async () => {
      mockAuth.mockResolvedValue(session as never);

      const res = await PATCH(makeRequest({ currentPassword: "current123" }) as never);
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
    it("異常系: ボディが空は 400 を返す", async () => {
      mockAuth.mockResolvedValue(session as never);

      const res = await PATCH(makeRequest({}) as never);
      expect(res.status).toBe(400);
    });

    it("異常系: 不正 JSON は 400 を返す", async () => {
      mockAuth.mockResolvedValue(session as never);

      const res = await PATCH(makeRawRequest("not-json") as never);
      expect(res.status).toBe(400);
    });
  });
});
