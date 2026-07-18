// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
  },
}));

vi.mock("@/lib/day-off", () => ({
  deleteDayOffByOwner: vi.fn(),
}));

import { deleteDayOffByOwner } from "@/lib/day-off";
import { NotFoundError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { DELETE } from "./route";

const VALID_API_KEY = "test-key";
const MEMBER = { id: "u1", role: "MEMBER", isActive: true };

function makeRequest(apiKey?: string) {
  const headers: Record<string, string> = {};
  if (apiKey !== undefined) headers.authorization = `Bearer ${apiKey}`;
  return new NextRequest("http://localhost/api/day-off/d1", { method: "DELETE", headers });
}

const ctx = { params: Promise.resolve({ id: "d1" }) };

function authOk(user = MEMBER) {
  vi.mocked(prisma.user.findUnique).mockResolvedValue(user as never);
}

describe("DELETE /api/day-off/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("Authorization ヘッダーなしで 401 を返す", async () => {
    const res = await DELETE(makeRequest(), ctx);
    expect(res.status).toBe(401);
  });

  it("VIEWER ロールで 403 を返す", async () => {
    authOk({ ...MEMBER, role: "VIEWER" });
    const res = await DELETE(makeRequest(VALID_API_KEY), ctx);
    expect(res.status).toBe(403);
    expect(deleteDayOffByOwner).not.toHaveBeenCalled();
  });

  it("正常系: 204 を返す", async () => {
    authOk();
    vi.mocked(deleteDayOffByOwner).mockResolvedValue(undefined);
    const res = await DELETE(makeRequest(VALID_API_KEY), ctx);
    expect(res.status).toBe(204);
    expect(deleteDayOffByOwner).toHaveBeenCalledWith({ id: "d1", userId: "u1" });
  });

  it("対象なし・他人の休日（NotFoundError）で 404 を返す", async () => {
    authOk();
    vi.mocked(deleteDayOffByOwner).mockRejectedValue(new NotFoundError());
    const res = await DELETE(makeRequest(VALID_API_KEY), ctx);
    expect(res.status).toBe(404);
  });
});
