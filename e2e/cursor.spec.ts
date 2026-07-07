import { authState, expect, test } from "./fixtures";

// 代表的なインタラクティブ要素に pointer カーソルが設定されていることを確認する（UI 共通規約）
test.describe("カーソル表示（一般ユーザー）", () => {
  test.use({ storageState: authState("tsukune") });

  test("日報作成ボタンが pointer（#2）", async ({ page }) => {
    await page.goto("/reports/new");
    await expect(page.getByRole("button", { name: "日報を作成" })).toHaveCSS("cursor", "pointer");
  });

  test("表示フィールド切替ボタンが pointer（#5 相当）", async ({ page }) => {
    await page.goto("/reports/daily");
    await expect(page.getByRole("button", { name: "感想/課題/問題点" })).toHaveCSS(
      "cursor",
      "pointer",
    );
  });
});

test.describe("カーソル表示（ADMIN 管理画面）", () => {
  test.use({ storageState: authState("bonjiri") });

  test("ロール select・無効化・削除ボタンが pointer（#1）", async ({ page }) => {
    await page.goto("/admin/users");
    const row = page.locator("tr").filter({ hasText: "torikawa" });
    await expect(row.getByRole("combobox")).toHaveCSS("cursor", "pointer");
    await expect(row.getByRole("button", { name: "無効化" })).toHaveCSS("cursor", "pointer");
    await expect(row.getByRole("button", { name: "削除" })).toHaveCSS("cursor", "pointer");
  });
});
