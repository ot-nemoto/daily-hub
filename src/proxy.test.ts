// @vitest-environment node
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { CORS_HEADERS, isApiRoute, isPublicRoute } from "./proxy";

const req = (path: string) => new NextRequest(`http://localhost:3000${path}`);

/** CORS 対象（＝APIキー認証の外部連携 API）であるべきパス。 */
const API_PATHS = [
  "/api/reports",
  "/api/reports/abc",
  "/api/reports/abc/comments",
  "/api/comments/abc",
  "/api/day-off",
  "/api/day-off/abc",
  "/api/me",
  "/api/admin/users",
  "/api/admin/users/abc",
  "/api/admin/reports",
  "/api/admin/reports/abc",
];

/** CORS 対象外かつログイン必須であるべきパス（誤って公開すると仕様が漏れる）。 */
const PROTECTED_PATHS = [
  "/openapi.json",
  "/api-reference",
  "/",
  "/reports/daily",
  "/reports/monthly",
  "/day-off",
  "/settings",
  "/admin/users",
];

describe("isApiRoute（CORS 対象の外部連携 API）", () => {
  it("全 API ルート（11パス相当）に一致する", () => {
    for (const path of API_PATHS) {
      expect(isApiRoute(req(path)), path).toBe(true);
    }
  });

  it("OpenAPI 配信・リファレンス UI には一致しない（ログイン必須を維持）", () => {
    expect(isApiRoute(req("/openapi.json"))).toBe(false);
    expect(isApiRoute(req("/api-reference"))).toBe(false);
  });

  it("画面ルートには一致しない", () => {
    for (const path of ["/", "/reports/daily", "/day-off", "/settings", "/admin/users"]) {
      expect(isApiRoute(req(path)), path).toBe(false);
    }
  });
});

describe("isPublicRoute（Clerk 保護の対象外）", () => {
  it("ログイン・認証エラー画面のみ公開", () => {
    expect(isPublicRoute(req("/login"))).toBe(true);
    expect(isPublicRoute(req("/login/sso-callback"))).toBe(true);
    expect(isPublicRoute(req("/auth-error"))).toBe(true);
  });

  it("API ルートは公開扱いにしない（CORS 分岐が担当する）", () => {
    for (const path of API_PATHS) {
      expect(isPublicRoute(req(path)), path).toBe(false);
    }
  });

  it("配信ルート・画面ルートを公開扱いにしない", () => {
    for (const path of PROTECTED_PATHS) {
      expect(isPublicRoute(req(path)), path).toBe(false);
    }
  });
});

describe("CORS_HEADERS", () => {
  it("任意オリジンを許可し、実装済みメソッド・必要ヘッダを列挙する", () => {
    expect(CORS_HEADERS).toEqual({
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Authorization, Content-Type",
      "Access-Control-Max-Age": "86400",
    });
  });

  it("Allow-Credentials を設定しない（* との併用はブラウザが拒否するため安全側）", () => {
    expect(Object.keys(CORS_HEADERS)).not.toContain("Access-Control-Allow-Credentials");
  });
});
