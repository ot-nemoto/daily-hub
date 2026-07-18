// @vitest-environment node
import { describe, expect, it } from "vitest";

import { meResponseSchema, meUpdateBodySchema } from "./me";

describe("meUpdateBodySchema", () => {
  it("正常系: 妥当な name を受理する", () => {
    expect(meUpdateBodySchema.safeParse({ name: "山田太郎" }).success).toBe(true);
  });

  it("name が空なら必須メッセージを返す", () => {
    const result = meUpdateBodySchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0].message).toBe("name は必須です");
  });

  it("name が100文字超なら上限メッセージを返す", () => {
    const result = meUpdateBodySchema.safeParse({ name: "a".repeat(101) });
    expect(result.success).toBe(false);
    if (!result.success)
      expect(result.error.issues[0].message).toBe("name は100文字以内で入力してください");
  });
});

describe("meResponseSchema", () => {
  it("ユーザー共通形式を受理する", () => {
    const result = meResponseSchema.safeParse({
      id: "u1",
      name: "太郎",
      email: "taro@example.com",
      role: "MEMBER",
      isActive: true,
    });
    expect(result.success).toBe(true);
  });
});
