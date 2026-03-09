import path from "path";

import { test as setup } from "@playwright/test";

export const AUTH_FILE = path.join(__dirname, ".auth/user.json");

setup("authenticate", async ({ page }) => {
	await page.goto("/login");
	await page.fill("#email", "tanaka@example.com");
	await page.fill("#password", "password123");
	await page.click('button[type="submit"]');
	await page.waitForURL("**/reports/daily");
	await page.context().storageState({ path: AUTH_FILE });
});
