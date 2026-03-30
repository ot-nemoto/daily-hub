// @vitest-environment node
import { describe, expect, it } from "vitest";

import { parseApiError, parseFieldErrors } from "./apiError";

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

describe("parseFieldErrors", () => {
  it("正常系: flatten 形式のフィールドエラーを返す", async () => {
    const res = makeResponse({
      error: { formErrors: [], fieldErrors: { date: ["必須です"], workContent: ["長すぎます"] } },
    });
    const result = await parseFieldErrors(res);
    expect(result.fieldErrors).toEqual({ date: ["必須です"], workContent: ["長すぎます"] });
    expect(result.message).toBe("必須です");
  });

  it("正常系: formErrors がある場合はその先頭をメッセージに使う", async () => {
    const res = makeResponse({
      error: { formErrors: ["フォームエラー"], fieldErrors: {} },
    });
    const result = await parseFieldErrors(res);
    expect(result.message).toBe("フォームエラー");
    expect(result.fieldErrors).toEqual({});
  });

  it("正常系: { error: string } 形式の場合は message にセットし fieldErrors は空", async () => {
    const res = makeResponse({ error: "権限がありません" });
    const result = await parseFieldErrors(res);
    expect(result.message).toBe("権限がありません");
    expect(result.fieldErrors).toEqual({});
  });

  it("正常系: JSON パース失敗時はデフォルトメッセージで fieldErrors は空", async () => {
    const res = makeInvalidJsonResponse();
    const result = await parseFieldErrors(res);
    expect(result.message).toBe("入力内容を確認してください");
    expect(result.fieldErrors).toEqual({});
  });

  it("正常系: formErrors・fieldErrors ともに空の場合はデフォルトメッセージ", async () => {
    const res = makeResponse({ error: { formErrors: [], fieldErrors: {} } });
    const result = await parseFieldErrors(res);
    expect(result.message).toBe("入力内容を確認してください");
    expect(result.fieldErrors).toEqual({});
  });
});
