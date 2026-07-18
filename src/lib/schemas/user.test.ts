// @vitest-environment node
import { describe, expect, it } from "vitest";

import { roleSchema, userAdminUpdateBodySchema, userResponseSchema } from "./user";

describe("roleSchema", () => {
  it("ADMIN / MEMBER / VIEWER を受理する", () => {
    expect(roleSchema.safeParse("ADMIN").success).toBe(true);
    expect(roleSchema.safeParse("MEMBER").success).toBe(true);
    expect(roleSchema.safeParse("VIEWER").success).toBe(true);
  });

  it("未知のロールを拒否する", () => {
    expect(roleSchema.safeParse("SUPER").success).toBe(false);
  });
});

describe("userAdminUpdateBodySchema", () => {
  it("正常系: role のみ指定を受理する", () => {
    expect(userAdminUpdateBodySchema.safeParse({ role: "MEMBER" }).success).toBe(true);
  });

  it("正常系: isActive のみ指定を受理する", () => {
    expect(userAdminUpdateBodySchema.safeParse({ isActive: false }).success).toBe(true);
  });

  it("role も isActive も無い場合はエラー", () => {
    const result = userAdminUpdateBodySchema.safeParse({});
    expect(result.success).toBe(false);
    if (!result.success)
      expect(result.error.issues[0].message).toBe(
        "role または isActive のいずれかを指定してください",
      );
  });

  it("isActive が真偽値でない場合はエラー", () => {
    const result = userAdminUpdateBodySchema.safeParse({ isActive: "yes" });
    expect(result.success).toBe(false);
    if (!result.success)
      expect(result.error.issues[0].message).toBe("isActive は真偽値で指定してください");
  });
});

describe("userResponseSchema", () => {
  it("整形済みレスポンスを受理する", () => {
    const result = userResponseSchema.safeParse({
      id: "u1",
      name: "太郎",
      email: "taro@example.com",
      role: "ADMIN",
      isActive: true,
    });
    expect(result.success).toBe(true);
  });
});
