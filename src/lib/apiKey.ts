/**
 * 外部連携 APIキーの書式とハッシュ化。
 *
 * prisma を参照しない純粋関数だけを置く。認証（apiAuth）・発行（users）・シードの
 * 三者が同じ実装を共有し、値の食い違いが起きないようにするため。
 */

const API_KEY_PREFIX = "dh_";
const API_KEY_RANDOM_BYTES = 32;
/** 表示・識別用に保存する先頭部分の長さ（`dh_` + ランダム部 5 文字） */
export const API_KEY_DISPLAY_PREFIX_LENGTH = 8;

/**
 * ランダムな APIキー文字列（`dh_` + base64url(32 bytes)）を生成する。
 * Web Crypto と btoa のみを使い、Edge / Node どちらでも動く。
 */
export function createApiKeyValue(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(API_KEY_RANDOM_BYTES));
  const base64url = btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return `${API_KEY_PREFIX}${base64url}`;
}

/**
 * APIキーを DB 保存・照合用の SHA-256（hex）に変換する。
 * キーは高エントロピー乱数で辞書攻撃が成立しないため、ソルトは使わない（where で一意に引くため）。
 * マイグレーションの `encode(sha256(convert_to(api_key, 'UTF8')), 'hex')` と同じ値になる。
 */
export async function hashApiKey(apiKey: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(apiKey));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}
