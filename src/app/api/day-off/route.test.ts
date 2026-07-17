// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
  },
}));

vi.mock("@/lib/day-off", () => ({
  getDayOffs: vi.fn(),
  createDayOff: vi.fn(),
}));

import { createDayOff, getDayOffs } from "@/lib/day-off";
import { ConflictError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { GET, POST } from "./route";

const VALID_API_KEY = "test-key";
const MEMBER = { id: "u1", role: "MEMBER", isActive: true };

function makeRequest(method: "GET" | "POST", opts: { body?: unknown; apiKey?: string } = {}) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (opts.apiKey !== undefined) headers.authorization = `Bearer ${opts.apiKey}`;
  return new NextRequest("http://localhost/api/day-off", {
    method,
    headers,
    ...(opts.body !== undefined ? { body: JSON.stringify(opts.body) } : {}),
  });
}

function authOk(user = MEMBER) {
  vi.mocked(prisma.user.findUnique).mockResolvedValue(user as never);
}

describe("GET /api/day-off", () => {
  beforeEach(() => vi.clearAllMocks());

  it("Authorization ヘッダーなしで 401 を返す", async () => {
    const res = await GET(makeRequest("GET"));
    expect(res.status).toBe(401);
  });

  it("正常系: 整形済みの dayOffs を返す", async () => {
    authOk();
    vi.mocked(getDayOffs).mockResolvedValue([
      { id: "d1", userId: "u1", date: new Date("2026-06-10T00:00:00.000Z") },
    ] as never);
    const res = await GET(makeRequest("GET", { apiKey: VALID_API_KEY }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.dayOffs).toEqual([{ id: "d1", date: "2026-06-10" }]);
    expect(getDayOffs).toHaveBeenCalledWith("u1");
  });
});

describe("POST /api/day-off", () => {
  beforeEach(() => vi.clearAllMocks());

  it("Authorization ヘッダーなしで 401 を返す", async () => {
    const res = await POST(makeRequest("POST", { body: { date: "2026-06-10" } }));
    expect(res.status).toBe(401);
  });

  it("VIEWER ロールで 403 を返す", async () => {
    authOk({ ...MEMBER, role: "VIEWER" });
    const res = await POST(
      makeRequest("POST", { body: { date: "2026-06-10" }, apiKey: VALID_API_KEY }),
    );
    expect(res.status).toBe(403);
    expect(createDayOff).not.toHaveBeenCalled();
  });

  it("date が不正形式なら 400 を返す", async () => {
    authOk();
    const res = await POST(
      makeRequest("POST", { body: { date: "2026/06/10" }, apiKey: VALID_API_KEY }),
    );
    expect(res.status).toBe(400);
  });

  it("同日重複（ConflictError）で 409 を返す", async () => {
    authOk();
    vi.mocked(createDayOff).mockRejectedValue(new ConflictError());
    const res = await POST(
      makeRequest("POST", { body: { date: "2026-06-10" }, apiKey: VALID_API_KEY }),
    );
    expect(res.status).toBe(409);
  });

  it("正常系: 201 と整形済み休日を返す", async () => {
    authOk();
    vi.mocked(createDayOff).mockResolvedValue({
      id: "d1",
      userId: "u1",
      date: new Date("2026-06-10T00:00:00.000Z"),
    } as never);
    const res = await POST(
      makeRequest("POST", { body: { date: "2026-06-10" }, apiKey: VALID_API_KEY }),
    );
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json).toEqual({ id: "d1", date: "2026-06-10" });
    expect(createDayOff).toHaveBeenCalledWith({
      userId: "u1",
      date: new Date("2026-06-10T00:00:00.000Z"),
    });
  });
});
