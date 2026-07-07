import { authState, expect, test } from "./fixtures";

test.use({ storageState: authState("tsukune") });

// ページの formatDateLabel と同じ形式（M/D(曜)）を UTC で組み立てる
function dateLabel(d: Date): string {
  const m = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  const dow = ["日", "月", "火", "水", "木", "金", "土"][d.getUTCDay()];
  return `${m}/${day}(${dow})`;
}

function utcDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

test.describe("提出状況", () => {
  test("初期表示: 見出し・マトリクス表示・期間2Wハイライト", async ({ page }) => {
    await page.goto("/reports/status");
    await expect(page.getByRole("heading", { name: "提出状況" })).toBeVisible();
    await expect(page.locator("table")).toBeVisible();
    await expect(page.getByRole("button", { name: "2W", exact: true })).toHaveClass(/bg-zinc-900/);
  });

  test("有効ユーザーのみ・名前昇順で表示される", async ({ page }) => {
    await page.goto("/reports/status");
    // inactive の sunagimo は出ない
    await expect(page.getByRole("cell", { name: "sunagimo" })).toHaveCount(0);
    // 有効ユーザーは表示される
    for (const name of ["tsukune", "tebasaki", "yagen"]) {
      await expect(page.getByRole("cell", { name, exact: false }).first()).toBeVisible();
    }
    // 名前昇順の先頭は bonjiri
    await expect(page.locator("tbody tr").first()).toContainText("bonjiri");
  });

  test("提出済み✓・未提出—が表示される", async ({ page }) => {
    await page.goto("/reports/status");
    // スタイル変更に強いよう表示テキストで検証する
    await expect(page.getByText("✓").first()).toBeVisible();
    await expect(page.getByText("—").first()).toBeVisible();
  });

  test("週末ヘッダーが色分けされる（土=青・日=赤）", async ({ page }) => {
    await page.goto("/reports/status");
    // count() は auto-wait されないため、not.toHaveCount(0) でリトライ待ちする
    await expect(page.locator("thead th.text-blue-500")).not.toHaveCount(0);
    await expect(page.locator("thead th.text-red-500")).not.toHaveCount(0);
  });

  test("期間切替: 1W=7列・1M=30列に変わりハイライトされる", async ({ page }) => {
    await page.goto("/reports/status");

    await page.getByRole("button", { name: "1W", exact: true }).click();
    await expect(page).toHaveURL(/period=1w/);
    await expect(page.getByRole("button", { name: "1W", exact: true })).toHaveClass(/bg-zinc-900/);
    // ユーザー列(1) + 日付7列
    await expect(page.locator("thead th")).toHaveCount(8);

    await page.getByRole("button", { name: "1M", exact: true }).click();
    await expect(page).toHaveURL(/period=1m/);
    await expect(page.getByRole("button", { name: "1M", exact: true })).toHaveClass(/bg-zinc-900/);
    await expect(page.locator("thead th")).toHaveCount(31);
  });

  test("基準日を指定すると input に反映され最新列（右端）が選択日になる", async ({ page }) => {
    // 実行日に依存しないよう、今日から40日前を選ぶ（確実に過去）
    const base = new Date();
    base.setUTCHours(0, 0, 0, 0);
    base.setUTCDate(base.getUTCDate() - 40);
    const baseStr = utcDateStr(base);

    // date input の onChange は `?base=...&period=...` を push するだけなので、URL 契約で検証する
    await page.goto(`/reports/status?base=${baseStr}&period=2w`);
    await expect(page.locator("#base-date")).toHaveValue(baseStr);
    // 右端の日付ヘッダーが選択日
    await expect(page.locator("thead th").last()).toHaveText(dateLabel(base));
  });

  test("提出率列が表示され、休日除外で yagen は100%になる（#13/#17）", async ({ page }) => {
    await page.goto("/reports/status");
    const yagenRow = page.locator("tbody tr").filter({ hasText: "yagen" });
    // yagen は直近14日の平日すべて提出（1平日は休日登録）→ 休日が分母から除外され 100%
    await expect(yagenRow.getByText("100%")).toBeVisible();
  });

  test("休日登録セルに「休」バッジが表示される（#16）", async ({ page }) => {
    await page.goto("/reports/status");
    const yagenRow = page.locator("tbody tr").filter({ hasText: "yagen" });
    // スタイル変更に強いよう表示テキストで検証する
    await expect(yagenRow.getByText("休").first()).toBeVisible();
  });

  test("初期表示で右端（今日の列）まで自動スクロールされる", async ({ page }) => {
    await page.goto("/reports/status");
    const container = page.locator("div.overflow-auto").filter({ has: page.locator("table") });
    await expect.poll(async () => container.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);
  });

  test("ユーザー名列ヘッダーが左端に固定される（構造）", async ({ page }) => {
    await page.goto("/reports/status");
    const userHeader = page.locator("thead th").first();
    await expect(userHeader).toHaveClass(/sticky/);
    await expect(userHeader).toHaveClass(/left-0/);
  });
});

test.describe("提出状況（VIEWER アクセス）", () => {
  test("VIEWER(nankotsu) も閲覧できる", async ({ browser }) => {
    const context = await browser.newContext({ storageState: authState("nankotsu") });
    const page = await context.newPage();
    await page.goto("/reports/status");
    await expect(page.getByRole("heading", { name: "提出状況" })).toBeVisible();
    await context.close();
  });
});
