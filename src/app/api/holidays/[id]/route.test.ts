// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
  },
}));

vi.mock("@/lib/holiday", () => ({
  deleteHolidayById: vi.fn(),
}));

import { NotFoundError } from "@/lib/errors";
import { deleteHolidayById } from "@/lib/holiday";
import { prisma } from "@/lib/prisma";
import { DELETE } from "./route";

const VALID_API_KEY = "test-key";
const ADMIN = { id: "admin-1", role: "ADMIN", isActive: true };
const MEMBER = { id: "u1", role: "MEMBER", isActive: true };

function makeRequest(apiKey?: string) {
  const headers: Record<string, string> = {};
  if (apiKey !== undefined) headers.authorization = `Bearer ${apiKey}`;
  return new NextRequest("http://localhost/api/holidays/h1", { method: "DELETE", headers });
}

function authAs(user: unknown) {
  vi.mocked(prisma.user.findUnique).mockResolvedValue(user as never);
}

const ctx = { params: Promise.resolve({ id: "h1" }) };

describe("DELETE /api/holidays/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("認証エラー: Authorization なしで 401", async () => {
    const res = await DELETE(makeRequest(), ctx);
    expect(res.status).toBe(401);
  });

  it("認可エラー: ADMIN 以外で 403", async () => {
    authAs(MEMBER);

    const res = await DELETE(makeRequest(VALID_API_KEY), ctx);

    expect(res.status).toBe(403);
    expect(deleteHolidayById).not.toHaveBeenCalled();
  });

  it("未存在: 対象がなければ 404", async () => {
    authAs(ADMIN);
    vi.mocked(deleteHolidayById).mockRejectedValue(new NotFoundError());

    const res = await DELETE(makeRequest(VALID_API_KEY), ctx);

    expect(res.status).toBe(404);
  });

  it("正常系: 削除して 204", async () => {
    authAs(ADMIN);
    vi.mocked(deleteHolidayById).mockResolvedValue(undefined as never);

    const res = await DELETE(makeRequest(VALID_API_KEY), ctx);

    expect(res.status).toBe(204);
    expect(deleteHolidayById).toHaveBeenCalledWith({ id: "h1" });
  });
});
