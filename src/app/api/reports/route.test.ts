// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ConflictError } from "@/lib/errors";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    report: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/reports", () => ({
  createReport: vi.fn(),
  upsertReportByAuthorId: vi.fn(),
}));

import { prisma } from "@/lib/prisma";
import { createReport, upsertReportByAuthorId } from "@/lib/reports";
import { GET, POST } from "./route";

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
    headers.authorization = `Bearer ${apiKey}`;
  }
  return new NextRequest("http://localhost/api/reports", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

function makeGetRequest(params: Record<string, string> = {}, apiKey?: string) {
  const url = new URL("http://localhost/api/reports");
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  const headers: Record<string, string> = {};
  if (apiKey !== undefined) {
    headers.authorization = `Bearer ${apiKey}`;
  }
  return new NextRequest(url.toString(), { method: "GET", headers });
}

// ----------------------------------------------------------------
// GET /api/reports
// ----------------------------------------------------------------
describe("GET /api/reports", () => {
  beforeEach(() => vi.clearAllMocks());

  const MOCK_REPORT = {
    id: "report-1",
    date: new Date("2026-06-01T00:00:00.000Z"),
    authorId: "user-1",
    author: { name: "山田太郎" },
    workContent: "作業内容",
    tomorrowPlan: "明日の予定",
    notes: "所感",
  };

  describe("認証", () => {
    it("Authorization ヘッダーなしで 401 を返す", async () => {
      const res = await GET(new NextRequest("http://localhost/api/reports", { method: "GET" }));
      expect(res.status).toBe(401);
    });

    it("Bearer スキーム以外で 401 を返す", async () => {
      const res = await GET(
        new NextRequest("http://localhost/api/reports", {
          method: "GET",
          headers: { authorization: "Basic somekey" },
        }),
      );
      expect(res.status).toBe(401);
    });

    it("存在しない API キーで 401 を返す", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      const res = await GET(makeGetRequest({}, "invalid-key"));
      expect(res.status).toBe(401);
    });

    it("isActive=false のユーザーで 401 を返す", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        ...VALID_USER,
        isActive: false,
      } as never);
      const res = await GET(makeGetRequest({}, VALID_API_KEY));
      expect(res.status).toBe(401);
    });
  });

  describe("バリデーション", () => {
    beforeEach(() => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(VALID_USER as never);
    });

    it("date が不正形式の場合 422 を返す", async () => {
      const res = await GET(makeGetRequest({ date: "20260601" }, VALID_API_KEY));
      expect(res.status).toBe(422);
    });

    it("date が実在しない日付の場合 422 を返す", async () => {
      const res = await GET(makeGetRequest({ date: "2026-99-99" }, VALID_API_KEY));
      expect(res.status).toBe(422);
    });

    it("from だけ指定した場合 422 を返す", async () => {
      const res = await GET(makeGetRequest({ from: "2026-06-01" }, VALID_API_KEY));
      expect(res.status).toBe(422);
    });

    it("to だけ指定した場合 422 を返す", async () => {
      const res = await GET(makeGetRequest({ to: "2026-06-30" }, VALID_API_KEY));
      expect(res.status).toBe(422);
    });

    it("from が不正形式の場合 422 を返す", async () => {
      const res = await GET(
        makeGetRequest({ from: "20260601", to: "2026-06-30" }, VALID_API_KEY),
      );
      expect(res.status).toBe(422);
    });

    it("to が不正形式の場合 422 を返す", async () => {
      const res = await GET(
        makeGetRequest({ from: "2026-06-01", to: "20260630" }, VALID_API_KEY),
      );
      expect(res.status).toBe(422);
    });
  });

  describe("正常系", () => {
    beforeEach(() => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(VALID_USER as never);
      vi.mocked(prisma.report.findMany).mockResolvedValue([MOCK_REPORT] as never);
    });

    it("パラメータなしで 200 と reports を返す", async () => {
      const res = await GET(makeGetRequest({}, VALID_API_KEY));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.reports).toHaveLength(1);
      expect(json.reports[0]).toEqual({
        id: "report-1",
        date: "2026-06-01",
        authorId: "user-1",
        authorName: "山田太郎",
        workContent: "作業内容",
        tomorrowPlan: "明日の予定",
        notes: "所感",
      });
    });

    it("date 指定で findMany に日付フィルターが渡される", async () => {
      const res = await GET(makeGetRequest({ date: "2026-06-01" }, VALID_API_KEY));
      expect(res.status).toBe(200);
      expect(prisma.report.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            date: new Date("2026-06-01T00:00:00.000Z"),
          }),
        }),
      );
    });

    it("from/to 指定で findMany に期間フィルターが渡される", async () => {
      const res = await GET(
        makeGetRequest({ from: "2026-06-01", to: "2026-06-30" }, VALID_API_KEY),
      );
      expect(res.status).toBe(200);
      expect(prisma.report.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            date: {
              gte: new Date("2026-06-01T00:00:00.000Z"),
              lte: new Date("2026-06-30T00:00:00.000Z"),
            },
          }),
        }),
      );
    });

    it("authorId 指定で findMany に authorId フィルターが渡される", async () => {
      const res = await GET(makeGetRequest({ authorId: "user-1" }, VALID_API_KEY));
      expect(res.status).toBe(200);
      expect(prisma.report.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ authorId: "user-1" }),
        }),
      );
    });

    it("日報なしの場合は空配列を返す", async () => {
      vi.mocked(prisma.report.findMany).mockResolvedValue([] as never);
      const res = await GET(makeGetRequest({}, VALID_API_KEY));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.reports).toEqual([]);
    });

    it("VIEWER ロールでも参照できる", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        ...VALID_USER,
        role: "VIEWER",
      } as never);
      const res = await GET(makeGetRequest({}, VALID_API_KEY));
      expect(res.status).toBe(200);
    });
  });
});

// ----------------------------------------------------------------
// POST /api/reports
// ----------------------------------------------------------------
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

    it("date が存在しない日付の場合 422 を返す", async () => {
      const res = await POST(makeRequest({ ...VALID_BODY, date: "2026-99-99" }, VALID_API_KEY));
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

// ----------------------------------------------------------------
// POST /api/reports（一括登録）
// ----------------------------------------------------------------
describe("POST /api/reports（一括登録）", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.user.findUnique).mockResolvedValue(VALID_USER as never);
  });

  it("空配列で 422 を返す", async () => {
    const res = await POST(makeRequest([], VALID_API_KEY));
    expect(res.status).toBe(422);
  });

  it("配列 1件で 200 と results を返す", async () => {
    vi.mocked(upsertReportByAuthorId).mockResolvedValue({ id: "report-1", status: "created" });
    const res = await POST(makeRequest([VALID_BODY], VALID_API_KEY));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.results).toEqual([{ date: "2026-04-12", id: "report-1", status: "created" }]);
  });

  it("配列 複数件で 200 と全 results を返す", async () => {
    vi.mocked(upsertReportByAuthorId)
      .mockResolvedValueOnce({ id: "report-1", status: "created" })
      .mockResolvedValueOnce({ id: "report-2", status: "created" });

    const items = [
      { ...VALID_BODY, date: "2026-04-12" },
      { ...VALID_BODY, date: "2026-04-13" },
    ];
    const res = await POST(makeRequest(items, VALID_API_KEY));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.results).toHaveLength(2);
  });

  it("既存日報がある日付で updated を返す", async () => {
    vi.mocked(upsertReportByAuthorId).mockResolvedValue({ id: "report-1", status: "updated" });
    const res = await POST(makeRequest([VALID_BODY], VALID_API_KEY));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.results[0].status).toBe("updated");
  });

  it("upsertReportByAuthorId を正しい引数で呼び出す", async () => {
    vi.mocked(upsertReportByAuthorId).mockResolvedValue({ id: "report-1", status: "created" });
    await POST(makeRequest([VALID_BODY], VALID_API_KEY));
    expect(upsertReportByAuthorId).toHaveBeenCalledWith({
      authorId: "user-1",
      date: new Date("2026-04-12T00:00:00.000Z"),
      workContent: "作業内容",
      tomorrowPlan: "明日の予定",
      notes: "所感",
    });
  });

  it("VIEWER ロールで 403 を返す", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      ...VALID_USER,
      role: "VIEWER",
    } as never);
    const res = await POST(makeRequest([VALID_BODY], VALID_API_KEY));
    expect(res.status).toBe(403);
  });

  it("配列内の date が不正形式の場合 422 を返す", async () => {
    const res = await POST(makeRequest([{ ...VALID_BODY, date: "20260412" }], VALID_API_KEY));
    expect(res.status).toBe(422);
  });
});
