import { defineConfig, devices } from '@playwright/test';

const isCI = Boolean(process.env.CI);
const webServerPort = Number(process.env.PLAYWRIGHT_WEB_SERVER_PORT ?? 3100);
const webServerUrl = `http://127.0.0.1:${webServerPort}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
  reporter: isCI ? 'github' : 'list',
  use: {
    baseURL: webServerUrl,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: `npm run start --prefix web -- --hostname 127.0.0.1 --port ${webServerPort}`,
    url: `${webServerUrl}/app-shell`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
