import { defineConfig, devices } from "@playwright/test";
import { config as loadEnv } from "dotenv";

loadEnv();

const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

/**
 * E2E テスト設定（ローカル専用・devcontainer 内で実行）
 *
 * - 認証は @clerk/testing でプログラム的に行い、ロール別セッションを e2e/.auth に保存する
 * - シードはグローバルセットアップでスイート開始前に1回実行する
 * - データ競合を避けるため直列実行（workers: 1）
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    // 認証セッション生成とシードを行うセットアップ
    { name: "setup", testMatch: /global\.setup\.ts/ },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["setup"],
    },
  ],
  // dev サーバーが未起動なら自動起動する。既に起動済みなら再利用する
  webServer: {
    command: "npm run dev",
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 120_000,
    // dev サーバーの stdout（Clerk 開発キー警告・ブラウザ転送ログ・SSL/pg 警告）を抑止する。
    // 起動判定は url 待ちで行うため影響なし。stderr は既定のまま（起動エラーは表示される）。
    stdout: "ignore",
  },
});
