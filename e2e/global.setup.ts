import { execSync } from "node:child_process";
import { clerk, clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { expect, test as setup } from "@playwright/test";

import { authState, seedPassword } from "./fixtures";

/** シード定義に合わせたテストユーザー（パスワードは共通） */
const ROLES = [
  { key: "bonjiri", email: "bonjiri@example.com", active: true },
  { key: "tsukune", email: "tsukune@example.com", active: true },
  { key: "tebasaki", email: "tebasaki@example.com", active: true },
  { key: "nankotsu", email: "nankotsu@example.com", active: true },
  { key: "sunagimo", email: "sunagimo@example.com", active: false },
  { key: "torikawa", email: "torikawa@example.com", active: true },
] as const;

// Clerk Testing Token の準備とシード投入（スイート開始前に1回）
setup("prepare clerk and seed", async () => {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!publishableKey) {
    throw new Error(
      "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY が未設定です。E2E 実行前に .env を確認してください。",
    );
  }
  await clerkSetup({ publishableKey });
  // シードは破壊的操作のオプトインを要求する。E2E の実行自体が明示的なオプトインに当たるため
  // ここで付与する（本番 DB に対する歯止めは seed 側のシード定義外ユーザー検出が担う）。
  execSync("npx tsx prisma/seed.ts", {
    cwd: process.cwd(),
    stdio: "inherit",
    env: { ...process.env, SEED_ALLOW_DESTRUCTIVE: "1" },
  });
});

// ロールごとにログインし、セッションを storageState として保存する
for (const role of ROLES) {
  setup(`authenticate as ${role.key}`, async ({ page }) => {
    await setupClerkTestingToken({ page });
    await page.goto("/login");
    await clerk.signIn({
      page,
      signInParams: { strategy: "password", identifier: role.email, password: seedPassword() },
    });

    if (role.active) {
      // 有効ユーザーはアプリに入れることを確認
      await page.goto("/reports/daily");
      await expect(page.getByRole("heading", { name: "日次ビュー" })).toBeVisible();
    } else {
      // 無効化ユーザーは Clerk セッションのみ確立（アプリ側で auth-error にリダイレクトされる）
      await page.goto("/reports/daily");
      await expect(page).toHaveURL(/\/auth-error/);
    }

    await page.context().storageState({ path: authState(role.key) });
  });
}
