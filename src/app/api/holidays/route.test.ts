// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
  },
}));

vi.mock("@/lib/holiday", () => ({
  getHolidays: vi.fn(),
  createHoliday: vi.fn(),
}));

import { ConflictError } from "@/lib/errors";
import { createHoliday, getHolidays } from "@/lib/holiday";
import { prisma } from "@/lib/prisma";
import { GET, POST } from "./route";

const VALID_API_KEY = "test-key";
const ADMIN = { id: "admin-1", role: "ADMIN", isActive: true };
const MEMBER = { id: "u1", role: "MEMBER", isActive: true };

function makeRequest(
  method: "GET" | "POST",
  opts: { body?: unknown; apiKey?: string; query?: string } = {},
) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (opts.apiKey !== undefined) headers.authorization = `Bearer ${opts.apiKey}`;
  return new NextRequest(`http://localhost/api/holidays${opts.query ?? ""}`, {
    method,
    headers,
    ...(opts.body !== undefined ? { body: JSON.stringify(opts.body) } : {}),
  });
}

function authAs(user: unknown) {
  vi.mocked(prisma.user.findUnique).mockResolvedValue(user as never);
}

describe("GET /api/holidays", () => {
  beforeEach(() => vi.clearAllMocks());

  it("Authorization ヘッダーなしで 401", async () => {
    const res = await GET(makeRequest("GET"));
    expect(res.status).toBe(401);
  });

  it("正常系: 祝日一覧を整形して返す", async () => {
    authAs(MEMBER);
    vi.mocked(getHolidays).mockResolvedValue([
      { id: "h1", date: new Date("2026-08-11T00:00:00.000Z"), name: "山の日" },
    ] as never);

    const res = await GET(makeRequest("GET", { apiKey: VALID_API_KEY }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      holidays: [{ id: "h1", date: "2026-08-11", name: "山の日" }],
    });
    expect(getHolidays).toHaveBeenCalledWith(undefined);
  });

  it("正常系: from/to を期間として渡す", async () => {
    authAs(MEMBER);
    vi.mocked(getHolidays).mockResolvedValue([] as never);

    await GET(
      makeRequest("GET", { apiKey: VALID_API_KEY, query: "?from=2026-08-01&to=2026-08-31" }),
    );

    expect(getHolidays).toHaveBeenCalledWith({
      from: new Date("2026-08-01T00:00:00.000Z"),
      to: new Date("2026-08-31T00:00:00.000Z"),
    });
  });

  it("バリデーションエラー: 不正な from は 400", async () => {
    authAs(MEMBER);

    const res = await GET(makeRequest("GET", { apiKey: VALID_API_KEY, query: "?from=2026-99-99" }));

    expect(res.status).toBe(400);
    expect(getHolidays).not.toHaveBeenCalled();
  });
});

describe("POST /api/holidays", () => {
  beforeEach(() => vi.clearAllMocks());

  it("認証エラー: Authorization なしで 401", async () => {
    const res = await POST(makeRequest("POST", { body: { date: "2026-08-11" } }));
    expect(res.status).toBe(401);
  });

  it("認可エラー: ADMIN 以外で 403", async () => {
    authAs(MEMBER);

    const res = await POST(
      makeRequest("POST", { apiKey: VALID_API_KEY, body: { date: "2026-08-11" } }),
    );

    expect(res.status).toBe(403);
    expect(createHoliday).not.toHaveBeenCalled();
  });

  it("バリデーションエラー: date なしで 400", async () => {
    authAs(ADMIN);

    const res = await POST(makeRequest("POST", { apiKey: VALID_API_KEY, body: { name: "x" } }));

    expect(res.status).toBe(400);
    expect(createHoliday).not.toHaveBeenCalled();
  });

  it("正常系: 祝日を作成して 201", async () => {
    authAs(ADMIN);
    vi.mocked(createHoliday).mockResolvedValue({
      id: "h1",
      date: new Date("2026-08-11T00:00:00.000Z"),
      name: "山の日",
    } as never);

    const res = await POST(
      makeRequest("POST", { apiKey: VALID_API_KEY, body: { date: "2026-08-11", name: "山の日" } }),
    );

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ id: "h1", date: "2026-08-11", name: "山の日" });
    expect(createHoliday).toHaveBeenCalledWith({
      date: new Date("2026-08-11T00:00:00.000Z"),
      name: "山の日",
    });
  });

  it("競合: 同日が既にあれば 409", async () => {
    authAs(ADMIN);
    vi.mocked(createHoliday).mockRejectedValue(new ConflictError());

    const res = await POST(
      makeRequest("POST", { apiKey: VALID_API_KEY, body: { date: "2026-08-11" } }),
    );

    expect(res.status).toBe(409);
  });
});
