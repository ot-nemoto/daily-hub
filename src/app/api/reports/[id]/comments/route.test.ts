// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
  },
}));

vi.mock("@/lib/comments", () => ({
  getComments: vi.fn(),
  createComment: vi.fn(),
}));

vi.mock("@/lib/reports", () => ({
  getReportById: vi.fn(),
}));

import { createComment, getComments } from "@/lib/comments";
import { NotFoundError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { getReportById } from "@/lib/reports";
import { GET, POST } from "./route";

const VALID_API_KEY = "test-key";
const MEMBER = { id: "u1", role: "MEMBER", isActive: true };
const REPORT = { id: "r1", author: { name: "太郎" } };
const COMMENT = {
  id: "c1",
  body: "お疲れ様です",
  authorId: "u1",
  author: { id: "u1", name: "太郎" },
  createdAt: new Date("2026-06-01T09:00:00.000Z"),
};

function makeRequest(method: "GET" | "POST", opts: { body?: unknown; apiKey?: string } = {}) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (opts.apiKey !== undefined) headers.authorization = `Bearer ${opts.apiKey}`;
  return new NextRequest("http://localhost/api/reports/r1/comments", {
    method,
    headers,
    ...(opts.body !== undefined ? { body: JSON.stringify(opts.body) } : {}),
  });
}

const ctx = { params: Promise.resolve({ id: "r1" }) };

function authOk(user = MEMBER) {
  vi.mocked(prisma.user.findUnique).mockResolvedValue(user as never);
}

describe("GET /api/reports/[id]/comments", () => {
  beforeEach(() => vi.clearAllMocks());

  it("Authorization ヘッダーなしで 401 を返す", async () => {
    const res = await GET(makeRequest("GET"), ctx);
    expect(res.status).toBe(401);
  });

  it("対象日報が存在しない場合 404 を返す", async () => {
    authOk();
    vi.mocked(getReportById).mockResolvedValue(null);
    const res = await GET(makeRequest("GET", { apiKey: VALID_API_KEY }), ctx);
    expect(res.status).toBe(404);
    expect(getComments).not.toHaveBeenCalled();
  });

  it("正常系: 整形済みの comments を返す", async () => {
    authOk();
    vi.mocked(getReportById).mockResolvedValue(REPORT as never);
    vi.mocked(getComments).mockResolvedValue([COMMENT] as never);
    const res = await GET(makeRequest("GET", { apiKey: VALID_API_KEY }), ctx);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.comments).toEqual([
      {
        id: "c1",
        body: "お疲れ様です",
        authorId: "u1",
        authorName: "太郎",
        createdAt: "2026-06-01T09:00:00.000Z",
      },
    ]);
  });
});

describe("POST /api/reports/[id]/comments", () => {
  beforeEach(() => vi.clearAllMocks());

  it("Authorization ヘッダーなしで 401 を返す", async () => {
    const res = await POST(makeRequest("POST", { body: { body: "x" } }), ctx);
    expect(res.status).toBe(401);
  });

  it("body が空なら 400 を返す", async () => {
    authOk();
    const res = await POST(makeRequest("POST", { body: { body: "" }, apiKey: VALID_API_KEY }), ctx);
    expect(res.status).toBe(400);
  });

  it("対象日報が存在しない場合 404 を返す", async () => {
    authOk();
    vi.mocked(createComment).mockRejectedValue(new NotFoundError());
    const res = await POST(
      makeRequest("POST", { body: { body: "お疲れ様です" }, apiKey: VALID_API_KEY }),
      ctx,
    );
    expect(res.status).toBe(404);
  });

  it("正常系: 201 と整形済みコメントを返す", async () => {
    authOk();
    vi.mocked(createComment).mockResolvedValue(COMMENT as never);
    const res = await POST(
      makeRequest("POST", { body: { body: "お疲れ様です" }, apiKey: VALID_API_KEY }),
      ctx,
    );
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json).toEqual({
      id: "c1",
      body: "お疲れ様です",
      authorId: "u1",
      authorName: "太郎",
      createdAt: "2026-06-01T09:00:00.000Z",
    });
    expect(createComment).toHaveBeenCalledWith({
      reportId: "r1",
      authorId: "u1",
      body: "お疲れ様です",
    });
  });

  it("VIEWER ロールでも投稿できる（201）", async () => {
    authOk({ ...MEMBER, role: "VIEWER" });
    vi.mocked(createComment).mockResolvedValue(COMMENT as never);
    const res = await POST(
      makeRequest("POST", { body: { body: "お疲れ様です" }, apiKey: VALID_API_KEY }),
      ctx,
    );
    expect(res.status).toBe(201);
  });
});
