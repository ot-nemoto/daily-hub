import type { Page } from "@playwright/test";
import { authState, expect, test } from "./fixtures";

// ヘッダーのギアアイコンから個人設定モーダルを開く（page は任意のロールのもの）
async function openSettings(page: Page) {
  await page.goto("/reports/daily");
  await page.getByRole("button", { name: "個人設定を開く" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  return dialog;
}

test.describe("個人設定（tsukune）", () => {
  test.use({ storageState: authState("tsukune") });

  test("モーダルに名前とメールが表示される（#1）", async ({ page }) => {
    const dialog = await openSettings(page);
    await expect(dialog.getByRole("heading", { name: "個人設定" })).toBeVisible();
    await expect(dialog.locator("#name")).toHaveValue("tsukune");
    await expect(dialog.getByText("tsukune@example.com")).toBeVisible();
  });

  test("メールアドレスは表示のみで編集不可（#2）", async ({ page }) => {
    const dialog = await openSettings(page);
    await expect(dialog.getByText("tsukune@example.com")).toBeVisible();
    // メールは <p> 表示で入力欄が存在しない
    await expect(dialog.locator("input[value='tsukune@example.com']")).toHaveCount(0);
  });

  test("名前を変更して保存でき、ヘッダーに反映される（#3/#4）", async ({ page }) => {
    const dialog = await openSettings(page);
    await dialog.locator("#name").fill("tsukune-updated");
    await dialog.getByRole("button", { name: "保存する" }).click();
    await expect(dialog.getByText("名前を更新しました")).toBeVisible();
    await expect(page.locator("header").getByText("tsukune-updated")).toBeVisible();

    // 元に戻す（他スライスが参照する表示名を汚さない）
    await dialog.locator("#name").fill("tsukune");
    await dialog.getByRole("button", { name: "保存する" }).click();
    await expect(page.locator("header").getByText("tsukune", { exact: true })).toBeVisible();
  });

  test("名前が空だと保存できない（#5）", async ({ page }) => {
    const dialog = await openSettings(page);
    await dialog.locator("#name").fill("");
    await dialog.getByRole("button", { name: "保存する" }).click();
    await expect(dialog.locator("#name")).toHaveJSProperty("validity.valueMissing", true);
    await expect(dialog.getByText("名前を更新しました")).toHaveCount(0);
  });

  test("名前は最大100文字で、超過は保存されない（#6）", async ({ page }) => {
    const dialog = await openSettings(page);
    const nameInput = dialog.locator("#name");
    await expect(nameInput).toHaveAttribute("maxlength", "100");
    // maxlength を回避して101文字を送信 → サーバ側 max(100) で拒否
    await nameInput.evaluate((el, v) => {
      (el as HTMLInputElement).value = v;
    }, "a".repeat(101));
    await dialog.getByRole("button", { name: "保存する" }).click();
    await expect(dialog.locator("p.text-red-600")).toBeVisible();
    await expect(dialog.getByText("名前を更新しました")).toHaveCount(0);
  });

  test("オーバーレイクリックで閉じる（#7）", async ({ page }) => {
    const dialog = await openSettings(page);
    await dialog
      .locator("div[aria-hidden='true']")
      .first()
      .click({ position: { x: 5, y: 5 } });
    await expect(dialog).toHaveCount(0);
  });

  test("Escape キーで閉じる（#8）", async ({ page }) => {
    const dialog = await openSettings(page);
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
  });
});

test.describe("APIキー管理", () => {
  test.use({ storageState: authState("tsukune") });

  test("既存キーはマスク表示で「表示」ボタンがない（#1）", async ({ page }) => {
    // tsukune はシードで apiKey を持つ（read-only 検証のみ・キーは変更しない）
    const dialog = await openSettings(page);
    const keyInput = dialog.locator("input[readonly]");
    await expect(keyInput).toHaveAttribute("type", "password");
    await expect(dialog.getByRole("button", { name: "再生成" })).toBeVisible();
    await expect(dialog.getByRole("button", { name: "失効" })).toBeVisible();
    await expect(dialog.getByRole("button", { name: "表示" })).toHaveCount(0);
  });

  test("ライフサイクル: 生成→表示切替→再生成→リロード→失効（#2〜#8）", async ({ browser }) => {
    // tsukune/nankotsu の固定キー（api.spec が依存）を壊さないよう tebasaki で実施
    const context = await browser.newContext({ storageState: authState("tebasaki") });
    const page = await context.newPage();
    let dialog = await openSettings(page);

    // #8: キー未生成 → 「生成する」
    await expect(dialog.getByRole("button", { name: "生成する" })).toBeVisible();

    // #7: 生成 → プレーンテキスト表示 + 「隠す」
    await dialog.getByRole("button", { name: "生成する" }).click();
    const keyInput = dialog.locator("input[readonly]");
    await expect(keyInput).toHaveAttribute("type", "text");
    await expect(dialog.getByRole("button", { name: "隠す" })).toBeVisible();

    // #3: 隠す → マスク（password）+ 「表示」
    await dialog.getByRole("button", { name: "隠す" }).click();
    await expect(keyInput).toHaveAttribute("type", "password");
    await expect(dialog.getByRole("button", { name: "表示" })).toBeVisible();

    // #4: 表示 → プレーンテキスト（text）
    await dialog.getByRole("button", { name: "表示" }).click();
    await expect(keyInput).toHaveAttribute("type", "text");

    // #2: 再生成 → 新しいキーをプレーンテキスト表示
    await dialog.getByRole("button", { name: "再生成" }).click();
    await expect(keyInput).toHaveAttribute("type", "text");
    await expect(dialog.getByRole("button", { name: "隠す" })).toBeVisible();

    // #5: リロード（再オープン）→ マスク表示・「表示」ボタンなし
    dialog = await openSettings(page);
    await expect(dialog.locator("input[readonly]")).toHaveAttribute("type", "password");
    await expect(dialog.getByRole("button", { name: "表示" })).toHaveCount(0);
    await expect(dialog.getByRole("button", { name: "隠す" })).toHaveCount(0);

    // #6: 失効 → 「生成する」に戻る
    await dialog.getByRole("button", { name: "失効" }).click();
    await expect(dialog.getByRole("button", { name: "生成する" })).toBeVisible();

    await context.close();
  });
});
