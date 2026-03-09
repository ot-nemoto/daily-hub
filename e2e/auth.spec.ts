import { expect, test } from "./fixtures";

test.describe("認証フロー", () => {
	test("ログイン成功 → 日次ビューへリダイレクト", async ({ page }) => {
		await page.goto("/login");
		await page.fill("#email", "tanaka@example.com");
		await page.fill("#password", "password123");
		await page.click('button[type="submit"]');

		await page.waitForURL("**/reports/daily");
		await expect(page).toHaveURL(/\/reports\/daily/);
	});

	test("ログイン失敗（誤パスワード）→ エラーメッセージ表示", async ({
		page,
	}) => {
		await page.goto("/login");
		await page.fill("#email", "tanaka@example.com");
		await page.fill("#password", "wrongpassword");
		await page.click('button[type="submit"]');

		await expect(
			page.getByText("メールアドレスまたはパスワードが正しくありません"),
		).toBeVisible();
		await expect(page).toHaveURL(/\/login/);
	});

	test("未認証状態でアクセス → ログインページへリダイレクト", async ({
		page,
	}) => {
		await page.goto("/reports/daily");

		await page.waitForURL(/\/login/);
		await expect(page).toHaveURL(/\/login/);
	});

	test("ログアウト → ログインページへリダイレクト", async ({
		loggedInPage,
	}) => {
		await loggedInPage.goto("/reports/daily");
		await loggedInPage.click('button:has-text("ログアウト")');

		await loggedInPage.waitForURL("**/login");
		await expect(loggedInPage).toHaveURL(/\/login/);
	});
});
