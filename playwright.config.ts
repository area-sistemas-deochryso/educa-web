import { defineConfig, devices } from '@playwright/test';

// * educa-web e2e config
// Dev server: `bun run start` serves Angular via `ng serve --port=4201`.
// Angular's dev-server cert is self-signed, hence ignoreHTTPSErrors.
export default defineConfig({
	testDir: 'e2e',
	fullyParallel: false,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	workers: 1,
	reporter: 'html',
	use: {
		baseURL: process.env.E2E_BASE_URL ?? 'https://localhost:4201',
		ignoreHTTPSErrors: true,
		trace: 'on-first-retry',
		screenshot: 'only-on-failure',
	},
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] },
		},
	],
});
