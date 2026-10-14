import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  retries: 0,
  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:3000",
    launchOptions: { args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] },
    viewport: { width: 1100, height: 800 },
  },
  webServer: process.env.BASE_URL
    ? undefined
    : { command: "pnpm dev -p 3000", url: "http://localhost:3000", reuseExistingServer: true, timeout: 120_000 },
});
