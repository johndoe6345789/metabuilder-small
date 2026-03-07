import { defineConfig, devices } from "@playwright/test"

// SKIP_WEBSERVER=true → run against Docker stack at localhost/pastebin/
// Default → start Next.js dev server on port 3004
const useDocker = !!process.env.SKIP_WEBSERVER
const baseURL = useDocker ? "http://localhost/pastebin/" : "http://127.0.0.1:3004"

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.ts",
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium-desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1400, height: 900 },
      },
    },
    {
      name: "chromium-mobile",
      use: {
        ...devices["Pixel 5"],
      },
    },
  ],
  ...(!useDocker && {
    webServer: {
      command: "npm run dev -- -p 3004 -H 0.0.0.0",
      port: 3004,
      reuseExistingServer: false,
      timeout: 120_000,
    },
  }),
})
