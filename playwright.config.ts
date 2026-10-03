import { defineConfig } from "@playwright/test";

// Runs against the production web build (mock adapter). CI installs a browser with
// `pnpm exec playwright install chromium`; locally set PW_CHROMIUM to an existing binary.
export default defineConfig({
  testDir: "e2e",
  timeout: 30_000,
  fullyParallel: true,
  use: {
    baseURL: "http://localhost:4173",
    viewport: { width: 1200, height: 700 },
    launchOptions: process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {},
  },
  webServer: {
    command: "pnpm --filter @glass-dock/web exec vite preview --port 4173 --strictPort",
    url: "http://localhost:4173",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
