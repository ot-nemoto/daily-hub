// @vitest-environment node
import { describe, expect, it } from "vitest";

import { reportCreateBodySchema, reportResponseSchema, reportUpdateBodySchema } from "./report";

describe("reportCreateBodySchema", () => {
  it("正常系: 妥当な body を受理し notes 未指定は空文字になる", () => {
    const result = reportCreateBodySchema.safeParse({
      date: "2026-07-15",
      workContent: "実装",
      tomorrowPlan: "レビュー",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.notes).toBe("");
  });

  it("workContent が空なら必須メッセージを返す", () => {
    const result = reportCreateBodySchema.safeParse({
      date: "2026-07-15",
      workContent: "",
      tomorrowPlan: "x",
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0].message).toBe("workContent は必須です");
  });

  it("workContent が5000文字超なら上限メッセージを返す", () => {
    const result = reportCreateBodySchema.safeParse({
      date: "2026-07-15",
      workContent: "a".repeat(5001),
      tomorrowPlan: "x",
    });
    expect(result.success).toBe(false);
    if (!result.success)
      expect(result.error.issues[0].message).toBe("workContent は5000文字以内で入力してください");
  });

  it("非オブジェクト body はボディ不正メッセージを返す", () => {
    const result = reportCreateBodySchema.safeParse("not-an-object");
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0].message).toBe("リクエストボディが不正です");
  });
});

describe("reportUpdateBodySchema", () => {
  it("正常系: date を含まない body を受理する", () => {
    const result = reportUpdateBodySchema.safeParse({
      workContent: "更新",
      tomorrowPlan: "予定",
      notes: "メモ",
    });
    expect(result.success).toBe(true);
  });
});

describe("reportResponseSchema", () => {
  it("整形済みレスポンスを受理する", () => {
    const result = reportResponseSchema.safeParse({
      id: "r1",
      date: "2026-07-15",
      authorId: "u1",
      authorName: "太郎",
      workContent: "w",
      tomorrowPlan: "t",
      notes: "",
    });
    expect(result.success).toBe(true);
  });
});
