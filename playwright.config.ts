import { defineConfig, devices } from "@playwright/test";

const PORT = 3200;

// End-to-end runs against the production build in mock mode (recorded Frontend Guide examples).
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: `http://localhost:${PORT}`,
    // First visits follow the browser language; the suite runs as an Arabic-speaking user.
    locale: "ar-SA",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } }, testIgnore: /owner/ },
    { name: "mobile", use: { ...devices["Pixel 7"], viewport: { width: 360, height: 760 } }, testMatch: /owner/ },
  ],
  webServer: {
    command: `pnpm build && cross-env API_MOCKS=1 next start -p ${PORT}`,
    url: `http://localhost:${PORT}/login`,
    reuseExistingServer: !process.env.CI,
    timeout: 400_000,
  },
});
