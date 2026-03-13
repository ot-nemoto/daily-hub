import { execSync } from "child_process";
import path from "path";

import { test as setup } from "@playwright/test";

import { login } from "./helpers/auth";

export const AUTH_FILE = path.join(__dirname, ".auth/user.json");

setup("authenticate", async ({ page }) => {
	// シードデータを初期化・再投入（テスト用残骸も含めて完全リセット）
	execSync("npx prisma db seed", { stdio: "inherit" });

	await login(page);
	await page.context().storageState({ path: AUTH_FILE });
});
