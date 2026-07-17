// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
  },
}));

vi.mock("@/lib/reports", () => ({
  getReportById: vi.fn(),
  updateReport: vi.fn(),
  deleteReportByAuthor: vi.fn(),
}));

import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { deleteReportByAuthor, getReportById, updateReport } from "@/lib/reports";
import { DELETE, GET, PATCH } from "./route";

const VALID_API_KEY = "test-key";
const MEMBER = { id: "u1", role: "MEMBER", isActive: true };
const UPDATE_BODY = { workContent: "更新", tomorrowPlan: "予定", notes: "メモ" };
const MOCK_REPORT = {
  id: "r1",
  date: new Date("2026-06-01T00:00:00.000Z"),
  authorId: "u1",
  author: { name: "太郎" },
  workContent: "w",
  tomorrowPlan: "t",
  notes: "n",
};

function makeRequest(
  method: "GET" | "PATCH" | "DELETE",
  opts: { body?: unknown; apiKey?: string } = {},
) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (opts.apiKey !== undefined) headers.authorization = `Bearer ${opts.apiKey}`;
  return new NextRequest("http://localhost/api/reports/r1", {
    method,
    headers,
    ...(opts.body !== undefined ? { body: JSON.stringify(opts.body) } : {}),
  });
}

const ctx = { params: Promise.resolve({ id: "r1" }) };

function authOk(user = MEMBER) {
  vi.mocked(prisma.user.findUnique).mockResolvedValue(user as never);
}

describe("GET /api/reports/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("Authorization ヘッダーなしで 401 を返す", async () => {
    const res = await GET(makeRequest("GET"), ctx);
    expect(res.status).toBe(401);
  });

  it("正常系: 整形済みの日報を返す", async () => {
    authOk();
    vi.mocked(getReportById).mockResolvedValue(MOCK_REPORT as never);
    const res = await GET(makeRequest("GET", { apiKey: VALID_API_KEY }), ctx);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({
      id: "r1",
      date: "2026-06-01",
      authorId: "u1",
      authorName: "太郎",
      workContent: "w",
      tomorrowPlan: "t",
      notes: "n",
    });
  });

  it("存在しない日報で 404 を返す", async () => {
    authOk();
    vi.mocked(getReportById).mockResolvedValue(null);
    const res = await GET(makeRequest("GET", { apiKey: VALID_API_KEY }), ctx);
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/reports/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("Authorization ヘッダーなしで 401 を返す", async () => {
    const res = await PATCH(makeRequest("PATCH", { body: UPDATE_BODY }), ctx);
    expect(res.status).toBe(401);
  });

  it("VIEWER ロールで 403 を返す", async () => {
    authOk({ ...MEMBER, role: "VIEWER" });
    const res = await PATCH(
      makeRequest("PATCH", { body: UPDATE_BODY, apiKey: VALID_API_KEY }),
      ctx,
    );
    expect(res.status).toBe(403);
  });

  it("workContent が空なら 400 を返す", async () => {
    authOk();
    const res = await PATCH(
      makeRequest("PATCH", { body: { ...UPDATE_BODY, workContent: "" }, apiKey: VALID_API_KEY }),
      ctx,
    );
    expect(res.status).toBe(400);
  });

  it("他人の日報（ForbiddenError）で 403 を返す", async () => {
    authOk();
    vi.mocked(updateReport).mockRejectedValue(new ForbiddenError());
    const res = await PATCH(
      makeRequest("PATCH", { body: UPDATE_BODY, apiKey: VALID_API_KEY }),
      ctx,
    );
    expect(res.status).toBe(403);
  });

  it("存在しない日報（NotFoundError）で 404 を返す", async () => {
    authOk();
    vi.mocked(updateReport).mockRejectedValue(new NotFoundError());
    const res = await PATCH(
      makeRequest("PATCH", { body: UPDATE_BODY, apiKey: VALID_API_KEY }),
      ctx,
    );
    expect(res.status).toBe(404);
  });

  it("正常系: updateReport の戻り値を整形して返す（再取得しない）", async () => {
    authOk();
    vi.mocked(updateReport).mockResolvedValue(MOCK_REPORT as never);
    const res = await PATCH(
      makeRequest("PATCH", { body: UPDATE_BODY, apiKey: VALID_API_KEY }),
      ctx,
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({
      id: "r1",
      date: "2026-06-01",
      authorId: "u1",
      authorName: "太郎",
      workContent: "w",
      tomorrowPlan: "t",
      notes: "n",
    });
    expect(updateReport).toHaveBeenCalledWith({
      id: "r1",
      authorId: "u1",
      workContent: "更新",
      tomorrowPlan: "予定",
      notes: "メモ",
    });
    expect(getReportById).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/reports/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("Authorization ヘッダーなしで 401 を返す", async () => {
    const res = await DELETE(makeRequest("DELETE"), ctx);
    expect(res.status).toBe(401);
  });

  it("VIEWER ロールで 403 を返す（PATCH と揃える）", async () => {
    authOk({ ...MEMBER, role: "VIEWER" });
    const res = await DELETE(makeRequest("DELETE", { apiKey: VALID_API_KEY }), ctx);
    expect(res.status).toBe(403);
    expect(deleteReportByAuthor).not.toHaveBeenCalled();
  });

  it("正常系: 204 を返す", async () => {
    authOk();
    vi.mocked(deleteReportByAuthor).mockResolvedValue(undefined);
    const res = await DELETE(makeRequest("DELETE", { apiKey: VALID_API_KEY }), ctx);
    expect(res.status).toBe(204);
    expect(deleteReportByAuthor).toHaveBeenCalledWith({ id: "r1", authorId: "u1" });
  });

  it("他人の日報（ForbiddenError）で 403 を返す", async () => {
    authOk();
    vi.mocked(deleteReportByAuthor).mockRejectedValue(new ForbiddenError());
    const res = await DELETE(makeRequest("DELETE", { apiKey: VALID_API_KEY }), ctx);
    expect(res.status).toBe(403);
  });

  it("存在しない日報（NotFoundError）で 404 を返す", async () => {
    authOk();
    vi.mocked(deleteReportByAuthor).mockRejectedValue(new NotFoundError());
    const res = await DELETE(makeRequest("DELETE", { apiKey: VALID_API_KEY }), ctx);
    expect(res.status).toBe(404);
  });
});
