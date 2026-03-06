import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [react()],
	test: {
		environment: "jsdom",
		globals: true,
		setupFiles: ["./src/test/setup.ts"],
		exclude: ["node_modules", ".next", "e2e/**"],
		passWithNoTests: true,
		coverage: {
			provider: "v8",
			exclude: ["node_modules", ".next", "src/test"],
		},
	},
	resolve: {
		alias: {
			"@": "/workspaces/daily-hub/src",
		},
	},
});
