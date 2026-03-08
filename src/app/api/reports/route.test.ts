// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";
import { POST } from "./route";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    report: {
      findFirst: vi.fn(),
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

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/reports", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validBody = {
  date: "2026-03-06",
  workContent: "○○機能の実装",
  tomorrowPlan: "レビュー対応",
  notes: "DBの設計で詰まった",
};

describe("POST /api/reports", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("正常系: 有効な入力で 201 と id を返す", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(prisma.report.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.report.create).mockResolvedValue(mockReport);

    const res = await POST(makeRequest(validBody));
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

    const res = await POST(makeRequest({ date: "2026-03-06", workContent: "作業内容", tomorrowPlan: "明日の予定" }));

    expect(res.status).toBe(201);
    expect(prisma.report.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ notes: "" }),
    });
  });

  it("異常系: 未認証で 401 を返す", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth).mockResolvedValue(null as never);

    const res = await POST(makeRequest(validBody));

    expect(res.status).toBe(401);
    expect(prisma.report.findFirst).not.toHaveBeenCalled();
  });

  it("異常系: date が不正な形式で 400 を返す", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth).mockResolvedValue(mockSession as never);

    const res = await POST(makeRequest({ ...validBody, date: "20260306" }));
    expect(res.status).toBe(400);
  });

  it("異常系: date が存在しない日付で 400 を返す", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth).mockResolvedValue(mockSession as never);

    const res = await POST(makeRequest({ ...validBody, date: "2026-99-99" }));
    expect(res.status).toBe(400);
  });

  it("異常系: workContent が空で 400 を返す", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth).mockResolvedValue(mockSession as never);

    const res = await POST(makeRequest({ ...validBody, workContent: "" }));
    expect(res.status).toBe(400);
  });

  it("異常系: tomorrowPlan が空で 400 を返す", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth).mockResolvedValue(mockSession as never);

    const res = await POST(makeRequest({ ...validBody, tomorrowPlan: "" }));
    expect(res.status).toBe(400);
  });

  it("異常系: 同日に日報が存在する場合 409 を返す", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(prisma.report.findFirst).mockResolvedValue(mockReport);

    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(409);
    expect(prisma.report.create).not.toHaveBeenCalled();
  });

  it("異常系: 同時リクエストによる P2002 競合で 409 を返す", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(prisma.report.findFirst).mockResolvedValue(null);
    const p2002Error = Object.assign(new Error("Unique constraint failed"), { code: "P2002" });
    vi.mocked(prisma.report.create).mockRejectedValue(p2002Error);

    const res = await POST(makeRequest(validBody));
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
