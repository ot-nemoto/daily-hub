// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  getSession: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    invitation: { create: vi.fn(), findMany: vi.fn() },
  },
}));

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GET, POST } from "./route";

const mockAuth = vi.mocked(getSession);
const mockCreate = vi.mocked(prisma.invitation.create);
const mockFindMany = vi.mocked(prisma.invitation.findMany);

const adminSession = { user: { id: "admin-1", role: "ADMIN", isActive: true } };
const memberSession = { user: { id: "member-1", role: "MEMBER", isActive: true } };

const makeRequest = (body: unknown) =>
  new Request("http://localhost/api/admin/invitations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

const mockInvitation = {
  id: "inv-1",
  token: "test-token-uuid",
  email: "invite@example.com",
  expiresAt: new Date("2026-03-15T00:00:00Z"),
  usedAt: null,
  createdAt: new Date("2026-03-12T00:00:00Z"),
};

describe("POST /api/admin/invitations", () => {
  beforeEach(() => vi.clearAllMocks());

  it("正常系: ADMIN はメール指定で招待リンクを発行できる", async () => {
    mockAuth.mockResolvedValue(adminSession as never);
    mockCreate.mockResolvedValue(mockInvitation as never);

    const res = await POST(makeRequest({ email: "invite@example.com" }));
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body).toMatchObject({
      id: "inv-1",
      token: "test-token-uuid",
      inviteUrl: expect.stringContaining("/login"),
      expiresAt: expect.any(String),
    });
  });

  it("正常系: ADMIN はメール未指定で招待リンクを発行できる", async () => {
    mockAuth.mockResolvedValue(adminSession as never);
    mockCreate.mockResolvedValue({ ...mockInvitation, email: null } as never);

    const res = await POST(makeRequest({}));
    expect(res.status).toBe(201);
  });

  it("異常系: MEMBER は 403 を返す", async () => {
    mockAuth.mockResolvedValue(memberSession as never);

    const res = await POST(makeRequest({ email: "invite@example.com" }));
    expect(res.status).toBe(403);
  });

  it("異常系: 不正なメール形式は 400 を返す", async () => {
    mockAuth.mockResolvedValue(adminSession as never);

    const res = await POST(makeRequest({ email: "not-an-email" }));
    expect(res.status).toBe(400);
  });
});

const makeGetRequest = () =>
  new Request("http://localhost/api/admin/invitations");

describe("GET /api/admin/invitations", () => {
  beforeEach(() => vi.clearAllMocks());

  it("正常系: ADMIN は招待一覧を取得できる", async () => {
    mockAuth.mockResolvedValue(adminSession as never);
    mockFindMany.mockResolvedValue([mockInvitation] as never);

    const res = await GET(makeGetRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toHaveLength(1);
    expect(body[0]).toMatchObject({
      id: "inv-1",
      email: "invite@example.com",
      inviteUrl: expect.stringContaining("/login"),
      usedAt: null,
    });
  });

  it("異常系: MEMBER は 403 を返す", async () => {
    mockAuth.mockResolvedValue(memberSession as never);

    const res = await GET(makeGetRequest());
    expect(res.status).toBe(403);
  });

  it("異常系: 未ログインは 403 を返す", async () => {
    mockAuth.mockResolvedValue(null as never);

    const res = await GET(makeGetRequest());
    expect(res.status).toBe(403);
  });
});
