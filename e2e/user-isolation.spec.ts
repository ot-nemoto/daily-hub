import { authState, expect, test } from "./fixtures";

// tebasaki 視点で、他ユーザー（tsukune）のデータ・操作が分離されていることを確認する
test.describe("ユーザー分離（tebasaki 視点）", () => {
  test.use({ storageState: authState("tebasaki") });

  test("他ユーザーの日報には編集ボタンが表示されない（#1/#2）", async ({ page }) => {
    await page.goto("/reports/daily");
    await page.getByRole("searchbox", { name: "日報を検索" }).fill("tsukune");
    await expect(page.getByRole("button", { name: "詳細" })).toHaveCount(1);
    // tsukune の日報カードに編集ボタンは出ない（詳細のみ）
    await expect(page.getByRole("button", { name: "編集" })).toHaveCount(0);

    // 詳細モーダルを開いても編集ボタンは出ない（モーダル側の権限も検証）
    await page.getByRole("button", { name: "詳細" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("button", { name: "編集" })).toHaveCount(0);
  });

  test("他ユーザーのコメントには削除ボタンが表示されない（#3）", async ({ page }) => {
    // tebasaki 自身の日報を開く（シードで tsukune からのコメントあり）
    await page.goto("/reports/daily");
    await page.getByRole("searchbox", { name: "日報を検索" }).fill("tebasaki");
    await expect(page.getByRole("button", { name: "詳細" })).toHaveCount(1);
    await page.getByRole("button", { name: "詳細" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // tsukune のコメント行に削除ボタンが無い
    const tsukuneComment = dialog.locator("li").filter({ hasText: "tsukune" });
    await expect(tsukuneComment).toBeVisible();
    await expect(tsukuneComment.getByRole("button", { name: "削除" })).toHaveCount(0);
  });

  test("他ユーザーの APIキーは見えない（#4）", async ({ page }) => {
    await page.goto("/reports/daily");
    await page.getByRole("button", { name: "個人設定を開く" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    // tebasaki はキー未生成 → 「生成する」が表示され、tsukune のキーは表示されない
    await expect(dialog.getByRole("button", { name: "生成する" })).toBeVisible();
  });
});
