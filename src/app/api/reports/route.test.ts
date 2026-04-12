// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ConflictError } from "@/lib/errors";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/reports", () => ({
  createReport: vi.fn(),
}));

import { prisma } from "@/lib/prisma";
import { createReport } from "@/lib/reports";
import { POST } from "./route";

const VALID_API_KEY = "test-api-key";
const VALID_USER = { id: "user-1", role: "MEMBER", isActive: true };
const VALID_BODY = {
  date: "2026-04-12",
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
  return new NextRequest("http://localhost/api/reports", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

describe("POST /api/reports", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("認証", () => {
    it("Authorization ヘッダーなしで 401 を返す", async () => {
      const req = new NextRequest("http://localhost/api/reports", {
        method: "POST",
        body: JSON.stringify(VALID_BODY),
      });
      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it("Bearer スキーム以外で 401 を返す", async () => {
      const req = new NextRequest("http://localhost/api/reports", {
        method: "POST",
        headers: { authorization: "Basic somekey" },
        body: JSON.stringify(VALID_BODY),
      });
      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it("存在しない API キーで 401 を返す", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      const res = await POST(makeRequest(VALID_BODY, "invalid-key"));
      expect(res.status).toBe(401);
    });

    it("isActive=false のユーザーで 401 を返す", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        ...VALID_USER,
        isActive: false,
      } as never);
      const res = await POST(makeRequest(VALID_BODY, VALID_API_KEY));
      expect(res.status).toBe(401);
    });
  });

  describe("認可", () => {
    it("VIEWER ロールで 403 を返す", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        ...VALID_USER,
        role: "VIEWER",
      } as never);
      const res = await POST(makeRequest(VALID_BODY, VALID_API_KEY));
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toBe("日報を作成する権限がありません");
    });
  });

  describe("バリデーション", () => {
    beforeEach(() => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(VALID_USER as never);
    });

    it("date が YYYY-MM-DD 形式でない場合 422 を返す", async () => {
      const res = await POST(makeRequest({ ...VALID_BODY, date: "20260412" }, VALID_API_KEY));
      expect(res.status).toBe(422);
    });

    it("workContent が空の場合 422 を返す", async () => {
      const res = await POST(makeRequest({ ...VALID_BODY, workContent: "" }, VALID_API_KEY));
      expect(res.status).toBe(422);
    });

    it("tomorrowPlan が空の場合 422 を返す", async () => {
      const res = await POST(makeRequest({ ...VALID_BODY, tomorrowPlan: "" }, VALID_API_KEY));
      expect(res.status).toBe(422);
    });

    it("notes が省略された場合でも 201 を返す（デフォルト空文字）", async () => {
      vi.mocked(createReport).mockResolvedValue({ id: "report-1" });
      const { notes: _, ...bodyWithoutNotes } = VALID_BODY;
      const res = await POST(makeRequest(bodyWithoutNotes, VALID_API_KEY));
      expect(res.status).toBe(201);
      expect(createReport).toHaveBeenCalledWith(expect.objectContaining({ notes: "" }));
    });
  });

  describe("正常系", () => {
    beforeEach(() => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(VALID_USER as never);
    });

    it("正常系: 日報を作成して 201 と id を返す", async () => {
      vi.mocked(createReport).mockResolvedValue({ id: "report-1" });
      const res = await POST(makeRequest(VALID_BODY, VALID_API_KEY));
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json).toEqual({ id: "report-1" });
      expect(createReport).toHaveBeenCalledWith({
        date: new Date("2026-04-12T00:00:00.000Z"),
        workContent: "作業内容",
        tomorrowPlan: "明日の予定",
        notes: "所感",
        authorId: "user-1",
      });
    });

    it("ADMIN ロールでも日報を作成できる", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        ...VALID_USER,
        role: "ADMIN",
      } as never);
      vi.mocked(createReport).mockResolvedValue({ id: "report-2" });
      const res = await POST(makeRequest(VALID_BODY, VALID_API_KEY));
      expect(res.status).toBe(201);
    });
  });

  describe("エラー系", () => {
    beforeEach(() => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(VALID_USER as never);
    });

    it("同日の日報が既存の場合 409 を返す", async () => {
      vi.mocked(createReport).mockRejectedValue(new ConflictError());
      const res = await POST(makeRequest(VALID_BODY, VALID_API_KEY));
      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.error).toBe("この日付の日報はすでに作成済みです");
    });
  });
});
