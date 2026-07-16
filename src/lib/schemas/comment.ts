import { z } from "zod";

/**
 * コメント作成 body。route の責務は型・字数の検証のみ。
 * 対象日報の存在(404) は lib（`createComment`）が担う。
 */
export const commentCreateBodySchema = z.object(
  {
    body: z
      .string({ error: "body は必須です" })
      .min(1, { error: "body は必須です" })
      .max(1000, { error: "body は1000文字以内で入力してください" }),
  },
  { error: "リクエストボディが不正です" },
);

/** コメントのレスポンス形式（`createdAt` は ISO 文字列）。 */
export const commentResponseSchema = z.object({
  id: z.string(),
  body: z.string(),
  authorId: z.string(),
  authorName: z.string(),
  createdAt: z.string(),
});
