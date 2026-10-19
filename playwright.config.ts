import { defineConfig, devices } from "@playwright/test";

const PORT = 6219;

const browserEnvironment = Object.fromEntries(
  Object.entries(process.env).filter(
    (entry): entry is [string, string] => entry[1] !== undefined,
  ),
);

// WSLg can expose display sockets that Chromium's headless shell cannot drive.
// The page remains "visible", but requestAnimationFrame never fires, so every
// real Playwright click waits forever for two stable frames. A headless browser
// does not need either socket; keep native frame/actionability behaviour by
// omitting them only when the suite is running under WSL.
if (process.env.WSL_DISTRO_NAME || process.env.WSL_INTEROP) {
  delete browserEnvironment.DISPLAY;
  delete browserEnvironment.WAYLAND_DISPLAY;
}

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    launchOptions: { env: browserEnvironment },
    reducedMotion: "reduce",
    trace: "on-first-retry",
  },
  webServer: {
    command: `pnpm exec serve .output/public --listen ${PORT} --no-clipboard`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
