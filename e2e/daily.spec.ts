import { authState, expect, test, todayStr } from "./fixtures";

test.use({ storageState: authState("tsukune") });

test.describe("日次ビュー", () => {
  test("初期表示は今日の日付で自分・他ユーザーの日報が表示される", async ({ page }) => {
    await page.goto("/reports/daily");
    await expect(page.getByRole("heading", { name: "日次ビュー" })).toBeVisible();
    await expect(page.locator("#date")).toHaveValue(todayStr());
    // 自分（tsukune）と他ユーザー（tebasaki）の日報が並ぶ
    await expect(page.getByText("tsukune").first()).toBeVisible();
    await expect(page.getByText("tebasaki").first()).toBeVisible();
  });

  test("日報のない日付では空状態を表示する", async ({ page }) => {
    await page.goto("/reports/daily?date=2099-01-01");
    await expect(page.getByText(/日報はありません/)).toBeVisible();
  });

  test("自分の日報には詳細・編集、他ユーザーには詳細のみ表示される", async ({ page }) => {
    await page.goto("/reports/daily");
    const search = page.getByRole("searchbox", { name: "日報を検索" });

    // 他ユーザー（tebasaki）に絞り込む → 編集ボタンは出ない
    await search.fill("tebasaki");
    await expect(page.getByRole("button", { name: "詳細" }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "編集" })).toHaveCount(0);

    // 自分（tsukune）に絞り込む → 編集ボタンが出る
    await search.fill("tsukune");
    await expect(page.getByRole("button", { name: "編集" }).first()).toBeVisible();
  });

  test.describe("表示フィールド切替", () => {
    test("デフォルトは感想/課題/問題点のみ選択されている", async ({ page }) => {
      await page.goto("/reports/daily");
      await expect(page.getByRole("button", { name: "感想/課題/問題点" })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      await expect(page.getByRole("button", { name: "本日の作業" })).toHaveAttribute(
        "aria-pressed",
        "false",
      );
      await expect(page.getByText("感想/課題/問題点").first()).toBeVisible();
    });

    test("複数選択すると固定順で表示される", async ({ page }) => {
      await page.goto("/reports/daily");
      await page.getByRole("button", { name: "本日の作業" }).click();
      await page.getByRole("button", { name: "明日の予定" }).click();

      // 3つとも選択状態
      for (const name of ["本日の作業", "明日の予定", "感想/課題/問題点"]) {
        await expect(page.getByRole("button", { name })).toHaveAttribute("aria-pressed", "true");
      }
      // 先頭カードのラベルが固定順（本日の作業 → 明日の予定 → 感想/課題/問題点）で並ぶ
      const firstCard = page.locator("dl").first();
      await expect(firstCard).toHaveText(/本日の作業[\s\S]*明日の予定[\s\S]*感想\/課題\/問題点/);
    });

    test("すべて解除すると未選択（フィールド非表示）にできる", async ({ page }) => {
      await page.goto("/reports/daily");
      await page.getByRole("button", { name: "感想/課題/問題点" }).click();
      await expect(page.getByRole("button", { name: "感想/課題/問題点" })).toHaveAttribute(
        "aria-pressed",
        "false",
      );
      // カード内のフィールドラベル（dt）が1つも表示されない
      await expect(page.locator("dl dt")).toHaveCount(0);
    });
  });
});
