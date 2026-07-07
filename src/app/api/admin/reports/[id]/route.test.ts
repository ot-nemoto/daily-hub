// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/reports", () => ({
  deleteReportById: vi.fn(),
}));

import { NotFoundError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { deleteReportById } from "@/lib/reports";
import { DELETE } from "./route";

const VALID_API_KEY = "test-admin-key";
const ADMIN_USER = { id: "admin-1", role: "ADMIN", isActive: true };
const REPORT_ID = "report-1";

function makeRequest(apiKey?: string) {
  const headers: Record<string, string> = {};
  if (apiKey !== undefined) {
    headers.authorization = `Bearer ${apiKey}`;
  }
  return new NextRequest(`http://localhost/api/admin/reports/${REPORT_ID}`, {
    method: "DELETE",
    headers,
  });
}

function makeParams(id = REPORT_ID) {
  return { params: Promise.resolve({ id }) };
}

describe("DELETE /api/admin/reports/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("認証", () => {
    it("Authorization ヘッダーなしで 401 を返す", async () => {
      const res = await DELETE(makeRequest(), makeParams());
      expect(res.status).toBe(401);
      expect(deleteReportById).not.toHaveBeenCalled();
    });

    it("Bearer スキーム以外で 401 を返す", async () => {
      const req = new NextRequest(`http://localhost/api/admin/reports/${REPORT_ID}`, {
        method: "DELETE",
        headers: { authorization: "Basic somekey" },
      });
      const res = await DELETE(req, makeParams());
      expect(res.status).toBe(401);
    });

    it("空の API キーで 401 を返す", async () => {
      const res = await DELETE(makeRequest(""), makeParams());
      expect(res.status).toBe(401);
    });

    it("存在しない API キーで 401 を返す", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      const res = await DELETE(makeRequest("invalid-key"), makeParams());
      expect(res.status).toBe(401);
    });

    it("isActive=false のユーザーで 401 を返す", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        ...ADMIN_USER,
        isActive: false,
      } as never);
      const res = await DELETE(makeRequest(VALID_API_KEY), makeParams());
      expect(res.status).toBe(401);
    });
  });

  describe("認可", () => {
    it("MEMBER ロールで 403 を返す", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        ...ADMIN_USER,
        role: "MEMBER",
      } as never);
      const res = await DELETE(makeRequest(VALID_API_KEY), makeParams());
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toBe("このエンドポイントは ADMIN のみ使用できます");
      expect(deleteReportById).not.toHaveBeenCalled();
    });

    it("VIEWER ロールで 403 を返す", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        ...ADMIN_USER,
        role: "VIEWER",
      } as never);
      const res = await DELETE(makeRequest(VALID_API_KEY), makeParams());
      expect(res.status).toBe(403);
    });
  });

  describe("正常系", () => {
    beforeEach(() => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(ADMIN_USER as never);
    });

    it("削除成功で 204 を返す", async () => {
      vi.mocked(deleteReportById).mockResolvedValue();
      const res = await DELETE(makeRequest(VALID_API_KEY), makeParams());
      expect(res.status).toBe(204);
    });

    it("deleteReportById をパスパラメータの id で呼び出す", async () => {
      vi.mocked(deleteReportById).mockResolvedValue();
      await DELETE(makeRequest(VALID_API_KEY), makeParams("report-xyz"));
      expect(deleteReportById).toHaveBeenCalledWith({ id: "report-xyz" });
    });
  });

  describe("異常系", () => {
    beforeEach(() => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(ADMIN_USER as never);
    });

    it("存在しない日報で 404 を返す", async () => {
      vi.mocked(deleteReportById).mockRejectedValue(new NotFoundError("Report not found"));
      const res = await DELETE(makeRequest(VALID_API_KEY), makeParams());
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error).toBe("指定された日報が見つかりません");
    });
  });
});
