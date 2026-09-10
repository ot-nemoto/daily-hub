import { describe, expect, it } from "vitest";
import {
  DEFAULT_PERIOD,
  formatDateLabel,
  isPeriod,
  PERIOD_DAYS,
  PERIODS,
  parseYmd,
  periodStart,
  shiftPeriod,
  shiftYmd,
  toYmd,
} from "./statusPeriod";

describe("PERIODS", () => {
  it("PERIOD_DAYS と同じ順序・日数ラベルを持つ", () => {
    expect(PERIODS.map((p) => p.key)).toEqual(Object.keys(PERIOD_DAYS));
    expect(PERIODS.map((p) => p.label)).toEqual(["7日", "14日", "30日", "45日", "60日", "90日"]);
  });

  it("DEFAULT_PERIOD は定義済みの幅", () => {
    expect(isPeriod(DEFAULT_PERIOD)).toBe(true);
  });
});

describe("isPeriod", () => {
  it("正常系: 定義済みキーは true", () => {
    for (const key of Object.keys(PERIOD_DAYS)) expect(isPeriod(key)).toBe(true);
  });

  it("異常系: 未定義・空・undefined は false", () => {
    expect(isPeriod("4w")).toBe(false);
    expect(isPeriod("")).toBe(false);
    expect(isPeriod(undefined)).toBe(false);
    // プロトタイプのプロパティ名を誤認しない
    expect(isPeriod("toString")).toBe(false);
  });
});

describe("parseYmd", () => {
  it("正常系: UTC 0 時の Date を返す", () => {
    expect(parseYmd("2026-09-10")?.toISOString()).toBe("2026-09-10T00:00:00.000Z");
  });

  it("異常系: 形式違反・存在しない日付・undefined は null", () => {
    expect(parseYmd("2026/09/10")).toBeNull();
    expect(parseYmd("2026-02-30")).toBeNull();
    expect(parseYmd("")).toBeNull();
    expect(parseYmd(undefined)).toBeNull();
  });
});

describe("toYmd", () => {
  it("UTC 基準で YYYY-MM-DD を返す", () => {
    expect(toYmd(new Date("2026-09-10T23:59:59.000Z"))).toBe("2026-09-10");
  });
});

describe("shiftYmd", () => {
  it("正常系: 前後にずらせる", () => {
    expect(shiftYmd("2026-09-10", -1)).toBe("2026-09-09");
    expect(shiftYmd("2026-09-10", 7)).toBe("2026-09-17");
  });

  it("境界値: 月またぎ・年またぎ・うるう日", () => {
    expect(shiftYmd("2026-09-01", -1)).toBe("2026-08-31");
    expect(shiftYmd("2026-01-01", -1)).toBe("2025-12-31");
    expect(shiftYmd("2028-02-28", 1)).toBe("2028-02-29");
    expect(shiftYmd("2026-12-31", 1)).toBe("2027-01-01");
  });
});

describe("periodStart", () => {
  it("base を含めて days 日分の左端を返す", () => {
    expect(periodStart("2026-09-10", "1w")).toBe("2026-09-04");
    expect(periodStart("2026-09-10", "2w")).toBe("2026-08-28");
    expect(periodStart("2026-09-10", "3m")).toBe("2026-06-13");
  });
});

describe("shiftPeriod", () => {
  const today = "2026-09-10";

  it("正常系: 過去方向は幅ぶん戻る", () => {
    expect(shiftPeriod("2026-09-10", "2w", -1, today)).toBe("2026-08-27");
    expect(shiftPeriod("2026-09-10", "1m", -1, today)).toBe("2026-08-11");
  });

  it("正常系: 未来方向は幅ぶん進む", () => {
    expect(shiftPeriod("2026-08-01", "2w", 1, today)).toBe("2026-08-15");
  });

  it("境界値: 未来方向は today を超えない", () => {
    expect(shiftPeriod("2026-09-01", "2w", 1, today)).toBe(today);
  });

  it("異常系: すでに today 以降なら未来方向は null", () => {
    expect(shiftPeriod(today, "2w", 1, today)).toBeNull();
    expect(shiftPeriod("2026-09-11", "2w", 1, today)).toBeNull();
  });

  it("today 以降でも過去方向へは戻れる", () => {
    expect(shiftPeriod(today, "1w", -1, today)).toBe("2026-09-03");
  });
});

describe("formatDateLabel", () => {
  it("M/D(曜) 形式（ゼロ埋めなし・UTC 曜日）", () => {
    expect(formatDateLabel(new Date("2026-09-10T00:00:00.000Z"))).toBe("9/10(木)");
    expect(formatDateLabel(new Date("2026-01-04T00:00:00.000Z"))).toBe("1/4(日)");
  });
});
