import { expect, test } from "./fixtures";

// テスト専用の固定日付（シードデータと重複しない遠い未来）
const TEST_DATE = "2099-01-01";
const WORK_CONTENT = "E2Eテスト用作業内容";
const TOMORROW_PLAN = "E2Eテスト用明日の予定";
const UPDATED_WORK_CONTENT = "E2Eテスト用作業内容（更新後）";

test("日報 CRUD: 作成 → 詳細表示 → 編集", async ({ loggedInPage }) => {
	test.setTimeout(60000);
	let reportId: string;

	await test.step("作成フォームの入力・送信 → 詳細ページへリダイレクト", async () => {
		await loggedInPage.goto("/reports/new");
		await loggedInPage.fill("#date", TEST_DATE);
		await loggedInPage.fill("#workContent", WORK_CONTENT);
		await loggedInPage.fill("#tomorrowPlan", TOMORROW_PLAN);
		await loggedInPage.click('button[type="submit"]');

		// /reports/<cuid> にリダイレクトされるのを待つ
		// cuid は必ず数字を含む → new / daily / monthly と区別できる
		await loggedInPage.waitForURL(/\/reports\/[a-z0-9]*\d[a-z0-9]*$/);
		const url = loggedInPage.url();
		reportId = url.split("/").pop() ?? "";
		expect(reportId).toBeTruthy();
	});

	await test.step("詳細ページの表示確認", async () => {
		// RSC ストリーミング完了まで待つため networkidle を指定して再ナビ
		await loggedInPage.goto(`/reports/${reportId}`, { waitUntil: "networkidle" });
		await expect(loggedInPage.getByText(WORK_CONTENT)).toBeVisible();
		await expect(loggedInPage.getByText(TOMORROW_PLAN)).toBeVisible();
	});

	await test.step("編集フォームの入力・送信 → 更新内容が反映される", async () => {
		await loggedInPage.goto(`/reports/${reportId}/edit`);
		await loggedInPage.fill("#workContent", UPDATED_WORK_CONTENT);
		await loggedInPage.click('button[type="submit"]');

		await loggedInPage.waitForURL(`**/reports/${reportId}`);
		// RSC ストリーミング完了まで待つため networkidle を指定して再ナビ
		await loggedInPage.goto(`/reports/${reportId}`, { waitUntil: "networkidle" });
		await expect(loggedInPage.getByText(UPDATED_WORK_CONTENT)).toBeVisible();
	});
});
