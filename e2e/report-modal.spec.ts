import type { Page } from "@playwright/test";
import { authState, expect, test } from "./fixtures";

test.use({ storageState: authState("tsukune") });

// 日次ビューで指定ユーザーの日報カードの「詳細」からモーダルを開く。
// 検索で1件に絞ってから開くことで対象を一意にする。
async function openReportModal(page: Page, authorName: string) {
  await page.goto("/reports/daily");
  await page.getByRole("searchbox", { name: "日報を検索" }).fill(authorName);
  await expect(page.getByRole("button", { name: "詳細" })).toHaveCount(1);
  await page.getByRole("button", { name: "詳細" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  return dialog;
}

test.describe("日報詳細・編集モーダル", () => {
  test("詳細モーダルに内容が表示され、自分の日報には編集ボタンがある（#1/#2）", async ({
    page,
  }) => {
    const dialog = await openReportModal(page, "tsukune");
    await expect(dialog.getByText("本日の作業")).toBeVisible();
    await expect(dialog.getByText("明日の予定")).toBeVisible();
    await expect(dialog.getByRole("button", { name: "編集" })).toBeVisible();
  });

  test("他ユーザーの日報には編集ボタンがない（#3）", async ({ page }) => {
    const dialog = await openReportModal(page, "tebasaki");
    await expect(dialog.getByRole("button", { name: "編集" })).toHaveCount(0);
  });

  test("編集ボタンで編集フォームに切り替わり、保存で反映される（#4/#5）", async ({ page }) => {
    const dialog = await openReportModal(page, "tsukune");
    await dialog.getByRole("button", { name: "編集" }).click();

    // 編集フォームに切り替わる
    const workContent = dialog.getByLabel("本日の作業内容");
    await expect(workContent).toBeVisible();

    const updated = `E2E編集: 本日の作業を更新 ${Date.now()}`;
    await workContent.fill(updated);
    await dialog.getByRole("button", { name: "保存する" }).click();

    // 詳細表示に戻り、更新内容が表示される
    await expect(dialog.getByRole("button", { name: "編集" })).toBeVisible();
    await expect(dialog.getByText(updated)).toBeVisible();
  });

  test("編集フォームのキャンセルで詳細表示に戻る（#6）", async ({ page }) => {
    const dialog = await openReportModal(page, "tsukune");
    await dialog.getByRole("button", { name: "編集" }).click();
    await expect(dialog.getByRole("button", { name: "保存する" })).toBeVisible();

    await dialog.getByRole("button", { name: "キャンセル" }).click();

    // 詳細表示に戻る（フォームは消え、編集ボタンが再表示）
    await expect(dialog.getByRole("button", { name: "保存する" })).toHaveCount(0);
    await expect(dialog.getByRole("button", { name: "編集" })).toBeVisible();
  });

  test("コメントがない日報は空状態を表示する（#7）", async ({ page }) => {
    const dialog = await openReportModal(page, "torikawa");
    await expect(dialog.getByText("コメントはまだありません")).toBeVisible();
  });

  test("コメント追加→表示→削除、カード件数が同期する（#8/#9/#11/#12）", async ({ page }) => {
    await page.goto("/reports/daily");
    await page.getByRole("searchbox", { name: "日報を検索" }).fill("tsukune");
    await expect(page.getByRole("button", { name: "詳細" })).toHaveCount(1);
    // シードで tsukune の今日の日報にはコメント3件
    await expect(page.getByText("💬 3")).toBeVisible();

    // モーダルを開いてコメント追加
    await page.getByRole("button", { name: "詳細" }).click();
    const dialog = page.getByRole("dialog");
    const body = `E2Eコメント ${Date.now()}`;
    await dialog.getByLabel("コメントを追加").fill(body);
    await dialog.getByRole("button", { name: "コメントする" }).click();

    // 一覧に追加され、自分のコメントには削除ボタンがある（#8/#9）
    await expect(dialog.getByText(body)).toBeVisible();
    await expect(dialog.getByRole("button", { name: "削除" })).toHaveCount(1);

    // 閉じてカード件数が +1（#12）
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(page.getByText("💬 4")).toBeVisible();

    // 再度開いて削除（#11）
    await page.getByRole("button", { name: "詳細" }).click();
    await expect(dialog.getByText(body)).toBeVisible();
    await dialog.getByRole("button", { name: "削除" }).click();
    await expect(dialog.getByText(body)).toHaveCount(0);

    // 閉じてカード件数が元に戻る（#12）
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(page.getByText("💬 3")).toBeVisible();
  });

  test("他ユーザーのコメントには削除ボタンがない（#10）", async ({ page }) => {
    // tsukune の日報には他ユーザー（tebasaki 等）からのコメントがあるが、削除ボタンは出ない
    const dialog = await openReportModal(page, "tsukune");
    await expect(dialog.getByText("tebasaki")).toBeVisible();
    await expect(dialog.getByRole("button", { name: "削除" })).toHaveCount(0);
  });

  test("×・背景クリック・Escape でモーダルを閉じられる（#13）", async ({ page }) => {
    // ×ボタン
    let dialog = await openReportModal(page, "torikawa");
    await dialog.getByRole("button", { name: "閉じる" }).click();
    await expect(dialog).toHaveCount(0);

    // 背景クリック（パネル外の左上をクリック）
    dialog = await openReportModal(page, "torikawa");
    await dialog
      .locator("div[aria-hidden='true']")
      .first()
      .click({ position: { x: 5, y: 5 } });
    await expect(dialog).toHaveCount(0);

    // Escape キー
    dialog = await openReportModal(page, "torikawa");
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
  });
});
