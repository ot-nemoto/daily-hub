// @vitest-environment node
import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

import { getAuthenticatedUser } from "./apiAuth";
import { prisma } from "./prisma";

const mockFindUnique = vi.mocked(prisma.user.findUnique);

/** authorization ヘッダのみを持つ最小の NextRequest スタブを生成する */
function reqWithAuth(authorization: string | null): NextRequest {
  return {
    headers: {
      get: (name: string) => (name.toLowerCase() === "authorization" ? authorization : null),
    },
  } as unknown as NextRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getAuthenticatedUser", () => {
  describe("正常系", () => {
    it("有効な apiKey かつ isActive=true のユーザーを返す", async () => {
      // @ts-expect-error モックのため一部フィールドのみ
      mockFindUnique.mockResolvedValue({ id: "user-uuid", role: "MEMBER", isActive: true });

      const result = await getAuthenticatedUser(reqWithAuth("Bearer valid-key"));

      expect(result).toEqual({ id: "user-uuid", role: "MEMBER", isActive: true });
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { apiKey: "valid-key" },
        select: { id: true, role: true, isActive: true },
      });
    });

    it("キー前後の空白を除去して検索する", async () => {
      // @ts-expect-error モックのため一部フィールドのみ
      mockFindUnique.mockResolvedValue({ id: "user-uuid", role: "ADMIN", isActive: true });

      const result = await getAuthenticatedUser(reqWithAuth("Bearer   spaced-key  "));

      expect(result?.role).toBe("ADMIN");
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { apiKey: "spaced-key" },
        select: { id: true, role: true, isActive: true },
      });
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

    it("該当するユーザーが存在しない（未知のキー）場合は null を返す", async () => {
      mockFindUnique.mockResolvedValue(null);

      const result = await getAuthenticatedUser(reqWithAuth("Bearer unknown-key"));

      expect(result).toBeNull();
    });

    it("ユーザーが isActive=false の場合は null を返す", async () => {
      // @ts-expect-error モックのため一部フィールドのみ
      mockFindUnique.mockResolvedValue({ id: "user-uuid", role: "MEMBER", isActive: false });

      const result = await getAuthenticatedUser(reqWithAuth("Bearer inactive-key"));

      expect(result).toBeNull();
    });
  });
});
