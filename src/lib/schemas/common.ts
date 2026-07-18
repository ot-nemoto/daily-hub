import { z } from "zod";

/** エラーレスポンス `{ error: string }`（OpenAPI ドキュメント用）。 */
export const errorResponseSchema = z.object({ error: z.string() });

/**
 * `YYYY-MM-DD` 形式かつ実在する日付を検証する共有フィールド。
 * 日報・休日の `date` で共有する。`field` はエラーメッセージのラベル。
 */
export function dateStringField(field = "date") {
  return z
    .string({ error: `${field} は必須です` })
    .regex(/^\d{4}-\d{2}-\d{2}$/, { error: `${field} は YYYY-MM-DD 形式で入力してください` })
    .refine(
      (value) => {
        const parsed = new Date(`${value}T00:00:00.000Z`);
        return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
      },
      { error: `${field} は実在する日付を入力してください` },
    )
    .meta({ description: "YYYY-MM-DD 形式の日付" });
}
