// @vitest-environment node
import { describe, expect, it } from "vitest";

import { authConfig } from "./auth.config";

const authorized = authConfig.callbacks.authorized as (args: {
  auth: { user?: { role?: string } } | null;
  request: { nextUrl: { pathname: string } };
}) => boolean;

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
