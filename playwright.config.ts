import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:4173/arc-life-os/",
    viewport: { width: 1440, height: 1050 },
    launchOptions: {
      executablePath: process.env.ARC_CHROMIUM_PATH || undefined,
      args: ["--no-sandbox"],
    },
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run preview -- --port 4173 --strictPort",
    url: "http://127.0.0.1:4173/arc-life-os/",
    reuseExistingServer: false,
    timeout: 30000,
  },
});
