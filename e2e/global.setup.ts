import path from "path";

import { test as setup } from "@playwright/test";

import { login } from "./helpers/auth";

export const AUTH_FILE = path.join(__dirname, ".auth/user.json");

setup("authenticate", async ({ page }) => {
	await login(page);
	await page.context().storageState({ path: AUTH_FILE });
});
