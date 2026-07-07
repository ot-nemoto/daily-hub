import { authState, expect, test } from "./fixtures";

test.use({ storageState: authState("tsukune") });

test.describe("月次ビュー", () => {
  test("デフォルトで自分の今月分の日報が表示される", async ({ page }) => {
    await page.goto("/reports/monthly");
    await expect(page.getByRole("heading", { name: "月次ビュー" })).toBeVisible();
    // ユーザー選択トリガーが自分（tsukune）
    await expect(page.locator("#author-trigger")).toContainText("tsukune");
    await expect(page.getByText("tsukune").first()).toBeVisible();
  });

  test("日報のない月では空状態を表示する", async ({ page }) => {
    await page.goto("/reports/monthly?from=2099-01-01&to=2099-01-31");
    await expect(page.getByText(/日報はありません/)).toBeVisible();
  });

  test("ユーザー絞り込みで他ユーザーの日報に切り替えできる", async ({ page }) => {
    await page.goto("/reports/monthly");
    await page.locator("#author-trigger").click();
    await page.getByRole("textbox", { name: "ユーザーを絞り込む" }).fill("teba");
    await page.getByRole("option", { name: "tebasaki" }).click();

    await expect(page.locator("#author-trigger")).toContainText("tebasaki");
    await expect(page.getByText("tebasaki").first()).toBeVisible();
  });

  test("表示フィールドの複数選択・固定順表示が機能する", async ({ page }) => {
    await page.goto("/reports/monthly");
    await page.getByRole("button", { name: "本日の作業" }).click();
    await page.getByRole("button", { name: "明日の予定" }).click();

    const firstCard = page.locator("dl").first();
    await expect(firstCard).toHaveText(/本日の作業[\s\S]*明日の予定[\s\S]*感想\/課題\/問題点/);
  });
});
