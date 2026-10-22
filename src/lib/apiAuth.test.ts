// @vitest-environment node
import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { getAuthenticatedUser } from "./apiAuth";
import { hashApiKey } from "./apiKey";
import { buildAuditRecord } from "./auditLog";
import { prisma } from "./prisma";

const mockFindUnique = vi.mocked(prisma.user.findUnique);
const mockUpdate = vi.mocked(prisma.user.update);

/** authorization ヘッダのみを持つ最小の NextRequest スタブを生成する */
function reqWithAuth(authorization: string | null): NextRequest {
  return {
    headers: {
      get: (name: string) => (name.toLowerCase() === "authorization" ? authorization : null),
    },
  } as unknown as NextRequest;
}

const HOUR_MS = 60 * 60 * 1000;

beforeEach(() => {
  vi.clearAllMocks();
  // @ts-expect-error モックのため戻り値は参照しない
  mockUpdate.mockResolvedValue({});
});

describe("getAuthenticatedUser", () => {
  describe("正常系", () => {
    it("キーのハッシュで検索し、isActive=true のユーザーを返す", async () => {
      // @ts-expect-error モックのため一部フィールドのみ
      mockFindUnique.mockResolvedValue({
        id: "user-uuid",
        role: "MEMBER",
        isActive: true,
        apiKeyLastUsedAt: new Date(),
      });

      const result = await getAuthenticatedUser(reqWithAuth("Bearer valid-key"));

      expect(result).toEqual({ id: "user-uuid", role: "MEMBER", isActive: true });
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { apiKeyHash: await hashApiKey("valid-key") },
        select: { id: true, role: true, isActive: true, apiKeyLastUsedAt: true },
      });
    });

    it("キー前後の空白を除去して検索する", async () => {
      // @ts-expect-error モックのため一部フィールドのみ
      mockFindUnique.mockResolvedValue({
        id: "user-uuid",
        role: "ADMIN",
        isActive: true,
        apiKeyLastUsedAt: new Date(),
      });

      const result = await getAuthenticatedUser(reqWithAuth("Bearer   spaced-key  "));

      expect(result?.role).toBe("ADMIN");
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { apiKeyHash: await hashApiKey("spaced-key") },
        select: { id: true, role: true, isActive: true, apiKeyLastUsedAt: true },
      });
    });

    it("移行した旧書式（UUID）のキーも受け付ける", async () => {
      const legacyKey = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
      // @ts-expect-error モックのため一部フィールドのみ
      mockFindUnique.mockResolvedValue({
        id: "user-uuid",
        role: "MEMBER",
        isActive: true,
        apiKeyLastUsedAt: new Date(),
      });

      const result = await getAuthenticatedUser(reqWithAuth(`Bearer ${legacyKey}`));

      expect(result?.id).toBe("user-uuid");
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { apiKeyHash: await hashApiKey(legacyKey) },
        select: { id: true, role: true, isActive: true, apiKeyLastUsedAt: true },
      });
    });
  });

  describe("apiKeyLastUsedAt の更新", () => {
    it("未使用（null）なら更新する", async () => {
      // @ts-expect-error モックのため一部フィールドのみ
      mockFindUnique.mockResolvedValue({
        id: "user-uuid",
        role: "MEMBER",
        isActive: true,
        apiKeyLastUsedAt: null,
      });

      await getAuthenticatedUser(reqWithAuth("Bearer key"));

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: "user-uuid" },
        data: { apiKeyLastUsedAt: expect.any(Date) },
      });
    });

    it("前回更新から 1 時間以上経過していれば更新する", async () => {
      // @ts-expect-error モックのため一部フィールドのみ
      mockFindUnique.mockResolvedValue({
        id: "user-uuid",
        role: "MEMBER",
        isActive: true,
        apiKeyLastUsedAt: new Date(Date.now() - HOUR_MS - 1000),
      });

      await getAuthenticatedUser(reqWithAuth("Bearer key"));

      expect(mockUpdate).toHaveBeenCalledTimes(1);
    });

    it("前回更新から 1 時間未満なら更新しない", async () => {
      // @ts-expect-error モックのため一部フィールドのみ
      mockFindUnique.mockResolvedValue({
        id: "user-uuid",
        role: "MEMBER",
        isActive: true,
        apiKeyLastUsedAt: new Date(Date.now() - 60 * 1000),
      });

      await getAuthenticatedUser(reqWithAuth("Bearer key"));

      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it("更新が失敗しても認証結果を返す（棚卸し用の付随情報のため）", async () => {
      // @ts-expect-error モックのため一部フィールドのみ
      mockFindUnique.mockResolvedValue({
        id: "user-uuid",
        role: "MEMBER",
        isActive: true,
        apiKeyLastUsedAt: null,
      });
      mockUpdate.mockRejectedValue(new Error("connection error"));

      const result = await getAuthenticatedUser(reqWithAuth("Bearer key"));

      expect(result).toEqual({ id: "user-uuid", role: "MEMBER", isActive: true });
    });
  });

  describe("境界・異常系", () => {
    it("Authorization ヘッダが無い場合は null を返し DB を参照しない", async () => {
      const result = await getAuthenticatedUser(reqWithAuth(null));

      expect(result).toBeNull();
      expect(mockFindUnique).not.toHaveBeenCalled();
    });

    it("Bearer 以外のスキームの場合は null を返し DB を参照しない", async () => {
      const result = await getAuthenticatedUser(reqWithAuth("Basic dXNlcjpwYXNz"));

      expect(result).toBeNull();
      expect(mockFindUnique).not.toHaveBeenCalled();
    });

    it("Bearer の後のキーが空白のみの場合は null を返し DB を参照しない", async () => {
      const result = await getAuthenticatedUser(reqWithAuth("Bearer    "));

      expect(result).toBeNull();
      expect(mockFindUnique).not.toHaveBeenCalled();
    });

    it("該当するユーザーが存在しない（未知のキー）場合は null を返し更新もしない", async () => {
      mockFindUnique.mockResolvedValue(null);

      const result = await getAuthenticatedUser(reqWithAuth("Bearer unknown-key"));

      expect(result).toBeNull();
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it("ユーザーが isActive=false の場合は null を返し更新もしない", async () => {
      // @ts-expect-error モックのため一部フィールドのみ
      mockFindUnique.mockResolvedValue({
        id: "user-uuid",
        role: "MEMBER",
        isActive: false,
        apiKeyLastUsedAt: null,
      });

      const result = await getAuthenticatedUser(reqWithAuth("Bearer inactive-key"));

      expect(result).toBeNull();
      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });
});

// 監査ログのラッパーは認証ユーザーを知らないため、getAuthenticatedUser が
// Request インスタンスをキーに受け渡す。その経路を固定する。
describe("監査ログへの userId 受け渡し", () => {
  it("正常系: 認証が通ったユーザーが監査レコードに載る", async () => {
    // @ts-expect-error モックのため一部フィールドのみ
    mockFindUnique.mockResolvedValue({
      id: "user-uuid",
      role: "MEMBER",
      isActive: true,
      apiKeyLastUsedAt: new Date(),
    });
    const req = new Request("https://example.com/api/reports", {
      headers: { authorization: "Bearer valid-key" },
    });

    await getAuthenticatedUser(req as unknown as NextRequest);

    expect(buildAuditRecord(req, 200).userId).toBe("user-uuid");
  });

  // 退職者の未失効キーが漏洩した場合と、当てずっぽうの総当たりを
  // ログ上で区別できるようにする。サーバーは「誰のキーか」を知っている。
  it("異常系: 無効化済みユーザーのキーでも userId を記録する（401 は変わらない）", async () => {
    // @ts-expect-error モックのため一部フィールドのみ
    mockFindUnique.mockResolvedValue({
      id: "deactivated-user",
      role: "MEMBER",
      isActive: false,
      apiKeyLastUsedAt: new Date(),
    });
    const req = new Request("https://example.com/api/reports", {
      headers: { authorization: "Bearer deactivated-key" },
    });

    const result = await getAuthenticatedUser(req as unknown as NextRequest);

    expect(result).toBeNull();
    expect(buildAuditRecord(req, 401).userId).toBe("deactivated-user");
  });

  it("異常系: 認証が通らなければ userId は null のまま", async () => {
    mockFindUnique.mockResolvedValue(null);
    const req = new Request("https://example.com/api/reports", {
      headers: { authorization: "Bearer invalid-key" },
    });

    await getAuthenticatedUser(req as unknown as NextRequest);

    expect(buildAuditRecord(req, 401).userId).toBeNull();
  });
});
