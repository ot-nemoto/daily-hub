// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

// vi.mock はホイストされるため、モック内で参照する変数は vi.hoisted() で宣言する
const { mockFindUnique, capturedCallbacks } = vi.hoisted(() => {
  const mockFindUnique = vi.fn();
  const capturedCallbacks = {
    jwt: null as unknown as (args: {
      token: Record<string, unknown>;
      user?: unknown;
    }) => Promise<Record<string, unknown>>,
    session: null as unknown as (args: {
      session: { user: Record<string, unknown> };
      token: Record<string, unknown>;
    }) => { user: Record<string, unknown> },
  };
  return { mockFindUnique, capturedCallbacks };
});

vi.mock("next-auth", () => ({
  default: vi.fn((config: { callbacks: typeof capturedCallbacks }) => {
    capturedCallbacks.jwt = config.callbacks.jwt;
    capturedCallbacks.session = config.callbacks.session;
    return { handlers: {}, signIn: vi.fn(), signOut: vi.fn(), auth: vi.fn() };
  }),
}));

vi.mock("next-auth/providers/credentials", () => ({
  default: vi.fn(() => ({ id: "credentials" })),
}));

vi.mock("./prisma", () => ({
  prisma: { user: { findUnique: mockFindUnique } },
}));

vi.mock("./authorize", () => ({
  authorizeCredentials: vi.fn(),
}));

vi.mock("./auth.config", () => ({
  authConfig: {
    pages: { signIn: "/login" },
    callbacks: {
      authorized: vi.fn(),
      session: vi.fn(),
    },
    providers: [],
  },
}));

// auth.ts をインポートして NextAuth() を呼び出し、callbacks を捕捉する
import "./auth";

describe("jwt callback", () => {
  beforeEach(() => {
    mockFindUnique.mockReset();
  });

  it("正常系: 初回サインイン時（user あり）token に id/role/isActive を設定する", async () => {
    const token = {};
    const user = { id: "user-1", role: "ADMIN", isActive: true };
    const result = await capturedCallbacks.jwt({ token, user });
    expect(result.id).toBe("user-1");
    expect(result.role).toBe("ADMIN");
    expect(result.isActive).toBe(true);
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  it("正常系: 初回サインイン以降（user なし）DB から最新 role/isActive を取得する", async () => {
    mockFindUnique.mockResolvedValue({ role: "MEMBER", isActive: true });
    const token = { id: "user-2", role: "ADMIN", isActive: true };
    const result = await capturedCallbacks.jwt({ token });
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { id: "user-2" },
      select: { role: true, isActive: true },
    });
    expect(result.role).toBe("MEMBER");
    expect(result.isActive).toBe(true);
  });

  it("正常系: DB で isActive=false に変更された場合 token に反映される", async () => {
    mockFindUnique.mockResolvedValue({ role: "MEMBER", isActive: false });
    const token = { id: "user-3", role: "MEMBER", isActive: true };
    const result = await capturedCallbacks.jwt({ token });
    expect(result.isActive).toBe(false);
  });

  it("正常系: token.id がない場合 DB フェッチしない", async () => {
    const token = {};
    const result = await capturedCallbacks.jwt({ token });
    expect(mockFindUnique).not.toHaveBeenCalled();
    expect(result).toEqual({});
  });

  it("正常系: DB にユーザーが存在しない場合 token を変更しない", async () => {
    mockFindUnique.mockResolvedValue(null);
    const token = { id: "user-deleted", role: "MEMBER", isActive: true };
    const result = await capturedCallbacks.jwt({ token });
    expect(result.role).toBe("MEMBER");
    expect(result.isActive).toBe(true);
  });
});
