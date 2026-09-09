// @vitest-environment node
import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { NextRequest, type NextResponse } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@clerk/nextjs/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@clerk/nextjs/server")>();
  return {
    ...actual,
    // 分岐順（未知 API の 404 と mock バイパスの前後関係）を検証するため、
    // Clerk のセッション解決を挟まずハンドラだけを実行する
    clerkMiddleware:
      (handler: (auth: unknown, request: NextRequest) => unknown) => (request: NextRequest) =>
        handler({ protect: vi.fn() }, request),
  };
});

import middleware, { CORS_HEADERS, isApiRoute, isPublicRoute } from "./proxy";

const req = (path: string, method?: string) =>
  new NextRequest(`http://localhost:3000${path}`, method ? { method } : undefined);

/** 上の vi.mock により、default export は `(request) => Response` として呼べる。 */
const callMiddleware = middleware as unknown as (
  request: NextRequest,
) => Promise<NextResponse | undefined>;

const API_DIR = fileURLToPath(new URL("./app/api", import.meta.url));

/** Route Handler のファイル名（拡張子違いを取りこぼすと登録漏れを検出できない）。 */
const ROUTE_FILE = /^route\.(?:ts|tsx|js|jsx|mjs)$/;

/**
 * `src/app/api/**\/route.*` から実在する API ルートの URL パスを列挙する。
 * 手動列挙にすると新規ルートの `isApiRoute` 登録漏れを検出できないため、実装から導出する。
 * 動的セグメント（`[id]`）は具体値に置換し、URL に現れないルートグループ（`(group)`）は除去する。
 */
function collectApiRoutePaths(dir = API_DIR, prefix = "/api"): string[] {
  const paths: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      const isRouteGroup = /^\(.+\)$/.test(entry.name);
      const segment = entry.name.replace(/^\[(?:\.\.\.)?.+\]$/, "abc");
      paths.push(
        ...collectApiRoutePaths(
          `${dir}/${entry.name}`,
          isRouteGroup ? prefix : `${prefix}/${segment}`,
        ),
      );
    } else if (ROUTE_FILE.test(entry.name)) {
      paths.push(prefix);
    }
  }
  return paths.sort();
}

const API_ROUTE_PATHS = collectApiRoutePaths();

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
  it("実在する全 API ルートに一致する（新規ルートの登録漏れを検出する）", () => {
    expect(API_ROUTE_PATHS.length).toBeGreaterThan(0);
    const missing = API_ROUTE_PATHS.filter((path) => !isApiRoute(req(path)));
    expect(missing).toEqual([]);
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
    for (const path of API_ROUTE_PATHS) {
      expect(isPublicRoute(req(path)), path).toBe(false);
    }
  });

  it("配信ルート・画面ルートを公開扱いにしない", () => {
    for (const path of PROTECTED_PATHS) {
      expect(isPublicRoute(req(path)), path).toBe(false);
    }
  });
});

describe("middleware の分岐順", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("未知の API ルートは mock バイパス設定時も 404（ローカル検証と本番の挙動を揃える）", async () => {
    vi.stubEnv("MOCK_USER_ID", "mock-user-id");
    const res = await callMiddleware(req("/api/unknown"));
    expect(res?.status).toBe(404);
    await expect(res?.json()).resolves.toEqual({ error: "Not Found" });
  });

  it("登録済み API ルートは mock バイパスに関係なく CORS を付けて通す", async () => {
    vi.stubEnv("MOCK_USER_ID", "mock-user-id");
    const res = await callMiddleware(req("/api/holidays"));
    expect(res?.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });

  it("API ルートの OPTIONS は認証不要で 204 ＋ CORS を返す", async () => {
    const res = await callMiddleware(req("/api/holidays", "OPTIONS"));
    expect(res?.status).toBe(204);
    expect(res?.headers.get("Access-Control-Allow-Methods")).toBe(
      CORS_HEADERS["Access-Control-Allow-Methods"],
    );
  });

  it("画面ルートは mock バイパスで素通りする（従来どおり）", async () => {
    vi.stubEnv("MOCK_USER_ID", "mock-user-id");
    const res = await callMiddleware(req("/reports/daily"));
    expect(res?.status).toBe(200);
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
