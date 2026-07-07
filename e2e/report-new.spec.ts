import { authState, expect, test, todayStr } from "./fixtures";

test.use({ storageState: authState("tsukune") });

// ビュー・他スライス（api の 2099-03）と衝突しない未来日付を使う
const CREATE_DATE = "2099-04-10";
const DUP_DATE = "2099-04-20";

test.describe("日報作成", () => {
  test("日付のデフォルトは今日（#1）", async ({ page }) => {
    await page.goto("/reports/new");
    await expect(page.locator("#date")).toHaveValue(todayStr());
  });

  test("作成すると登録月の月次ビューに遷移し、日次にも反映される（#2/#3）", async ({ page }) => {
    const notes = `E2E作成メモ ${Date.now()}`;
    await page.goto("/reports/new");
    await page.locator("#date").fill(CREATE_DATE);
    await page.locator("#workContent").fill("E2E作業");
    await page.locator("#tomorrowPlan").fill("E2E予定");
    await page.locator("#notes").fill(notes);
    await page.getByRole("button", { name: "日報を作成" }).click();

    // 登録月（2099-04）の月次ビューへ遷移し、作成した日報が表示される
    await expect(page).toHaveURL(/\/reports\/monthly\?from=2099-04-01/);
    await expect(page.getByText(CREATE_DATE)).toBeVisible();
    await expect(page.getByText(notes)).toBeVisible();

    // 日次ビュー（該当日）にも反映される
    await page.goto(`/reports/daily?date=${CREATE_DATE}`);
    await expect(page.getByText(notes)).toBeVisible();
  });

  test("本日の作業内容が空だと送信できない（#4）", async ({ page }) => {
    await page.goto("/reports/new");
    await page.locator("#date").fill("2099-05-01");
    await page.locator("#tomorrowPlan").fill("予定のみ入力");
    // workContent は空のまま送信
    await page.getByRole("button", { name: "日報を作成" }).click();

    await expect(page.locator("#workContent")).toHaveJSProperty("validity.valueMissing", true);
    await expect(page).toHaveURL(/\/reports\/new/);
  });

  test("明日の予定が空だと送信できない（#5）", async ({ page }) => {
    await page.goto("/reports/new");
    await page.locator("#date").fill("2099-05-01");
    await page.locator("#workContent").fill("作業のみ入力");
    // tomorrowPlan は空のまま送信
    await page.getByRole("button", { name: "日報を作成" }).click();

    await expect(page.locator("#tomorrowPlan")).toHaveJSProperty("validity.valueMissing", true);
    await expect(page).toHaveURL(/\/reports\/new/);
  });

  test("同じ日付に2件目を作成すると重複エラーになる（#6）", async ({ page }) => {
    // 1件目（成功）
    await page.goto("/reports/new");
    await page.locator("#date").fill(DUP_DATE);
    await page.locator("#workContent").fill("重複テスト1");
    await page.locator("#tomorrowPlan").fill("重複テスト1");
    await page.getByRole("button", { name: "日報を作成" }).click();
    await expect(page).toHaveURL(/\/reports\/monthly/);

    // 2件目（同じ日付 → 409 エラー表示・遷移しない）
    await page.goto("/reports/new");
    await page.locator("#date").fill(DUP_DATE);
    await page.locator("#workContent").fill("重複テスト2");
    await page.locator("#tomorrowPlan").fill("重複テスト2");
    await page.getByRole("button", { name: "日報を作成" }).click();

    await expect(page.getByText("この日付の日報はすでに作成済みです")).toBeVisible();
    await expect(page).toHaveURL(/\/reports\/new/);
  });
});

test.describe("日報作成（アクセス制御）", () => {
  test("VIEWER はアクセスできず日次ビューへリダイレクトされる（#8）", async ({ browser }) => {
    const context = await browser.newContext({ storageState: authState("nankotsu") });
    const page = await context.newPage();
    await page.goto("/reports/new");
    await expect(page).toHaveURL(/\/reports\/daily/);
    await context.close();
  });
});
