import path from "path";

import { test as base } from "@playwright/test";
import type { Page } from "@playwright/test";

export { expect } from "@playwright/test";

const AUTH_FILE = path.join(__dirname, ".auth/user.json");

type Fixtures = {
	loggedInPage: Page;
};

export const test = base.extend<Fixtures>({
	loggedInPage: async ({ browser, baseURL }, use) => {
		const context = await browser.newContext({ baseURL, storageState: AUTH_FILE });
		const page = await context.newPage();
		await use(page);
		await context.close();
	},
});
