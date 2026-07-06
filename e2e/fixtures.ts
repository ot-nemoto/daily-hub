import { expect, test } from "@playwright/test";

/** シードのテストユーザー共通パスワード（prisma/seed.ts と一致させる） */
export const SEED_PASSWORD = "Yakitori2026";

/** ロール別セッション（storageState）の保存先 */
export const AUTH_DIR = "e2e/.auth";

export type Role = "bonjiri" | "tsukune" | "tebasaki" | "nankotsu" | "sunagimo" | "torikawa";

export function authState(role: Role | string): string {
  return `${AUTH_DIR}/${role}.json`;
}

export { expect, test };
