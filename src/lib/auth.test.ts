// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
  currentUser: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => { throw new Error(`NEXT_REDIRECT:${url}`); }),
}));

vi.mock("./prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "./prisma";
import { getSession } from "./auth";

const mockAuth = vi.mocked(auth);
const mockCurrentUser = vi.mocked(currentUser);
const mockFindUnique = vi.mocked(prisma.user.findUnique);
const mockUpdateMany = vi.mocked(prisma.user.updateMany);
const mockCreate = vi.mocked(prisma.user.create);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getSession", () => {
  describe("MOCK_USER_ID モード（非本番環境）", () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv, NODE_ENV: "development", MOCK_USER_ID: "mock-user-id" };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it("MOCK_USER_ID に対応する DB ユーザーのセッションを返す", async () => {
      // @ts-ignore
      mockFindUnique.mockResolvedValue({ id: "mock-user-id", name: "モックユーザー", role: "MEMBER", isActive: true });

      const result = await getSession();
      expect(result).toEqual({
        user: { id: "mock-user-id", name: "モックユーザー", role: "MEMBER", isActive: true },
      });
      expect(mockAuth).not.toHaveBeenCalled();
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { id: "mock-user-id" },
        select: { id: true, name: true, role: true, isActive: true },
      });
    });

    it("MOCK_USER_ID に対応する DB ユーザーが存在しない場合は null を返す", async () => {
      // @ts-ignore
      mockFindUnique.mockResolvedValue(null);

      const result = await getSession();
      expect(result).toBeNull();
      expect(mockAuth).not.toHaveBeenCalled();
    });
  });

  it("Clerk にユーザーがいない場合は null を返す", async () => {
    // @ts-ignore
    mockAuth.mockResolvedValue({ userId: null });

    const result = await getSession();
    expect(result).toBeNull();
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  it("正常系: clerkId に対応する DB ユーザーが存在する場合はセッションを返す", async () => {
    // @ts-ignore
    mockAuth.mockResolvedValue({ userId: "clerk-abc123" });
    // @ts-ignore
    mockFindUnique.mockResolvedValue({ id: "user-uuid", name: "テストユーザー", role: "MEMBER", isActive: true });

    const result = await getSession();
    expect(result).toEqual({
      user: { id: "user-uuid", name: "テストユーザー", role: "MEMBER", isActive: true },
    });
    expect(mockCurrentUser).not.toHaveBeenCalled();
  });

  it("ADMIN ロールのユーザーも正しく返す", async () => {
    // @ts-ignore
    mockAuth.mockResolvedValue({ userId: "clerk-admin123" });
    // @ts-ignore
    mockFindUnique.mockResolvedValue({ id: "admin-uuid", name: "管理者", role: "ADMIN", isActive: true });

    const result = await getSession();
    expect(result?.user.role).toBe("ADMIN");
  });

  describe("初回ログイン時の clerkId 自動紐付け", () => {
    it("メールアドレスが一致する DB ユーザーに clerkId を紐付けてセッションを返す", async () => {
      // @ts-ignore
      mockAuth.mockResolvedValue({ userId: "clerk-new123" });
      // @ts-ignore
      mockFindUnique
        .mockResolvedValueOnce(null) // clerkId 検索 → 未ヒット
        // @ts-ignore
        .mockResolvedValueOnce({ id: "user-uuid", name: "田中太郎", role: "MEMBER", isActive: true, clerkId: null }) // email 検索
        // @ts-ignore
        .mockResolvedValueOnce({ id: "user-uuid", name: "田中太郎", role: "MEMBER", isActive: true }); // updateMany 後の再取得
      // @ts-ignore
      mockCurrentUser.mockResolvedValue({
        primaryEmailAddress: { emailAddress: "tanaka@example.com" },
        fullName: null,
        firstName: null,
      });
      // @ts-ignore
      mockUpdateMany.mockResolvedValue({ count: 1 });

      const result = await getSession();
      expect(result).toEqual({
        user: { id: "user-uuid", name: "田中太郎", role: "MEMBER", isActive: true },
      });
      expect(mockUpdateMany).toHaveBeenCalledWith({
        where: { email: "tanaka@example.com", clerkId: null },
        data: { clerkId: "clerk-new123" },
      });
    });

    it("並行リクエストで先に clerkId が紐付け済みの場合は既存レコードを返す", async () => {
      // @ts-ignore
      mockAuth.mockResolvedValue({ userId: "clerk-new123" });
      // @ts-ignore
      mockFindUnique
        .mockResolvedValueOnce(null) // clerkId 検索 → 未ヒット
        // @ts-ignore
        .mockResolvedValueOnce({ id: "user-uuid", name: "田中太郎", role: "MEMBER", isActive: true, clerkId: null }) // email 検索
        // @ts-ignore
        .mockResolvedValueOnce({ id: "user-uuid", name: "田中太郎", role: "MEMBER", isActive: true }); // count=0 後の再取得
      // @ts-ignore
      mockCurrentUser.mockResolvedValue({
        primaryEmailAddress: { emailAddress: "tanaka@example.com" },
        fullName: null,
        firstName: null,
      });
      // @ts-ignore
      mockUpdateMany.mockResolvedValue({ count: 0 }); // 別リクエストが先に紐付け済み

      const result = await getSession();
      expect(result).toEqual({
        user: { id: "user-uuid", name: "田中太郎", role: "MEMBER", isActive: true },
      });
    });

    it("DB に存在しない新規サインアップユーザーを自動作成してセッションを返す", async () => {
      // @ts-ignore
      mockAuth.mockResolvedValue({ userId: "clerk-new123" });
      // @ts-ignore
      mockFindUnique
        .mockResolvedValueOnce(null) // clerkId 検索 → 未ヒット
        .mockResolvedValueOnce(null); // email 検索 → 未ヒット
      // @ts-ignore
      mockCurrentUser.mockResolvedValue({
        primaryEmailAddress: { emailAddress: "new@example.com" },
        fullName: "新規ユーザー",
        firstName: null,
      });
      // @ts-ignore
      mockCreate.mockResolvedValue({ id: "new-uuid", name: "新規ユーザー", role: "MEMBER", isActive: true });

      const result = await getSession();
      expect(result).toEqual({
        user: { id: "new-uuid", name: "新規ユーザー", role: "MEMBER", isActive: true },
      });
      expect(mockCreate).toHaveBeenCalledWith({
        data: { clerkId: "clerk-new123", email: "new@example.com", name: "新規ユーザー", role: "MEMBER" },
        select: { id: true, name: true, role: true, isActive: true },
      });
      expect(mockUpdateMany).not.toHaveBeenCalled();
    });

    it("isActive=false のユーザーは null を返す", async () => {
      // @ts-ignore
      mockAuth.mockResolvedValue({ userId: "clerk-inactive" });
      // @ts-ignore
      mockFindUnique.mockResolvedValue({ id: "user-uuid", name: "無効ユーザー", role: "MEMBER", isActive: false });

      const result = await getSession();
      expect(result).toBeNull();
    });

    it("既に別の clerkId に紐付き済みの DB ユーザーは /auth-error にリダイレクトする", async () => {
      // @ts-ignore
      mockAuth.mockResolvedValue({ userId: "clerk-new123" });
      // @ts-ignore
      mockFindUnique
        .mockResolvedValueOnce(null) // clerkId 検索 → 未ヒット
        // @ts-ignore
        .mockResolvedValueOnce({ id: "user-uuid", name: "田中太郎", role: "MEMBER", isActive: true, clerkId: "clerk-other" }); // email 検索 → 別IDに紐付き済み
      // @ts-ignore
      mockCurrentUser.mockResolvedValue({
        primaryEmailAddress: { emailAddress: "tanaka@example.com" },
        fullName: null,
        firstName: null,
      });

      await expect(getSession()).rejects.toThrow("NEXT_REDIRECT:/auth-error");
      expect(mockUpdateMany).not.toHaveBeenCalled();
    });

    it("Clerk のメールアドレスが取得できない場合は null を返す", async () => {
      // @ts-ignore
      mockAuth.mockResolvedValue({ userId: "clerk-new123" });
      // @ts-ignore
      mockFindUnique.mockResolvedValueOnce(null);
      // @ts-ignore
      mockCurrentUser.mockResolvedValue({ primaryEmailAddress: null });

      const result = await getSession();
      expect(result).toBeNull();
      expect(mockUpdateMany).not.toHaveBeenCalled();
    });
  });
});
