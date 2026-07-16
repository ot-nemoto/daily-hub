// @vitest-environment node
import { describe, expect, it } from "vitest";

import { dayOffCreateBodySchema, dayOffResponseSchema } from "./day-off";

describe("dayOffCreateBodySchema", () => {
  it("正常系: 妥当な date を受理する", () => {
    expect(dayOffCreateBodySchema.safeParse({ date: "2026-07-15" }).success).toBe(true);
  });

  it("フォーマット違反の date を拒否する", () => {
    const result = dayOffCreateBodySchema.safeParse({ date: "2026/07/15" });
    expect(result.success).toBe(false);
    if (!result.success)
      expect(result.error.issues[0].message).toBe("date は YYYY-MM-DD 形式で入力してください");
  });

  it("非オブジェクト body はボディ不正メッセージを返す", () => {
    const result = dayOffCreateBodySchema.safeParse(null);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0].message).toBe("リクエストボディが不正です");
  });
});

describe("dayOffResponseSchema", () => {
  it("整形済みレスポンスを受理する", () => {
    expect(dayOffResponseSchema.safeParse({ id: "d1", date: "2026-07-15" }).success).toBe(true);
  });
});
