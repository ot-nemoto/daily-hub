import { expect, test } from "@playwright/test";

/** シードのテストユーザー共通パスワード（prisma/seed.ts と一致させる） */
export const SEED_PASSWORD = "Yakitori2026";

/** ロール別セッション（storageState）の保存先 */
export const AUTH_DIR = "e2e/.auth";

export type Role = "bonjiri" | "tsukune" | "tebasaki" | "nankotsu" | "sunagimo" | "torikawa";

export function authState(role: Role | string): string {
  return `${AUTH_DIR}/${role}.json`;
}

// ローカル日付の「今日(YYYY-MM-DD)」。フォームの date デフォルト（lib/dateUtils.today()）と一致する。
export function todayStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export { expect, test };
