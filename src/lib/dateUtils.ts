/** YYYY-MM-DD 形式かつ実在する日付かを検証する */
export function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value);
  if (isNaN(date.getTime())) return false;
  // ロールオーバー（2/29 → 3/1 など）を検出するため、パース後の値と照合する
  const [y, m, d] = value.split("-").map(Number);
  return date.getUTCFullYear() === y && date.getUTCMonth() + 1 === m && date.getUTCDate() === d;
}

/** YYYY-MM 形式かつ実在する月かを検証する */
export function isValidMonth(value: string): boolean {
  if (!/^\d{4}-\d{2}$/.test(value)) return false;
  const mon = Number(value.split("-")[1]);
  return mon >= 1 && mon <= 12;
}
