import { z } from "zod";

import { dateStringField } from "./common";

/**
 * 祝日登録 body。route の責務は型・形式の検証のみ。
 * 同日重複(409) は lib（`createHoliday`）が担う。`name` は任意（最大50文字）。
 */
export const holidayCreateBodySchema = z.object(
  {
    date: dateStringField(),
    name: z
      .string()
      .max(50, { error: "name は50文字以内で入力してください" })
      .nullish()
      .meta({ description: "祝日の名称（任意・最大50文字）" }),
  },
  { error: "リクエストボディが不正です" },
);

/** 祝日のレスポンス形式（`date` は YYYY-MM-DD、`name` は未設定なら null）。 */
export const holidayResponseSchema = z.object({
  id: z.string(),
  date: z.string(),
  name: z.string().nullable(),
});
