// @vitest-environment node

import { describe, expect, it } from "vitest";

import { isValidDate, isValidMonth } from "./dateUtils";

describe("isValidDate", () => {
  it("正しい日付を受け入れる", () => {
    expect(isValidDate("2025-01-01")).toBe(true);
    expect(isValidDate("2025-12-31")).toBe(true);
    expect(isValidDate("2024-02-29")).toBe(true); // 閏年
  });

  it("フォーマットが不正な値を拒否する", () => {
    expect(isValidDate("20250101")).toBe(false);   // ハイフンなし
    expect(isValidDate("2025/01/01")).toBe(false); // スラッシュ区切り
    expect(isValidDate("25-01-01")).toBe(false);   // 年2桁
    expect(isValidDate("2025-1-1")).toBe(false);   // ゼロ埋めなし
    expect(isValidDate("")).toBe(false);
  });

  it("存在しない日付を拒否する", () => {
    expect(isValidDate("2025-02-29")).toBe(false); // 平年の2月29日
    expect(isValidDate("2025-04-31")).toBe(false); // 4月31日
    expect(isValidDate("2025-13-01")).toBe(false); // 13月
    expect(isValidDate("2025-00-01")).toBe(false); // 0月
  });
});

describe("isValidMonth", () => {
  it("正しい月を受け入れる", () => {
    expect(isValidMonth("2025-01")).toBe(true);
    expect(isValidMonth("2025-12")).toBe(true);
    expect(isValidMonth("2000-06")).toBe(true);
  });

  it("フォーマットが不正な値を拒否する", () => {
    expect(isValidMonth("202501")).toBe(false);   // ハイフンなし
    expect(isValidMonth("2025/01")).toBe(false);  // スラッシュ区切り
    expect(isValidMonth("25-01")).toBe(false);    // 年2桁
    expect(isValidMonth("2025-1")).toBe(false);   // ゼロ埋めなし
    expect(isValidMonth("")).toBe(false);
  });

  it("範囲外の月を拒否する", () => {
    expect(isValidMonth("2025-00")).toBe(false); // 0月
    expect(isValidMonth("2025-13")).toBe(false); // 13月
  });
});
