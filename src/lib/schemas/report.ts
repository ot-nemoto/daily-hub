import { z } from "zod";

import { dateStringField } from "./common";

const workContent = z
  .string({ error: "workContent は必須です" })
  .min(1, { error: "workContent は必須です" })
  .max(5000, { error: "workContent は5000文字以内で入力してください" });

const tomorrowPlan = z
  .string({ error: "tomorrowPlan は必須です" })
  .min(1, { error: "tomorrowPlan は必須です" })
  .max(5000, { error: "tomorrowPlan は5000文字以内で入力してください" });

const notes = z.string().max(5000, { error: "notes は5000文字以内で入力してください" }).default("");

/**
 * 日報の作成 body。route の責務は型・形式の検証のみ。
 * 同日重複(409) は lib（`createReport`/`upsertReportByAuthorId`）が担う。
 */
export const reportCreateBodySchema = z.object(
  { date: dateStringField(), workContent, tomorrowPlan, notes },
  { error: "リクエストボディが不正です" },
);

/** 日報の更新 body（`date` は変更しない）。 */
export const reportUpdateBodySchema = z.object(
  { workContent, tomorrowPlan, notes },
  { error: "リクエストボディが不正です" },
);

/** 日報のレスポンス形式（`date` は YYYY-MM-DD）。 */
export const reportResponseSchema = z.object({
  id: z.string(),
  date: z.string(),
  authorId: z.string(),
  authorName: z.string(),
  workContent: z.string(),
  tomorrowPlan: z.string(),
  notes: z.string(),
});
