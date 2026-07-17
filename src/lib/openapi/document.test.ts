// @vitest-environment node
import { describe, expect, it } from "vitest";

import { buildOpenApiDocument } from "./document";

const EXPECTED_PATHS: Record<string, string[]> = {
  "/api/me": ["get", "patch"],
  "/api/reports": ["get", "post"],
  "/api/reports/{id}": ["get", "patch", "delete"],
  "/api/reports/{id}/comments": ["get", "post"],
  "/api/comments/{id}": ["delete"],
  "/api/day-off": ["get", "post"],
  "/api/day-off/{id}": ["delete"],
  "/api/admin/users": ["get"],
  "/api/admin/users/{id}": ["patch", "delete"],
  "/api/admin/reports": ["post"],
  "/api/admin/reports/{id}": ["delete"],
};

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
