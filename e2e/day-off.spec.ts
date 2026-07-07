import { authState, expect, test } from "./fixtures";

function monthLabel(offset: number): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + offset);
  return `${d.getFullYear()}年${d.getMonth() + 1}月`;
}

test.describe("休日管理（本人）", () => {
  test.use({ storageState: authState("tsukune") });

  test("初期表示: 今月のカレンダー・ADMINユーザー選択なし（#1）", async ({ page }) => {
    await page.goto("/day-off");
    await expect(page.getByText(monthLabel(0))).toBeVisible();
    await expect(page.getByRole("button", { name: "前月" })).toBeVisible();
    // 本人は ADMIN 向けユーザー選択が出ない
    await expect(page.getByText("対象ユーザー")).toHaveCount(0);
  });

  test("日付セルのクリックで休日を登録・解除できる（#2/#3）", async ({ page }) => {
    await page.goto("/day-off");
    // 提出状況の集計期間（直近）に影響しないよう翌月で操作する
    await page.getByRole("button", { name: "翌月" }).click();
    const cell = page.getByRole("button", { name: "15", exact: true });

    await expect(cell).toHaveAttribute("aria-pressed", "false");

    await cell.click(); // 登録
    await expect(cell).toHaveAttribute("aria-pressed", "true");
    // 楽観的更新の pending 中はセルが disabled になり、次のクリックが無視される。
    // pending が解ける（enabled に戻る）まで待ってから解除する。
    await expect(cell).toBeEnabled();

    await cell.click(); // 解除
    await expect(cell).toHaveAttribute("aria-pressed", "false");
    await expect(cell).toBeEnabled();
  });

  test("月ナビゲーションで前月・翌月に切り替わる（#4）", async ({ page }) => {
    await page.goto("/day-off");
    await expect(page.getByText(monthLabel(0))).toBeVisible();

    await page.getByRole("button", { name: "翌月" }).click();
    await expect(page.getByText(monthLabel(1))).toBeVisible();

    await page.getByRole("button", { name: "前月" }).click();
    await expect(page.getByText(monthLabel(0))).toBeVisible();
  });
});

test.describe("休日管理 アクセス制御", () => {
  test("VIEWER はアクセスできず日次ビューへリダイレクトされる（#5）", async ({ browser }) => {
    const context = await browser.newContext({ storageState: authState("nankotsu") });
    const page = await context.newPage();
    await page.goto("/day-off");
    await expect(page).toHaveURL(/\/reports\/daily/);
    await context.close();
  });
});

test.describe("休日管理（ADMIN 代理設定）", () => {
  test.use({ storageState: authState("bonjiri") });

  test("ADMIN はユーザー選択が表示される（#6）", async ({ page }) => {
    await page.goto("/day-off");
    await expect(page.getByText("対象ユーザー")).toBeVisible();
    await expect(page.locator("#user-trigger")).toBeVisible();
  });

  test("ユーザーを選ぶと代理編集メッセージが表示される（#7）", async ({ page }) => {
    await page.goto("/day-off");
    await page.locator("#user-trigger").click();
    await page.getByRole("textbox", { name: "ユーザーを絞り込む" }).fill("tsukune");
    await page.getByRole("option", { name: "tsukune" }).click();

    await expect(page.getByText("さんの休日を編集しています")).toBeVisible();
    await expect(page.locator("#user-trigger")).toContainText("tsukune");
  });
});
