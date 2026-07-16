import { z } from "zod";

import { dateStringField } from "./common";

/**
 * 休日登録 body。route の責務は型・形式の検証のみ。
 * 同日重複(409) は lib（`createDayOff`）が担う。
 */
export const dayOffCreateBodySchema = z.object(
  { date: dateStringField() },
  { error: "リクエストボディが不正です" },
);

/** 休日のレスポンス形式（`date` は YYYY-MM-DD）。 */
export const dayOffResponseSchema = z.object({
  id: z.string(),
  date: z.string(),
});
