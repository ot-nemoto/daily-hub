/** YYYY-MM-DD 形式かつ実在する日付かを検証する */
export function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  // ロールオーバー（2/29 → 3/1 など）を検出するため、パース後の値と照合する
  const [y, m, d] = value.split("-").map(Number);
  return date.getUTCFullYear() === y && date.getUTCMonth() + 1 === m && date.getUTCDate() === d;
}

/** 今日の UTC midnight を返す（Report.date の保存形式に合わせた基準日用） */
export function startOfTodayUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/** YYYY-MM 形式かつ実在する月かを検証する */
export function isValidMonth(value: string): boolean {
  if (!/^\d{4}-\d{2}$/.test(value)) return false;
  const mon = Number(value.split("-")[1]);
  return mon >= 1 && mon <= 12;
}

/** YYYY-MM-DD 形式の日付を「YYYY年M月D日」形式に変換する */
export function formatDateJa(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return `${year}年${month}月${day}日`;
}

/** YYYY-MM 形式の月を「YYYY年M月」形式に変換する */
export function formatMonthJa(month: string): string {
  const [year, mon] = month.split("-").map(Number);
  return `${year}年${mon}月`;
}

/** 今日の日付を YYYY-MM-DD 形式で返す（ローカル時刻基準） */
export function today(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** 今月を YYYY-MM 形式で返す（ローカル時刻基準） */
export function currentMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

/** YYYY-MM 形式の月から月初・月末の日付範囲を返す */
export function monthRange(month: string): { from: string; to: string } {
  const [year, mon] = month.split("-").map(Number);
  const lastDay = new Date(year, mon, 0).getDate();
  return {
    from: `${month}-01`,
    to: `${month}-${String(lastDay).padStart(2, "0")}`,
  };
}
