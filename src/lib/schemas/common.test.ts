// @vitest-environment node
import { describe, expect, it } from "vitest";

import { dateStringField, errorResponseSchema } from "./common";

describe("errorResponseSchema", () => {
  it("{ error: string } を受理する", () => {
    expect(errorResponseSchema.safeParse({ error: "失敗しました" }).success).toBe(true);
  });

  it("error が無い場合は拒否する", () => {
    expect(errorResponseSchema.safeParse({}).success).toBe(false);
  });
});

describe("dateStringField", () => {
  const schema = dateStringField();

  it("正常系: YYYY-MM-DD の実在日を受理する", () => {
    expect(schema.safeParse("2026-07-15").success).toBe(true);
  });

  it("フォーマット違反を拒否する", () => {
    const result = schema.safeParse("2026/07/15");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("date は YYYY-MM-DD 形式で入力してください");
    }
  });

  it("実在しない日付を拒否する", () => {
    const result = schema.safeParse("2026-02-30");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("date は実在する日付を入力してください");
    }
  });

  it("空文字を拒否する", () => {
    expect(schema.safeParse("").success).toBe(false);
  });

  it("field ラベルをメッセージに反映する", () => {
    const result = dateStringField("from").safeParse("bad");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("from は");
    }
  });
});
