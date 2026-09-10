/**
 * 提出状況ビューの期間指定。
 * URL 契約は `base`（表示範囲の右端・YYYY-MM-DD）＋ `period`（表示幅）で、日付はすべて UTC 基準で扱う。
 */

export type Period = "1w" | "2w" | "1m" | "1.5m" | "2m" | "3m";

export const PERIOD_DAYS: Record<Period, number> = {
  "1w": 7,
  "2w": 14,
  "1m": 30,
  "1.5m": 45,
  "2m": 60,
  "3m": 90,
};

export const DEFAULT_PERIOD: Period = "2w";

/** 表示幅ボタンの並び順とラベル（日数表記） */
export const PERIODS: { key: Period; label: string }[] = (Object.keys(PERIOD_DAYS) as Period[]).map(
  (key) => ({ key, label: `${PERIOD_DAYS[key]}日` }),
);

export function isPeriod(value: string | undefined): value is Period {
  return value !== undefined && Object.hasOwn(PERIOD_DAYS, value);
}

/** YYYY-MM-DD を UTC 0 時の Date に変換する。形式違反・存在しない日付は null */
export function parseYmd(value: string | undefined): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime()) || toYmd(d) !== value) return null;
  return d;
}

export function toYmd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** 今日（UTC 0 時）を YYYY-MM-DD で返す */
export function todayYmd(): string {
  return toYmd(new Date());
}

/** YYYY-MM-DD を delta 日ずらす（月またぎ・年またぎは Date に委ねる） */
export function shiftYmd(ymd: string, delta: number): string {
  const d = new Date(`${ymd}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return toYmd(d);
}

/** 表示範囲の左端（base を含めて days 日分） */
export function periodStart(base: string, period: Period): string {
  return shiftYmd(base, -(PERIOD_DAYS[period] - 1));
}

/**
 * 表示幅ぶんスライドした右端を返す。
 * 未来方向は today を超えないよう丸め、すでに today なら null（移動不可）を返す。
 */
export function shiftPeriod(
  base: string,
  period: Period,
  direction: -1 | 1,
  today: string,
): string | null {
  if (direction === 1 && base >= today) return null;
  const next = shiftYmd(base, direction * PERIOD_DAYS[period]);
  return direction === 1 && next > today ? today : next;
}

/** 列見出し・範囲表示用の `M/D(曜)` 形式 */
export function formatDateLabel(d: Date): string {
  const m = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  const dow = ["日", "月", "火", "水", "木", "金", "土"][d.getUTCDay()];
  return `${m}/${day}(${dow})`;
}
