/**
 * API レスポンスからエラーメッセージを取り出す。
 * - `{ error: string }` 形式 → そのまま返す
 * - JSON パース失敗・形式不一致 → fallback を返す
 */
export async function parseApiError(res: Response, fallback: string): Promise<string> {
  const json = await res.json().catch(() => ({}));
  if (typeof json.error === "string") return json.error;
  return fallback;
}
