// @vitest-environment node
import { describe, expect, it } from "vitest";

import { authConfig } from "./auth.config";

const authorized = authConfig.callbacks.authorized as (args: {
  auth: { user?: { role?: string } } | null;
  request: { nextUrl: { pathname: string } };
}) => boolean;

type SessionCallbackArgs = {
  session: { user: { id?: string; role?: string; isActive?: boolean } };
  token: { id?: string; role?: string; isActive?: boolean };
};
const sessionCallback = authConfig.callbacks.session as (
  args: SessionCallbackArgs
) => SessionCallbackArgs["session"];

describe("authorized callback", () => {
  const makeRequest = (pathname: string) => ({
    nextUrl: { pathname },
  });

  describe("通常ルート", () => {
    it("正常系: ログイン済みユーザーはアクセス可能", () => {
      expect(
        authorized({ auth: { user: { role: "MEMBER" } }, request: makeRequest("/reports") })
      ).toBe(true);
    });

    it("異常系: 未ログインユーザーはアクセス不可", () => {
      expect(
        authorized({ auth: null, request: makeRequest("/reports") })
      ).toBe(false);
    });
  });

describe("session callback", () => {
  it("正常系: token の id・role・isActive が session.user にマッピングされる", () => {
    const result = sessionCallback({
      session: { user: {} },
      token: { id: "user-1", role: "ADMIN", isActive: true },
    });
    expect(result.user.id).toBe("user-1");
    expect(result.user.role).toBe("ADMIN");
    expect(result.user.isActive).toBe(true);
  });

  it("正常系: isActive が false の場合もマッピングされる", () => {
    const result = sessionCallback({
      session: { user: {} },
      token: { id: "user-2", role: "MEMBER", isActive: false },
    });
    expect(result.user.isActive).toBe(false);
  });

  it("正常系: token にフィールドがない場合は session.user を変更しない", () => {
    const result = sessionCallback({
      session: { user: {} },
      token: {},
    });
    expect(result.user.id).toBeUndefined();
    expect(result.user.role).toBeUndefined();
    expect(result.user.isActive).toBeUndefined();
  });
});

  describe("/admin ルート", () => {
    it("正常系: ADMIN ユーザーはアクセス可能", () => {
      expect(
        authorized({ auth: { user: { role: "ADMIN" } }, request: makeRequest("/admin/users") })
      ).toBe(true);
    });

    it("異常系: MEMBER ユーザーは /admin にアクセス不可", () => {
      expect(
        authorized({ auth: { user: { role: "MEMBER" } }, request: makeRequest("/admin/users") })
      ).toBe(false);
    });

    it("異常系: 未ログインユーザーは /admin にアクセス不可", () => {
      expect(
        authorized({ auth: null, request: makeRequest("/admin") })
      ).toBe(false);
    });
  });
});
