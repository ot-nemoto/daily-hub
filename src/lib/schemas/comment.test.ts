// @vitest-environment node
import { describe, expect, it } from "vitest";

import { commentCreateBodySchema, commentResponseSchema } from "./comment";

describe("commentCreateBodySchema", () => {
  it("正常系: 妥当な body を受理する", () => {
    expect(commentCreateBodySchema.safeParse({ body: "参考になりました" }).success).toBe(true);
  });

  it("body が空なら必須メッセージを返す", () => {
    const result = commentCreateBodySchema.safeParse({ body: "" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0].message).toBe("body は必須です");
  });

  it("body が1000文字超なら上限メッセージを返す", () => {
    const result = commentCreateBodySchema.safeParse({ body: "a".repeat(1001) });
    expect(result.success).toBe(false);
    if (!result.success)
      expect(result.error.issues[0].message).toBe("body は1000文字以内で入力してください");
  });

  it("非オブジェクト body はボディ不正メッセージを返す", () => {
    const result = commentCreateBodySchema.safeParse(123);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0].message).toBe("リクエストボディが不正です");
  });
});

describe("commentResponseSchema", () => {
  it("整形済みレスポンスを受理する", () => {
    const result = commentResponseSchema.safeParse({
      id: "c1",
      body: "コメント",
      authorId: "u1",
      authorName: "太郎",
      createdAt: "2026-07-15T00:00:00.000Z",
    });
    expect(result.success).toBe(true);
  });
});
