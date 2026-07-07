import { authState, expect, test } from "./fixtures";

test.use({ storageState: authState("tsukune") });

test.describe("ヘッダー（MEMBER）", () => {
  test("ナビ項目が表示される", async ({ page }) => {
    await page.goto("/reports/daily");
    const nav = page.getByRole("navigation");
    await expect(nav.getByRole("link", { name: "日報作成" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "日次ビュー" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "月次ビュー" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "提出状況" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "休日管理" })).toBeVisible();
    // MEMBER には管理メニューは出ない
    await expect(nav.getByRole("link", { name: "ユーザー管理" })).toHaveCount(0);
  });

  test("現在ページのナビがアクティブ表示になる", async ({ page }) => {
    // 非アクティブは hover:bg-zinc-100 を含むため、クラストークン境界でアクティブを判定する
    const activeClass = /(?:^|\s)bg-zinc-100(?:\s|$)/;
    await page.goto("/reports/daily");
    await expect(page.getByRole("link", { name: "日次ビュー" })).toHaveClass(activeClass);

    await page.goto("/reports/monthly");
    await expect(page.getByRole("link", { name: "月次ビュー" })).toHaveClass(activeClass);
    await expect(page.getByRole("link", { name: "日次ビュー" })).not.toHaveClass(activeClass);
  });
});

test.describe("ヘッダー（ADMIN）", () => {
  test("ADMIN にはユーザー管理メニューが表示される", async ({ browser }) => {
    const context = await browser.newContext({ storageState: authState("bonjiri") });
    const page = await context.newPage();
    await page.goto("/reports/daily");
    await expect(
      page.getByRole("navigation").getByRole("link", { name: "ユーザー管理" }),
    ).toBeVisible();
    await context.close();
  });
});
