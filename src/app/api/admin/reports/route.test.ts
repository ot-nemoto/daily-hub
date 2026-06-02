// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    report: {
      findFirst: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { POST } from "./route";

const VALID_API_KEY = "test-admin-key";
const ADMIN_USER = { id: "admin-1", role: "ADMIN", isActive: true };
const VALID_ITEM = {
  userName: "山田太郎",
  date: "2026-06-01",
  workContent: "作業内容",
  tomorrowPlan: "明日の予定",
  notes: "所感",
};

function makeRequest(body: unknown, apiKey?: string) {
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (apiKey !== undefined) {
    headers["authorization"] = `Bearer ${apiKey}`;
  }
  return new NextRequest("http://localhost/api/admin/reports", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

describe("POST /api/admin/reports", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("認証", () => {
    it("Authorization ヘッダーなしで 401 を返す", async () => {
      const req = new NextRequest("http://localhost/api/admin/reports", {
        method: "POST",
        body: JSON.stringify([VALID_ITEM]),
      });
      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it("Bearer スキーム以外で 401 を返す", async () => {
      const req = new NextRequest("http://localhost/api/admin/reports", {
        method: "POST",
        headers: { authorization: "Basic somekey" },
        body: JSON.stringify([VALID_ITEM]),
      });
      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it("存在しない API キーで 401 を返す", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      const res = await POST(makeRequest([VALID_ITEM], "invalid-key"));
      expect(res.status).toBe(401);
    });

    it("isActive=false のユーザーで 401 を返す", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        ...ADMIN_USER,
        isActive: false,
      } as never);
      const res = await POST(makeRequest([VALID_ITEM], VALID_API_KEY));
      expect(res.status).toBe(401);
    });
  });

  describe("認可", () => {
    it("MEMBER ロールで 403 を返す", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        ...ADMIN_USER,
        role: "MEMBER",
      } as never);
      const res = await POST(makeRequest([VALID_ITEM], VALID_API_KEY));
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toBe("このエンドポイントは ADMIN のみ使用できます");
    });

    it("VIEWER ロールで 403 を返す", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        ...ADMIN_USER,
        role: "VIEWER",
      } as never);
      const res = await POST(makeRequest([VALID_ITEM], VALID_API_KEY));
      expect(res.status).toBe(403);
    });
  });

  describe("バリデーション", () => {
    beforeEach(() => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(ADMIN_USER as never);
    });

    it("空配列で 422 を返す", async () => {
      const res = await POST(makeRequest([], VALID_API_KEY));
      expect(res.status).toBe(422);
    });

    it("配列でない場合 422 を返す", async () => {
      const res = await POST(makeRequest(VALID_ITEM, VALID_API_KEY));
      expect(res.status).toBe(422);
    });

    it("userName が空の場合 422 を返す", async () => {
      const res = await POST(makeRequest([{ ...VALID_ITEM, userName: "" }], VALID_API_KEY));
      expect(res.status).toBe(422);
    });

    it("date が YYYY-MM-DD 形式でない場合 422 を返す", async () => {
      const res = await POST(makeRequest([{ ...VALID_ITEM, date: "20260601" }], VALID_API_KEY));
      expect(res.status).toBe(422);
    });

    it("date が存在しない日付の場合 422 を返す", async () => {
      const res = await POST(makeRequest([{ ...VALID_ITEM, date: "2026-99-99" }], VALID_API_KEY));
      expect(res.status).toBe(422);
    });

    it("workContent が空の場合 422 を返す", async () => {
      const res = await POST(makeRequest([{ ...VALID_ITEM, workContent: "" }], VALID_API_KEY));
      expect(res.status).toBe(422);
    });

    it("tomorrowPlan が空の場合 422 を返す", async () => {
      const res = await POST(makeRequest([{ ...VALID_ITEM, tomorrowPlan: "" }], VALID_API_KEY));
      expect(res.status).toBe(422);
    });
  });

  describe("正常系", () => {
    beforeEach(() => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(ADMIN_USER as never);
    });

    it("既存ユーザーへの新規登録で created を返す", async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValueOnce({ id: "user-1" } as never);
      vi.mocked(prisma.report.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.report.upsert).mockResolvedValue({ id: "report-1" } as never);

      const res = await POST(makeRequest([VALID_ITEM], VALID_API_KEY));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.results).toEqual([
        { date: "2026-06-01", id: "report-1", status: "created" },
      ]);
    });

    it("既存日報への upsert で updated を返す", async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValueOnce({ id: "user-1" } as never);
      vi.mocked(prisma.report.findFirst).mockResolvedValue({ id: "report-1" } as never);
      vi.mocked(prisma.report.upsert).mockResolvedValue({ id: "report-1" } as never);

      const res = await POST(makeRequest([VALID_ITEM], VALID_API_KEY));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.results[0].status).toBe("updated");
    });

    it("存在しない userName のユーザーを自動作成して登録する", async () => {
      vi.mocked(prisma.user.findFirst)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      vi.mocked(prisma.user.create).mockResolvedValue({ id: "new-user-1" } as never);
      vi.mocked(prisma.report.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.report.upsert).mockResolvedValue({ id: "report-2" } as never);

      const res = await POST(makeRequest([VALID_ITEM], VALID_API_KEY));
      expect(res.status).toBe(200);
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: "山田太郎",
            role: "VIEWER",
          }),
        }),
      );
    });

    it("自動作成されたユーザーの email は @example.com ドメインである", async () => {
      vi.mocked(prisma.user.findFirst)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      vi.mocked(prisma.user.create).mockResolvedValue({ id: "new-user-1" } as never);
      vi.mocked(prisma.report.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.report.upsert).mockResolvedValue({ id: "report-2" } as never);

      await POST(makeRequest([VALID_ITEM], VALID_API_KEY));
      const createCall = vi.mocked(prisma.user.create).mock.calls[0][0];
      expect(createCall.data.email).toMatch(/@example\.com$/);
    });

    it("複数件を一括登録してすべての results を返す", async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue({ id: "user-1" } as never);
      vi.mocked(prisma.report.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.report.upsert)
        .mockResolvedValueOnce({ id: "report-1" } as never)
        .mockResolvedValueOnce({ id: "report-2" } as never);

      const items = [
        { ...VALID_ITEM, date: "2026-06-01" },
        { ...VALID_ITEM, date: "2026-06-02" },
      ];
      const res = await POST(makeRequest(items, VALID_API_KEY));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.results).toHaveLength(2);
    });

    it("notes が省略された場合でも 200 を返す", async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue({ id: "user-1" } as never);
      vi.mocked(prisma.report.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.report.upsert).mockResolvedValue({ id: "report-1" } as never);

      const { notes: _, ...itemWithoutNotes } = VALID_ITEM;
      const res = await POST(makeRequest([itemWithoutNotes], VALID_API_KEY));
      expect(res.status).toBe(200);
      expect(prisma.report.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ notes: "" }),
        }),
      );
    });
  });
});
