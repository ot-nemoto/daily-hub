import { authState, expect, test } from "./fixtures";

test.describe("認証・リダイレクト", () => {
  test("未ログインで保護ページにアクセスするとログインへリダイレクトされる", async ({
    browser,
  }) => {
    // 認証なしのコンテキストで検証
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await context.newPage();
    await page.goto("/reports/daily");
    await expect(page).toHaveURL(/\/login/);
    await context.close();
  });

  test("無効化アカウントはログイン後に auth-error へリダイレクトされる", async ({ browser }) => {
    const context = await browser.newContext({ storageState: authState("sunagimo") });
    const page = await context.newPage();
    await page.goto("/reports/daily");
    await expect(page).toHaveURL(/\/auth-error/);
    await context.close();
  });
});
