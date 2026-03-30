// @vitest-environment node
import { describe, expect, it } from "vitest";

import { parseApiError } from "./apiError";

function makeResponse(body: unknown, status = 400): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function makeInvalidJsonResponse(): Response {
  return new Response("not json", {
    status: 400,
    headers: { "Content-Type": "text/plain" },
  });
}

describe("parseApiError", () => {
  it("正常系: { error: string } 形式のレスポンスからエラー文字列を返す", async () => {
    const res = makeResponse({ error: "名前が空です" });
    expect(await parseApiError(res, "fallback")).toBe("名前が空です");
  });

  it("正常系: error が文字列でない場合（flatten形式）は fallback を返す", async () => {
    const res = makeResponse({
      error: { formErrors: [], fieldErrors: { date: ["必須です"] } },
    });
    expect(await parseApiError(res, "fallback")).toBe("fallback");
  });

  it("正常系: JSON パースに失敗した場合は fallback を返す", async () => {
    const res = makeInvalidJsonResponse();
    expect(await parseApiError(res, "fallback")).toBe("fallback");
  });

  it("正常系: error キーが存在しない場合は fallback を返す", async () => {
    const res = makeResponse({ message: "something" });
    expect(await parseApiError(res, "fallback")).toBe("fallback");
  });

  it("正常系: 空オブジェクトの場合は fallback を返す", async () => {
    const res = makeResponse({});
    expect(await parseApiError(res, "fallback")).toBe("fallback");
  });
});
