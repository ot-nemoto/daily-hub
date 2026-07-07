import { authState, test } from "./fixtures";

test.use({ storageState: authState("tsukune") });

const DIR = "test-results/screens";

// @screenshot タグを付け、通常の test:e2e からは除外する（撮影専用）
test.describe("画面スクリーンショット取得", { tag: "@screenshot" }, () => {
  test("日次ビュー: デフォルト（感想/課題/問題点のみ）", async ({ page }) => {
    await page.goto("/reports/daily");
    await page.screenshot({ path: `${DIR}/daily-default.png`, fullPage: true });
  });

  test("日次ビュー: 3フィールド選択（固定順）", async ({ page }) => {
    await page.goto("/reports/daily");
    await page.getByRole("button", { name: "本日の作業" }).click();
    await page.getByRole("button", { name: "明日の予定" }).click();
    await page.screenshot({ path: `${DIR}/daily-all-fields.png`, fullPage: true });
  });

  test("月次ビュー", async ({ page }) => {
    await page.goto("/reports/monthly");
    await page.screenshot({ path: `${DIR}/monthly.png`, fullPage: true });
  });
});
