// @vitest-environment node
import { describe, expect, it } from "vitest";

import { buildOpenApiDocument } from "./document";

/** path item 階層には parameters・summary など operation 以外のキーも置けるため、走査時にフィルタする。 */
const HTTP_METHODS = ["get", "post", "patch", "put", "delete"];

const EXPECTED_PATHS: Record<string, string[]> = {
  "/api/me": ["get", "patch"],
  "/api/reports": ["get", "post"],
  "/api/reports/{id}": ["get", "patch", "delete"],
  "/api/reports/{id}/comments": ["get", "post"],
  "/api/comments/{id}": ["delete"],
  "/api/day-off": ["get", "post"],
  "/api/day-off/{id}": ["delete"],
  "/api/holidays": ["get", "post"],
  "/api/holidays/{id}": ["delete"],
  "/api/admin/users": ["get"],
  "/api/admin/users/{id}": ["patch", "delete"],
  "/api/admin/reports": ["post"],
  "/api/admin/reports/{id}": ["delete"],
};

/** operationId → その operation が宣言すべきレスポンスコード（実ルートの契約）。 */
const EXPECTED_STATUS: Record<string, string[]> = {
  getMe: ["200", "401", "404", "500"],
  updateMe: ["200", "400", "401", "404", "500"],
  listReports: ["200", "400", "401", "500"],
  upsertReports: ["200", "201", "400", "401", "403", "500"],
  getReport: ["200", "401", "404", "500"],
  updateReport: ["200", "400", "401", "403", "404", "500"],
  deleteReport: ["204", "401", "403", "404", "500"],
  listReportComments: ["200", "401", "404", "500"],
  createReportComment: ["201", "400", "401", "404", "500"],
  deleteComment: ["204", "401", "403", "404", "500"],
  listDayOffs: ["200", "401", "500"],
  createDayOff: ["201", "400", "401", "403", "409", "500"],
  deleteDayOff: ["204", "401", "403", "404", "500"],
  listHolidays: ["200", "400", "401", "500"],
  createHoliday: ["201", "400", "401", "403", "409", "500"],
  deleteHoliday: ["204", "401", "403", "404", "500"],
  adminListUsers: ["200", "401", "403", "500"],
  adminUpdateUser: ["200", "400", "401", "403", "404", "500"],
  adminDeleteUser: ["204", "401", "403", "404", "500"],
  adminBatchReports: ["200", "400", "401", "403", "500"],
  adminDeleteReport: ["204", "401", "403", "404", "500"],
};

/** paths を { operationId, responses } の一覧に展開する。 */
function eachOperation(doc: ReturnType<typeof buildOpenApiDocument>) {
  return eachOperationFull(doc).map(({ operationId, responses }) => ({ operationId, responses }));
}

/** paths を operation 全体（description 含む）の一覧に展開する。 */
function eachOperationFull(doc: ReturnType<typeof buildOpenApiDocument>) {
  const ops: { operationId: string; description?: string; responses: Record<string, unknown> }[] =
    [];
  for (const item of Object.values(doc.paths)) {
    for (const op of Object.values(item as Record<string, unknown>)) {
      const o = op as {
        operationId: string;
        description?: string;
        responses: Record<string, unknown>;
      };
      ops.push({ operationId: o.operationId, description: o.description, responses: o.responses });
    }
  }
  return ops;
}

/** ノードを再帰探索し、条件に合う値を集める。 */
function collect(node: unknown, pick: (obj: Record<string, unknown>) => string[]): string[] {
  const out: string[] = [];
  const walk = (n: unknown) => {
    if (Array.isArray(n)) {
      for (const item of n) walk(item);
      return;
    }
    if (n && typeof n === "object") {
      const obj = n as Record<string, unknown>;
      out.push(...pick(obj));
      for (const v of Object.values(obj)) walk(v);
    }
  };
  walk(node);
  return out;
}

describe("buildOpenApiDocument", () => {
  it("openapi は 3.1.0", () => {
    expect(buildOpenApiDocument().openapi).toBe("3.1.0");
  });

  it("info.version は注入した値を使う", () => {
    expect(buildOpenApiDocument({ version: "1.2.3" }).info.version).toBe("1.2.3");
  });

  it("bearerAuth の securityScheme と security を持つ", () => {
    const doc = buildOpenApiDocument();
    expect(doc.components.securitySchemes.bearerAuth).toMatchObject({
      type: "http",
      scheme: "bearer",
    });
    expect(doc.security).toEqual([{ bearerAuth: [] }]);
  });

  it("想定した全 path と HTTP メソッドを網羅する", () => {
    const { paths } = buildOpenApiDocument();
    expect(Object.keys(paths).sort()).toEqual(Object.keys(EXPECTED_PATHS).sort());
    for (const [path, methods] of Object.entries(EXPECTED_PATHS)) {
      const item = paths[path as keyof typeof paths] as Record<string, unknown>;
      expect(Object.keys(item).sort()).toEqual([...methods].sort());
    }
  });

  it("各 operation に summary と responses がある", () => {
    const { paths } = buildOpenApiDocument();
    for (const [path, methods] of Object.entries(EXPECTED_PATHS)) {
      const item = paths[path as keyof typeof paths] as Record<
        string,
        { summary?: string; responses?: object }
      >;
      for (const method of methods) {
        const op = item[method];
        expect(op.summary, `${method.toUpperCase()} ${path} summary`).toBeTruthy();
        expect(op.responses, `${method.toUpperCase()} ${path} responses`).toBeTruthy();
      }
    }
  });

  it("全 operation が 500 を定義する（サーバー側の失敗も spec に載せる）", () => {
    const { paths } = buildOpenApiDocument();
    for (const [path, methods] of Object.entries(EXPECTED_PATHS)) {
      const item = paths[path as keyof typeof paths] as Record<
        string,
        { responses?: Record<string, { description?: string }> }
      >;
      for (const method of methods) {
        expect(
          item[method].responses?.["500"],
          `${method.toUpperCase()} ${path} に 500 が無い`,
        ).toBeTruthy();
      }
    }
  });

  // 500 の「有無」だけを見る検査では、ボディ定義が落ちた 500・別スキーマを指す 500 を
  // 見逃す（$ref 解決の検査は参照先が存在すれば通る）。守りたいのは「全エラーが { error }」
  // という契約そのものなので、スキーマを完全一致で固定する。
  it("全 4xx / 5xx のボディが共通の Error スキーマを指す", () => {
    const { paths } = buildOpenApiDocument();
    let checked = 0;
    for (const [path, item] of Object.entries(paths)) {
      for (const [method, op] of Object.entries(item as Record<string, unknown>)) {
        if (!HTTP_METHODS.includes(method)) continue;
        const o = op as {
          responses?: Record<string, { content?: Record<string, { schema?: unknown }> }>;
        };
        for (const [status, res] of Object.entries(o.responses ?? {})) {
          if (Number(status) < 400) continue;
          checked += 1;
          expect(
            res.content?.["application/json"]?.schema,
            `${method.toUpperCase()} ${path} の ${status}`,
          ).toEqual({ $ref: "#/components/schemas/Error" });
        }
      }
    }
    // 走査の起点を誤ると 1 件も検査せずに通るため、0 件での成功を禁じる。
    expect(checked).toBeGreaterThan(0);
  });

  // 実装が返す CORS ヘッダ（src/proxy.ts の CORS_HEADERS）は spec を読む側の判断材料。
  // proxy の実装だけに存在して spec に無い状態を防ぐ。
  it("info.description に CORS の記載がある", () => {
    const { info } = buildOpenApiDocument();
    expect(info.description).toContain("Access-Control-Allow-Origin: *");
  });

  // 実装（unauthorized()）が返す WWW-Authenticate を spec にも載せる。
  // 配信 spec を仕様の唯一の正とするため、片方だけ消えるのを防ぐ。
  it("401 を定義する全 operation が WWW-Authenticate ヘッダを宣言する", () => {
    const { paths } = buildOpenApiDocument();
    let checked = 0;
    for (const item of Object.values(paths)) {
      for (const [method, op] of Object.entries(item as Record<string, unknown>)) {
        if (!HTTP_METHODS.includes(method)) continue;
        const o = op as {
          operationId: string;
          responses: Record<string, { headers?: Record<string, unknown> }>;
        };
        if (!o.responses["401"]) continue;
        checked += 1;
        expect(o.responses["401"].headers?.["WWW-Authenticate"], o.operationId).toBeTruthy();
      }
    }
    expect(checked).toBeGreaterThan(0);
  });

  it("すべての $ref が components.schemas に実在する", () => {
    const doc = buildOpenApiDocument();
    const defined = new Set(Object.keys(doc.components.schemas));
    const refs = collect(doc, (obj) => (typeof obj.$ref === "string" ? [obj.$ref as string] : []));
    expect(refs.length).toBeGreaterThan(0);
    for (const r of refs) {
      expect(r.startsWith("#/components/schemas/"), `unexpected $ref: ${r}`).toBe(true);
      const name = r.replace("#/components/schemas/", "");
      expect(defined.has(name), `missing schema: ${name}`).toBe(true);
    }
  });

  it("additionalProperties を一切残さない", () => {
    const doc = buildOpenApiDocument();
    const found = collect(doc, (obj) =>
      Object.hasOwn(obj, "additionalProperties") ? ["additionalProperties"] : [],
    );
    expect(found).toEqual([]);
  });

  it("$schema を残さない", () => {
    const doc = buildOpenApiDocument();
    const found = collect(doc, (obj) => (Object.hasOwn(obj, "$schema") ? ["$schema"] : []));
    expect(found).toEqual([]);
  });

  it("一覧系 operation は並び順などの挙動契約を description に持つ", () => {
    // docs/api.md 廃止時にソート順・パラメータ排他の契約が失われた経緯があるため、
    // spec 側（唯一の正）に残っていることを固定する。
    const withDescription = [
      "listReports",
      "listReportComments",
      "listDayOffs",
      "listHolidays",
      "adminListUsers",
    ];
    const ops = new Map(eachOperationFull(buildOpenApiDocument()).map((o) => [o.operationId, o]));
    for (const id of withDescription) {
      const description = ops.get(id)?.description;
      expect(description, `${id} の description`).toBeTruthy();
    }
    // date / from・to の排他（date 優先）は listReports の description で明示する
    expect(ops.get("listReports")?.description).toContain("from");
  });

  it("全 operation が一意な operationId を持つ", () => {
    const ids = eachOperation(buildOpenApiDocument()).map((o) => o.operationId);
    expect(ids.every((id) => typeof id === "string" && id.length > 0)).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(ids)).toEqual(new Set(Object.keys(EXPECTED_STATUS)));
  });

  it("各 operation の宣言レスポンスコードが実ルートの契約と一致する", () => {
    for (const { operationId, responses } of eachOperation(buildOpenApiDocument())) {
      const expected = EXPECTED_STATUS[operationId];
      expect(expected, `未知の operationId: ${operationId}`).toBeDefined();
      expect(Object.keys(responses).sort(), operationId).toEqual([...expected].sort());
    }
  });

  describe("servers", () => {
    it("serverUrl を先頭に置く", () => {
      const doc = buildOpenApiDocument({ serverUrl: "https://daily.example.com" });
      expect(doc.servers[0]).toEqual({ url: "https://daily.example.com" });
      expect(doc.servers).toContainEqual({
        url: "http://localhost:3000",
        description: "ローカル開発",
      });
    });

    it("serverUrl が localhost なら固定 localhost を重複させない", () => {
      const doc = buildOpenApiDocument({ serverUrl: "http://localhost:3001" });
      expect(doc.servers).toEqual([{ url: "http://localhost:3001" }]);
    });

    it("serverUrl 未指定なら固定 localhost のみ", () => {
      const doc = buildOpenApiDocument();
      expect(doc.servers).toEqual([{ url: "http://localhost:3000", description: "ローカル開発" }]);
    });
  });
});
