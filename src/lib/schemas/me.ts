import { z } from "zod";

import { userResponseSchema } from "./user";

/** 自分のプロフィール更新 body（氏名のみ）。 */
export const meUpdateBodySchema = z.object(
  {
    name: z
      .string({ error: "name は必須です" })
      .min(1, { error: "name は必須です" })
      .max(100, { error: "name は100文字以内で入力してください" }),
  },
  { error: "リクエストボディが不正です" },
);

/** 自分のプロフィールのレスポンス形式（ユーザー共通形式）。 */
export const meResponseSchema = userResponseSchema;
