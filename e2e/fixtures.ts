import { readFileSync } from "node:fs";
import { join } from "node:path";

import { expect, test } from "@playwright/test";

/** シードのテストユーザー共通パスワード（prisma/seed.ts と同じ環境変数を参照する） */
export function seedPassword(): string {
  const value = process.env.SEED_PASSWORD;
  if (!value) {
    throw new Error("SEED_PASSWORD が未設定です。.env を確認してください（.env.example 参照）。");
  }
  return value;
}

// seed が書き出した APIキーの受け渡し先（prisma/seed.ts の SEED_KEYS_FILE と同じファイルを指す）。
// cwd ではなくこのファイルの位置から解決する。
const SEED_KEYS_FILE = join(__dirname, ".seed-keys.json");

export type SeedApiKeyRole = "bonjiri" | "tsukune" | "nankotsu";

const SEED_API_KEY_ROLES = ["bonjiri", "tsukune", "nankotsu"] as const;

function loadSeedKeys(): Record<SeedApiKeyRole, string> {
  let raw: string;
  try {
    raw = readFileSync(SEED_KEYS_FILE, "utf-8");
  } catch {
    throw new Error(
      `${SEED_KEYS_FILE} が見つかりません。SEED_ALLOW_DESTRUCTIVE=1 npx tsx prisma/seed.ts を実行してください。`,
    );
  }
  // 壊れた JSON はそのまま SyntaxError を投げさせる（「ファイルが無い」と誤表示しない）
  const parsed = JSON.parse(raw) as Partial<Record<SeedApiKeyRole, string>>;
  // 欠けたキーをそのまま返すと Bearer undefined で 401 になり、原因が分かりにくい
  const missing = SEED_API_KEY_ROLES.filter((role) => !parsed[role]);
  if (missing.length > 0) {
    throw new Error(
      `${SEED_KEYS_FILE} に ${missing.join(", ")} のキーがありません。シードを再実行してください。`,
    );
  }
  return parsed as Record<SeedApiKeyRole, string>;
}

let seedKeys: Record<SeedApiKeyRole, string> | undefined;

/**
 * シードが発行した APIキーを取得する。
 * 値は実行ごとに変わるため seed の出力を読む（テスト本体から遅延呼び出しすること）。
 */
export function seedApiKey(role: SeedApiKeyRole): string {
  seedKeys ??= loadSeedKeys();
  return seedKeys[role];
}

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
