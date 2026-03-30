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

export type FieldErrors = Record<string, string[]>;

type ParsedFieldErrors = {
  message: string;
  fieldErrors: FieldErrors;
};

/**
 * API レスポンスから flatten 形式のフィールドエラーを取り出す。
 * - `{ error: { formErrors, fieldErrors } }` 形式 → フィールドエラーを返す
 * - `{ error: string }` 形式 → message にセットし fieldErrors は空
 * - JSON パース失敗・形式不一致 → デフォルトメッセージで fieldErrors は空
 */
export async function parseFieldErrors(res: Response): Promise<ParsedFieldErrors> {
  const json = await res.json().catch(() => ({}));
  if (typeof json.error === "string") {
    return { message: json.error, fieldErrors: {} };
  }
  if (typeof json.error === "object" && json.error !== null) {
    const flat = json.error as { formErrors?: string[]; fieldErrors?: Record<string, string[]> };
    const fieldErrors = flat.fieldErrors ?? {};
    const message =
      flat.formErrors?.[0] ??
      Object.values(fieldErrors).flat()[0] ??
      "入力内容を確認してください";
    return { message, fieldErrors };
  }
  return { message: "入力内容を確認してください", fieldErrors: {} };
}
