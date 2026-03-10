import { expect, test } from "./fixtures";

// シードデータの日付（seed.ts 基準日: 2026-03-07、各ユーザー7日分）
const SEED_DATE = "2026-03-07";
const SEED_MONTH = "2026-03";

// テスト用データ（シード・T57 の 2099-01-01 と重複しない日付）
const TEST_DATE = "2099-02-01";
const COMMENT_BODY = "E2Eテスト用コメント";

test.describe("コメント機能", () => {
	test("コメント投稿 → 一覧に追加される、削除 → 一覧から消える", async ({ loggedInPage }) => {
		test.setTimeout(90000);
		let reportId: string;

		await test.step("テスト用日報を作成", async () => {
			await loggedInPage.goto("/reports/new");
			await loggedInPage.fill("#date", TEST_DATE);
			await loggedInPage.fill("#workContent", "コメントテスト用作業内容");
			await loggedInPage.fill("#tomorrowPlan", "コメントテスト用明日の予定");
			await loggedInPage.click('button[type="submit"]');
			// cuid は必ず数字を含む → new / daily / monthly と区別できる
			await loggedInPage.waitForURL(/\/reports\/[a-z0-9]*\d[a-z0-9]*$/);
			reportId = loggedInPage.url().split("/").pop() ?? "";
			expect(reportId).toBeTruthy();
		});

		await test.step("コメント投稿 → コメント一覧に追加される", async () => {
			await loggedInPage.goto(`/reports/${reportId}`, { waitUntil: "networkidle" });
			await expect(loggedInPage.getByText("コメントはまだありません")).toBeVisible();

			await loggedInPage.fill("#body", COMMENT_BODY);
			// POST 完了を確認してから router.refresh() の RSC 更新を待つ
			await Promise.all([
				loggedInPage.waitForResponse(`**/api/reports/${reportId}/comments`),
				loggedInPage.click('button[type="submit"]'),
			]);
			await loggedInPage.waitForLoadState("networkidle");
			await expect(loggedInPage.getByText(COMMENT_BODY)).toBeVisible();
		});

		await test.step("コメント削除 → コメント一覧から消える", async () => {
			// DELETE 完了を確認してから router.refresh() の RSC 更新を待つ
			await Promise.all([
				loggedInPage.waitForResponse(/\/api\/reports\/.*\/comments\/.*/),
				loggedInPage.getByRole("button", { name: "削除" }).click(),
			]);
			await loggedInPage.waitForLoadState("networkidle");
			await expect(loggedInPage.getByText(COMMENT_BODY)).not.toBeVisible();
			await expect(loggedInPage.getByText("コメントはまだありません")).toBeVisible();
		});
	});
});

test.describe("閲覧ビュー", () => {
	test("日次ビュー：日付変更で日報一覧が更新される", async ({ loggedInPage }) => {
		test.setTimeout(60000);

		await test.step(`${SEED_DATE} の日報が表示される`, async () => {
			await loggedInPage.goto(`/reports/daily?date=${SEED_DATE}`, { waitUntil: "networkidle" });
			// 3ユーザー × 1件 = 3件 → 「詳細」リンクが存在する
			await expect(loggedInPage.getByRole("link", { name: "詳細" }).first()).toBeVisible();
		});

		await test.step("日付変更 → 日報のない日付で「日報はありません」が表示される", async () => {
			// 2099-12-31: テスト用日報が存在しない遠い未来の日付
			await loggedInPage.fill("#date", "2099-12-31");
			await loggedInPage.waitForURL(/date=2099-12-31/);
			await loggedInPage.waitForLoadState("networkidle");
			await expect(loggedInPage.getByText("2099-12-31 の日報はありません")).toBeVisible();
		});
	});

	test("月次ビュー：月変更で日報一覧が更新される", async ({ loggedInPage }) => {
		test.setTimeout(60000);

		await test.step(`${SEED_MONTH} の日報が表示される`, async () => {
			// デフォルト: 現在月（2026-03）、ログインユーザー（田中）でフィルタ
			await loggedInPage.goto("/reports/monthly", { waitUntil: "networkidle" });
			// 田中の 2026-03 には 7件の日報あり → 「詳細」リンクが存在する
			await expect(loggedInPage.getByRole("link", { name: "詳細" }).first()).toBeVisible();
		});

		await test.step("月変更 → 日報のない月で「日報はありません」が表示される", async () => {
			// 2099-12: テスト用日報が存在しない遠い未来の月
			await loggedInPage.fill("#month", "2099-12");
			await loggedInPage.waitForURL(/from=2099-12-01/);
			await loggedInPage.waitForLoadState("networkidle");
			await expect(loggedInPage.getByText("2099-12 の日報はありません")).toBeVisible();
		});
	});
});
