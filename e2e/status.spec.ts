import type { Page } from "@playwright/test";
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

/** N 日前（UTC 0 時）。ページの日付列と同じ基準で組み立てる */
function daysAgoUtc(n: number): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - n);
  return d;
}

test.describe("提出状況", () => {
  test("初期表示: 見出し・マトリクス表示・表示幅14日ハイライト・範囲は今日まで", async ({
    page,
  }) => {
    await page.goto("/reports/status");
    await expect(page.getByRole("heading", { name: "提出状況" })).toBeVisible();
    await expect(page.locator("table.border-collapse")).toBeVisible();
    await expect(page.getByRole("button", { name: "14日", exact: true })).toHaveClass(
      /bg-zinc-900/,
    );
    // 範囲表示は「左端 〜 今日」
    const today = daysAgoUtc(0);
    const start = daysAgoUtc(13);
    await expect(page.getByRole("button", { name: "表示範囲" })).toHaveText(
      `${dateLabel(start)} 〜 ${dateLabel(today)}`,
    );
    // 右端が今日なので未来方向と「今日」は無効
    await expect(page.getByRole("button", { name: "次の期間" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "今日", exact: true })).toBeDisabled();
    await expect(page.getByRole("button", { name: "前の期間" })).toBeEnabled();
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

  test("表示幅切替: 7日=7列・30日=30列に変わりハイライトされ、右端は維持される", async ({
    page,
  }) => {
    await page.goto("/reports/status");
    const todayStr = utcDateStr(daysAgoUtc(0));

    await page.getByRole("button", { name: "7日", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`base=${todayStr}&period=1w`));
    await expect(page.getByRole("button", { name: "7日", exact: true })).toHaveClass(/bg-zinc-900/);
    // ユーザー列(1) + 日付7列
    await expect(page.locator("thead th")).toHaveCount(8);

    await page.getByRole("button", { name: "30日", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`base=${todayStr}&period=1m`));
    await expect(page.getByRole("button", { name: "30日", exact: true })).toHaveClass(
      /bg-zinc-900/,
    );
    await expect(page.locator("thead th")).toHaveCount(31);
  });

  test("終了日を指定すると範囲表示に反映され最新列（右端）が選択日になる", async ({ page }) => {
    // 実行日に依存しないよう、今日から40日前を選ぶ（確実に過去）
    const base = daysAgoUtc(40);
    const baseStr = utcDateStr(base);

    await page.goto(`/reports/status?base=${baseStr}&period=2w`);
    await expect(page.getByRole("button", { name: "表示範囲" })).toHaveText(
      `${dateLabel(daysAgoUtc(53))} 〜 ${dateLabel(base)}`,
    );
    // 右端の日付ヘッダーが選択日
    await expect(page.locator("thead th").last()).toHaveText(dateLabel(base));
    // 過去なので未来方向と「今日」が有効
    await expect(page.getByRole("button", { name: "次の期間" })).toBeEnabled();
    await expect(page.getByRole("button", { name: "今日", exact: true })).toBeEnabled();
  });

  test("範囲表示をクリックすると終了日入力が開き、入力で右端が移動する", async ({ page }) => {
    await page.goto("/reports/status");
    await page.getByRole("button", { name: "表示範囲" }).click();
    const input = page.locator("#base-date");
    await expect(input).toHaveValue(utcDateStr(daysAgoUtc(0)));

    // date input の onChange は `?base=...&period=...` を push するだけなので、URL 契約で検証する
    const target = utcDateStr(daysAgoUtc(40));
    await input.fill(target);
    await expect(page).toHaveURL(new RegExp(`base=${target}&period=2w`));
    await expect(page.locator("thead th").last()).toHaveText(dateLabel(daysAgoUtc(40)));
    // 入力は閉じて範囲表示に戻る
    await expect(input).toHaveCount(0);
  });

  test("◀ ▶ で表示幅ぶんスライドし、▶ は今日を超えない", async ({ page }) => {
    await page.goto("/reports/status");
    const today = utcDateStr(daysAgoUtc(0));

    // 14日幅で 1 回戻る → base は 14 日前
    await page.getByRole("button", { name: "前の期間" }).click();
    await expect(page).toHaveURL(new RegExp(`base=${utcDateStr(daysAgoUtc(14))}&period=2w`));
    await expect(page.locator("thead th").last()).toHaveText(dateLabel(daysAgoUtc(14)));
    await expect(page.getByRole("button", { name: "次の期間" })).toBeEnabled();

    // もう 1 回戻る → 28 日前
    await page.getByRole("button", { name: "前の期間" }).click();
    await expect(page).toHaveURL(new RegExp(`base=${utcDateStr(daysAgoUtc(28))}&period=2w`));

    // 進む → 14 日前
    await page.getByRole("button", { name: "次の期間" }).click();
    await expect(page).toHaveURL(new RegExp(`base=${utcDateStr(daysAgoUtc(14))}&period=2w`));

    // 幅を 30 日に変えてから進むと 16 日先＝今日で丸められる
    await page.getByRole("button", { name: "30日", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`base=${utcDateStr(daysAgoUtc(14))}&period=1m`));
    await page.getByRole("button", { name: "次の期間" }).click();
    await expect(page).toHaveURL(new RegExp(`base=${today}&period=1m`));
    await expect(page.getByRole("button", { name: "次の期間" })).toBeDisabled();
  });

  test("未来の base を指定しても「今日」で戻れる（▶ は無効）", async ({ page }) => {
    await page.goto("/reports/status?base=2030-01-01&period=2w");
    await expect(page.getByRole("button", { name: "次の期間" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "今日", exact: true })).toBeEnabled();
    await page.getByRole("button", { name: "今日", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`base=${utcDateStr(daysAgoUtc(0))}&period=2w`));
  });

  test("終了日入力は範囲外の中間値（年の打ちかけ）では確定しない", async ({ page }) => {
    await page.goto("/reports/status");
    await page.getByRole("button", { name: "表示範囲" }).click();
    const input = page.locator("#base-date");
    // キーボードで年を打っている途中に相当する値。min 未満なので遷移せず入力も閉じない
    await input.fill("0002-08-01");
    await expect(input).toBeVisible();
    await expect(page).toHaveURL(/\/reports\/status$/);
    // 有効な値になった時点で確定する
    const target = utcDateStr(daysAgoUtc(20));
    await input.fill(target);
    await expect(page).toHaveURL(new RegExp(`base=${target}&period=2w`));
  });

  test("「今日」で右端が今日に戻り、幅は維持される", async ({ page }) => {
    await page.goto(`/reports/status?base=${utcDateStr(daysAgoUtc(40))}&period=1w`);
    await page.getByRole("button", { name: "今日", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`base=${utcDateStr(daysAgoUtc(0))}&period=1w`));
    await expect(page.getByRole("button", { name: "今日", exact: true })).toBeDisabled();
    await expect(page.getByRole("button", { name: "7日", exact: true })).toHaveClass(/bg-zinc-900/);
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

// ---- 祝日表示（T219）: 祝日は列見出し＋列背景で示し、セルのバッジは「休」だけに限定する ----

const BONJIRI_KEY = "c1d2e3f4-a5b6-7890-abcd-ef1234567890"; // ADMIN（prisma/seed.ts と一致）

/** 平日になるまで daysAgo を進め、除外日と重ならない最初の平日を返す（2W=直近14日内に収まる前提） */
function pickWeekdayDaysAgo(start: number, exclude: number[] = []): number {
  let n = start;
  while ([0, 6].includes(daysAgoUtc(n).getUTCDay()) || exclude.includes(n)) n++;
  return n;
}

/** 日付ラベルに一致する列見出しの列番号（0 始まり・ユーザー列含む）を返す */
async function columnIndex(page: Page, label: string): Promise<number> {
  return page
    .locator("thead th", { hasText: label })
    .evaluate((el) => (el as HTMLTableCellElement).cellIndex);
}

test.describe("提出状況（祝日表示）", () => {
  // シードの yagen 休日（3日前以降で最初の平日）と同じ日を祝日にし、「休」優先を検証する
  const overlapDaysAgo = pickWeekdayDaysAgo(3);
  const unnamedDaysAgo = pickWeekdayDaysAgo(1, [overlapDaysAgo]);
  const longNameDaysAgo = pickWeekdayDaysAgo(unnamedDaysAgo + 1, [overlapDaysAgo]);
  const LONG_NAME = "とても長い名称の祝日（省略表示の確認用）";
  const OVERLAP_NAME = "テスト祝日";

  const holidays = [
    { date: utcDateStr(daysAgoUtc(overlapDaysAgo)), name: OVERLAP_NAME },
    { date: utcDateStr(daysAgoUtc(unnamedDaysAgo)), name: null },
    { date: utcDateStr(daysAgoUtc(longNameDaysAgo)), name: LONG_NAME },
  ];
  const createdIds: string[] = [];

  test.beforeAll(async ({ playwright, baseURL }) => {
    const api = await playwright.request.newContext({
      baseURL,
      extraHTTPHeaders: { Authorization: `Bearer ${BONJIRI_KEY}` },
    });
    // 中断された前回実行の残骸があれば先に消す（date はユニークで 409 になるため）
    const dates = holidays.map((h) => h.date).sort();
    const existing = await api.get(`/api/holidays?from=${dates[0]}&to=${dates.at(-1)}`);
    for (const h of (await existing.json()).holidays as { id: string; date: string }[]) {
      if (holidays.some((x) => x.date === h.date)) await api.delete(`/api/holidays/${h.id}`);
    }
    for (const h of holidays) {
      const res = await api.post("/api/holidays", { data: h });
      expect(res.status()).toBe(201);
      createdIds.push((await res.json()).id);
    }
    await api.dispose();
  });

  test.afterAll(async ({ playwright, baseURL }) => {
    const api = await playwright.request.newContext({
      baseURL,
      extraHTTPHeaders: { Authorization: `Bearer ${BONJIRI_KEY}` },
    });
    for (const id of createdIds) await api.delete(`/api/holidays/${id}`);
    await api.dispose();
  });

  test("列見出しに祝日名が表示され、名称なしは「祝日」になる", async ({ page }) => {
    await page.goto("/reports/status");
    const overlapTh = page.locator("thead th", { hasText: dateLabel(daysAgoUtc(overlapDaysAgo)) });
    await expect(overlapTh).toHaveClass(/text-red-500/);
    await expect(overlapTh).toHaveAttribute("title", OVERLAP_NAME);
    await expect(overlapTh.locator("span")).toHaveText(OVERLAP_NAME);

    const unnamedTh = page.locator("thead th", { hasText: dateLabel(daysAgoUtc(unnamedDaysAgo)) });
    await expect(unnamedTh).toHaveAttribute("title", "祝日");
    await expect(unnamedTh.locator("span")).toHaveText("祝日");
  });

  test("長い祝日名は省略表示され、ツールチップで全文を確認できる", async ({ page }) => {
    await page.goto("/reports/status");
    const th = page.locator("thead th", { hasText: dateLabel(daysAgoUtc(longNameDaysAgo)) });
    await expect(th).toHaveAttribute("title", LONG_NAME);
    const nameSpan = th.locator("span");
    await expect(nameSpan).toHaveClass(/truncate/);
    // 実際に省略されている（内容幅が表示幅を超えている）
    await expect.poll(() => nameSpan.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
  });

  test("祝日セルに「祝」バッジは出ず、列背景が赤系になる", async ({ page }) => {
    await page.goto("/reports/status");
    await expect(page.locator("tbody").getByText("祝", { exact: true })).toHaveCount(0);

    const idx = await columnIndex(page, dateLabel(daysAgoUtc(unnamedDaysAgo)));
    const cells = page.locator(`tbody tr td:nth-child(${idx + 1})`);
    await expect(cells.first()).toHaveClass(/bg-red-50/);
    await expect(cells).toHaveCount(await page.locator("tbody tr").count());
    for (const cls of await cells.evaluateAll((els) => els.map((e) => e.className))) {
      expect(cls).toMatch(/bg-red-50/);
    }
  });

  test("祝日に提出済みなら✓、休日登録と重なれば「休」を表示し、提出率は変わらない", async ({
    page,
  }) => {
    await page.goto("/reports/status");
    const yagenRow = page.locator("tbody tr").filter({ hasText: "yagen" });
    // yagen は直近14日の平日すべてに日報あり → 名称なし祝日の列は ✓
    const unnamedIdx = await columnIndex(page, dateLabel(daysAgoUtc(unnamedDaysAgo)));
    await expect(yagenRow.locator("td").nth(unnamedIdx)).toHaveText("✓");
    // yagen の休日登録日と重なる祝日は「休」を優先
    const overlapIdx = await columnIndex(page, dateLabel(daysAgoUtc(overlapDaysAgo)));
    await expect(yagenRow.locator("td").nth(overlapIdx)).toHaveText("休");
    // 祝日は分母から除外されるため yagen は引き続き 100%
    await expect(yagenRow.getByText("100%")).toBeVisible();
  });

  test("VIEWER(nankotsu) にも祝日名が表示される", async ({ browser }) => {
    const context = await browser.newContext({ storageState: authState("nankotsu") });
    const page = await context.newPage();
    await page.goto("/reports/status");
    const th = page.locator("thead th", { hasText: dateLabel(daysAgoUtc(overlapDaysAgo)) });
    await expect(th.locator("span")).toHaveText(OVERLAP_NAME);
    await context.close();
  });
});
