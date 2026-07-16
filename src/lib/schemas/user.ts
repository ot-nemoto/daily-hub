import { z } from "zod";

/** ユーザーロール。Prisma の `Role` enum と一致させる。 */
export const roleSchema = z.enum(["ADMIN", "MEMBER", "VIEWER"]);

/** ユーザーのレスポンス形式（admin 一覧・プロフィール共通）。 */
export const userResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  role: roleSchema,
  isActive: z.boolean(),
});

/**
 * admin によるユーザー更新 body（`role` / `isActive` の少なくとも一方が必須）。
 * 自分自身の降格・無効化などの不整合(403) は lib（`updateUserAdmin`）が担う。
 */
export const userAdminUpdateBodySchema = z
  .object(
    {
      role: roleSchema.optional(),
      isActive: z.boolean({ error: "isActive は真偽値で指定してください" }).optional(),
    },
    { error: "リクエストボディが不正です" },
  )
  .refine((value) => value.role !== undefined || value.isActive !== undefined, {
    error: "role または isActive のいずれかを指定してください",
  });
