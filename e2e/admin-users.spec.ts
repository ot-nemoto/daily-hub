import { authState, expect, test } from "./fixtures";

test.describe("管理画面 アクセス制御", () => {
  test("MEMBER はアクセスできず日報作成へ遷移する（#1）", async ({ browser }) => {
    const context = await browser.newContext({ storageState: authState("tsukune") });
    const page = await context.newPage();
    await page.goto("/admin/users");
    await expect(page).toHaveURL(/\/reports\/new/);
    await context.close();
  });

  test("VIEWER はアクセスできず日次ビューへ遷移する（#2）", async ({ browser }) => {
    const context = await browser.newContext({ storageState: authState("nankotsu") });
    const page = await context.newPage();
    await page.goto("/admin/users");
    await expect(page).toHaveURL(/\/reports\/daily/);
    await context.close();
  });
});

test.describe("管理画面 ユーザー管理（ADMIN）", () => {
  test.use({ storageState: authState("bonjiri") });

  test("ユーザー一覧が表示され、日報なしユーザーの最終日報は「—」（#3/#4）", async ({ page }) => {
    await page.goto("/admin/users");
    // 列ヘッダー
    for (const h of ["名前", "メールアドレス", "ロール", "状態", "最終日報", "操作"]) {
      await expect(page.getByRole("columnheader", { name: h })).toBeVisible();
    }
    // bonjiri（自分・日報なし）の行: 最終日報が「—」
    const bonjiriRow = page.locator("tr").filter({ hasText: "bonjiri" });
    await expect(bonjiriRow).toContainText("（自分）");
    await expect(bonjiriRow.getByText("—")).toBeVisible();
  });

  test("ロールを変更して復元できる（#5/#6）", async ({ page }) => {
    await page.goto("/admin/users");
    const row = page.locator("tr").filter({ hasText: "torikawa" });
    const select = row.getByRole("combobox");

    await select.selectOption("VIEWER");
    await expect(select).toHaveValue("VIEWER");

    await select.selectOption("MEMBER");
    await expect(select).toHaveValue("MEMBER");
  });

  test("自分自身はロール変更・無効化できない（#7/#11）", async ({ page }) => {
    await page.goto("/admin/users");
    const bonjiriRow = page.locator("tr").filter({ hasText: "bonjiri" });
    // ロール select は無効
    await expect(bonjiriRow.getByRole("combobox")).toBeDisabled();
    // 無効化・削除ボタンは表示されない
    await expect(bonjiriRow.getByRole("button", { name: "無効化" })).toHaveCount(0);
    await expect(bonjiriRow.getByRole("button", { name: "削除" })).toHaveCount(0);
  });

  test("無効化・再有効化と無効化ユーザーの表示切替（#8/#10/#12/#13/#14）", async ({ page }) => {
    await page.goto("/admin/users");

    // #12: 無効化ユーザー（sunagimo）はデフォルト非表示
    await expect(page.locator("tr").filter({ hasText: "sunagimo" })).toHaveCount(0);

    // #8: torikawa を無効化 → デフォルト一覧から消える
    await page
      .locator("tr")
      .filter({ hasText: "torikawa" })
      .getByRole("button", { name: "無効化" })
      .click();
    await expect(page.locator("tr").filter({ hasText: "torikawa" })).toHaveCount(0);

    // #13: 「無効化ユーザーを表示」ON → sunagimo・torikawa が表示される
    await page.getByText("無効化ユーザーを表示").click();
    await expect(page.locator("tr").filter({ hasText: "sunagimo" })).toBeVisible();
    const torikawaRow = page.locator("tr").filter({ hasText: "torikawa" });
    await expect(torikawaRow).toBeVisible();
    await expect(torikawaRow).toContainText("無効");

    // #10: torikawa を再有効化 → 状態が有効に戻る
    await torikawaRow.getByRole("button", { name: "有効化" }).click();
    await expect(torikawaRow).toContainText("有効");

    // #14: 表示 OFF → 無効化ユーザー（sunagimo）が消える
    await page.getByText("無効化ユーザーを表示").click();
    await expect(page.locator("tr").filter({ hasText: "sunagimo" })).toHaveCount(0);
  });
});
