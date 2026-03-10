import type { Page } from "@playwright/test";

export async function login(
	page: Page,
	email = "tanaka@example.com",
	password = "password123",
) {
	await page.goto("/login");
	await page.fill("#email", email);
	await page.fill("#password", password);
	await page.click('button[type="submit"]');
	await page.waitForURL("**/reports/daily");
}
