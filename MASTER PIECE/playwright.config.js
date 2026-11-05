import { defineConfig } from "@playwright/test";
import os from "node:os";
import path from "node:path";

const command = `${JSON.stringify(process.execPath)} node_modules/vite/bin/vite.js --configLoader runner --host 127.0.0.1 --port 5175 --strictPort`;

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: 1,
  reporter: "list",
  outputDir: path.join(os.tmpdir(), "orbit-playwright-results"),
  use: {
    baseURL: "http://127.0.0.1:5175",
    browserName: "chromium",
    launchOptions: process.env.ORBIT_CHROME_PATH
      ? { executablePath: process.env.ORBIT_CHROME_PATH }
      : {},
    viewport: { width: 1440, height: 900 },
    trace: "retain-on-failure",
  },
  webServer: {
    command,
    url: "http://127.0.0.1:5175/login/login.html",
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
