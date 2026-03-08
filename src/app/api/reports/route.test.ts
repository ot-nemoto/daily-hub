// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";
import { GET, POST } from "./route";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    report: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

const mockSession = { user: { id: "user-1", name: "山田 太郎", email: "yamada@example.com" } };
const mockReport = {
  id: "report-1",
  date: new Date("2026-03-06T00:00:00.000Z"),
  workContent: "○○機能の実装",
  tomorrowPlan: "レビュー対応",
  notes: "DBの設計で詰まった",
  authorId: "user-1",
  createdAt: new Date(),
  updatedAt: new Date(),
};
const mockReportListItem = {
  id: "report-1",
  date: new Date("2026-03-06T00:00:00.000Z"),
  workContent: "○○機能の実装",
  tomorrowPlan: "レビュー対応",
  notes: "",
  authorId: "user-1",
  createdAt: new Date("2026-03-06T12:00:00.000Z"),
  updatedAt: new Date("2026-03-06T18:00:00.000Z"),
  author: { id: "user-1", name: "山田 太郎" },
  _count: { comments: 2 },
};

function makePostRequest(body: unknown) {
  return new Request("http://localhost/api/reports", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeGetRequest(params: Record<string, string>) {
  const url = new URL("http://localhost/api/reports");
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return new Request(url.toString(), { method: "GET" });
}

const validPostBody = {
  date: "2026-03-06",
  workContent: "○○機能の実装",
  tomorrowPlan: "レビュー対応",
  notes: "DBの設計で詰まった",
};

describe("GET /api/reports (日次ビュー: T40)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("正常系: date パラメータで 200 とレポート一覧を返す", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(prisma.report.findMany).mockResolvedValue([mockReportListItem] as never);

    const res = await GET(makeGetRequest({ date: "2026-03-06" }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveLength(1);
    expect(data[0]).toMatchObject({
      id: "report-1",
      date: "2026-03-06",
      commentCount: 2,
      author: { id: "user-1", name: "山田 太郎" },
    });
    expect(prisma.report.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { date: new Date("2026-03-06T00:00:00.000Z") },
      }),
    );
  });

  it("正常系: date + userId パラメータでユーザー絞り込みクエリを実行する", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(prisma.report.findMany).mockResolvedValue([mockReportListItem] as never);

    await GET(makeGetRequest({ date: "2026-03-06", userId: "user-1" }));

    expect(prisma.report.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { date: new Date("2026-03-06T00:00:00.000Z"), authorId: "user-1" },
      }),
    );
  });

  it("異常系: 未認証で 401 を返す", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth).mockResolvedValue(null as never);

    const res = await GET(makeGetRequest({ date: "2026-03-06" }));

    expect(res.status).toBe(401);
    expect(prisma.report.findMany).not.toHaveBeenCalled();
  });

  it("異常系: date が不正な形式で 400 を返す", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth).mockResolvedValue(mockSession as never);

    const res = await GET(makeGetRequest({ date: "20260306" }));

    expect(res.status).toBe(400);
  });
});

describe("GET /api/reports (月次ビュー: T41)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("正常系: from/to パラメータで 200 とレポート一覧を返す", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(prisma.report.findMany).mockResolvedValue([mockReportListItem] as never);

    const res = await GET(makeGetRequest({ from: "2026-03-01", to: "2026-03-31" }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveLength(1);
    expect(prisma.report.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          date: {
            gte: new Date("2026-03-01T00:00:00.000Z"),
            lte: new Date("2026-03-31T00:00:00.000Z"),
          },
        },
      }),
    );
  });

  it("正常系: from/to + authorId パラメータでユーザー絞り込みクエリを実行する", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(prisma.report.findMany).mockResolvedValue([mockReportListItem] as never);

    await GET(makeGetRequest({ from: "2026-03-01", to: "2026-03-31", authorId: "user-1" }));

    expect(prisma.report.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ authorId: "user-1" }),
      }),
    );
  });

  it("異常系: from が不正な形式で 400 を返す", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth).mockResolvedValue(mockSession as never);

    const res = await GET(makeGetRequest({ from: "2026-99-01", to: "2026-03-31" }));

    expect(res.status).toBe(400);
  });

  it("異常系: クエリパラメータなしで 400 を返す", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth).mockResolvedValue(mockSession as never);

    const res = await GET(new Request("http://localhost/api/reports", { method: "GET" }));

    expect(res.status).toBe(400);
  });
});

describe("POST /api/reports", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("正常系: 有効な入力で 201 と id を返す", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(prisma.report.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.report.create).mockResolvedValue(mockReport);

    const res = await POST(makePostRequest(validPostBody));
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data).toEqual({ id: "report-1" });
    expect(prisma.report.create).toHaveBeenCalledWith({
      data: {
        date: new Date("2026-03-06T00:00:00.000Z"),
        workContent: "○○機能の実装",
        tomorrowPlan: "レビュー対応",
        notes: "DBの設計で詰まった",
        authorId: "user-1",
      },
    });
  });

  it("正常系: notes 省略時は空文字で保存される", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(prisma.report.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.report.create).mockResolvedValue({ ...mockReport, notes: "" });

    const res = await POST(makePostRequest({ date: "2026-03-06", workContent: "作業内容", tomorrowPlan: "明日の予定" }));

    expect(res.status).toBe(201);
    expect(prisma.report.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ notes: "" }),
    });
  });

  it("異常系: 未認証で 401 を返す", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth).mockResolvedValue(null as never);

    const res = await POST(makePostRequest(validPostBody));

    expect(res.status).toBe(401);
    expect(prisma.report.findFirst).not.toHaveBeenCalled();
  });

  it("異常系: date が不正な形式で 400 を返す", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth).mockResolvedValue(mockSession as never);

    const res = await POST(makePostRequest({ ...validPostBody, date: "20260306" }));
    expect(res.status).toBe(400);
  });

  it("異常系: date が存在しない日付で 400 を返す", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth).mockResolvedValue(mockSession as never);

    const res = await POST(makePostRequest({ ...validPostBody, date: "2026-99-99" }));
    expect(res.status).toBe(400);
  });

  it("異常系: workContent が空で 400 を返す", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth).mockResolvedValue(mockSession as never);

    const res = await POST(makePostRequest({ ...validPostBody, workContent: "" }));
    expect(res.status).toBe(400);
  });

  it("異常系: tomorrowPlan が空で 400 を返す", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth).mockResolvedValue(mockSession as never);

    const res = await POST(makePostRequest({ ...validPostBody, tomorrowPlan: "" }));
    expect(res.status).toBe(400);
  });

  it("異常系: 同日に日報が存在する場合 409 を返す", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(prisma.report.findFirst).mockResolvedValue(mockReport);

    const res = await POST(makePostRequest(validPostBody));
    expect(res.status).toBe(409);
    expect(prisma.report.create).not.toHaveBeenCalled();
  });

  it("異常系: 同時リクエストによる P2002 競合で 409 を返す", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(prisma.report.findFirst).mockResolvedValue(null);
    const p2002Error = Object.assign(new Error("Unique constraint failed"), { code: "P2002" });
    vi.mocked(prisma.report.create).mockRejectedValue(p2002Error);

    const res = await POST(makePostRequest(validPostBody));
    expect(res.status).toBe(409);
  });

  it("異常系: 不正な JSON で 400 を返す", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth).mockResolvedValue(mockSession as never);

    const res = await POST(
      new Request("http://localhost/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "invalid-json",
      }),
    );
    expect(res.status).toBe(400);
  });
});
