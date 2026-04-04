// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { currentMonth, formatDateJa, formatMonthJa, isValidDate, isValidMonth, monthRange, startOfTodayUtc, today } from "./dateUtils";

describe("startOfTodayUtc", () => {
  it("正常系: 時刻が UTC 00:00:00.000 であること", () => {
    const result = startOfTodayUtc();
    expect(result.getUTCHours()).toBe(0);
    expect(result.getUTCMinutes()).toBe(0);
    expect(result.getUTCSeconds()).toBe(0);
    expect(result.getUTCMilliseconds()).toBe(0);
  });

  it("正常系: 返り値が今日の UTC 年月日を持つこと", () => {
    const now = new Date();
    const result = startOfTodayUtc();
    expect(result.getUTCFullYear()).toBe(now.getUTCFullYear());
    expect(result.getUTCMonth()).toBe(now.getUTCMonth());
    expect(result.getUTCDate()).toBe(now.getUTCDate());
  });
});

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

describe("today", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-15T10:00:00"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("正常系: YYYY-MM-DD 形式を返す", () => {
    const result = today();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("正常系: 今日の年月日と一致する", () => {
    const result = today();
    expect(result).toBe("2025-06-15");
  });
});

describe("currentMonth", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-15T10:00:00"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("正常系: YYYY-MM 形式を返す", () => {
    const result = currentMonth();
    expect(result).toMatch(/^\d{4}-\d{2}$/);
  });

  it("正常系: 今月の年月と一致する", () => {
    const result = currentMonth();
    expect(result).toBe("2025-06");
  });
});

describe("monthRange", () => {
  it("正常系: 月初・月末の日付範囲を返す（1月）", () => {
    expect(monthRange("2025-01")).toEqual({ from: "2025-01-01", to: "2025-01-31" });
  });

  it("正常系: 月初・月末の日付範囲を返す（2月・平年）", () => {
    expect(monthRange("2025-02")).toEqual({ from: "2025-02-01", to: "2025-02-28" });
  });

  it("正常系: 月初・月末の日付範囲を返す（2月・閏年）", () => {
    expect(monthRange("2024-02")).toEqual({ from: "2024-02-01", to: "2024-02-29" });
  });

  it("正常系: 月初・月末の日付範囲を返す（12月）", () => {
    expect(monthRange("2025-12")).toEqual({ from: "2025-12-01", to: "2025-12-31" });
  });

  it("正常系: 月末日が正しくゼロ埋めされる（4月）", () => {
    expect(monthRange("2025-04")).toEqual({ from: "2025-04-01", to: "2025-04-30" });
  });
});

describe("formatDateJa", () => {
  it("正常系: YYYY-MM-DD を YYYY年M月D日 形式に変換する", () => {
    expect(formatDateJa("2026-04-04")).toBe("2026年4月4日");
  });

  it("正常系: 月・日のゼロ埋めが除去される", () => {
    expect(formatDateJa("2025-01-01")).toBe("2025年1月1日");
    expect(formatDateJa("2025-12-31")).toBe("2025年12月31日");
  });
});

describe("formatMonthJa", () => {
  it("正常系: YYYY-MM を YYYY年M月 形式に変換する", () => {
    expect(formatMonthJa("2026-04")).toBe("2026年4月");
  });

  it("正常系: 月のゼロ埋めが除去される", () => {
    expect(formatMonthJa("2025-01")).toBe("2025年1月");
    expect(formatMonthJa("2025-12")).toBe("2025年12月");
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
