import { defineConfig, devices } from "@playwright/test";

/**
 * E2E tests. By default they run against a local production build on port 8123
 * with a freshly seeded database (deno task e2e). Set BASE_URL to test a
 * deployment instead, e.g. a branch preview (which seeds itself):
 *
 *   BASE_URL=https://test-weewoo-study--featx.briansimoni.deno.net deno task e2e:remote
 */
const baseURL = process.env.BASE_URL ?? "http://localhost:8123";
const local = !process.env.BASE_URL;

export default defineConfig({
  testDir: "./tests",
  globalSetup: "./global-setup.ts",
  outputDir: "../.e2e/results",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", {
    outputFolder: "../.e2e/report",
    open: "never",
  }]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: local
    ? {
      command: "deno task e2e:serve",
      cwd: "..",
      url: `${baseURL}/robots.txt`,
      reuseExistingServer: false,
      timeout: 120_000,
    }
    : undefined,
});
