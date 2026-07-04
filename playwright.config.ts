import { defineConfig, devices } from "@playwright/test";

// E2E runs on a dedicated port, distinct from the app dev server (1420, pinned
// with `strictPort` in vite.config.ts) and the OAuth loopback (1421). This lets
// e2e always boot its OWN Vite instance with the dummy Supabase env below, so it
// can never silently reuse a real `npm run dev` / `npm run tauri dev` server —
// which would run with the real `.env.local` URL, whose session storage key
// (`sb-<real-ref>-auth-token`) differs from the dummy one the `authedPage`
// fixture seeds (`sb-supabase-auth-token`), booting the app to the sign-in
// screen instead of the signed-in shell. See e2e/AGENTS.md.
const PORT = 1430;
const BASE_URL = `http://localhost:${PORT}`;

// E2E runs against the plain Vite frontend (the same `npm run dev` target the
// README documents for browser use), not the Tauri shell. Dummy Supabase env
// vars are injected so the client constructs; specs stub the network/auth.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["html", { open: "never" }]] : "list",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // `-- --port` forces Vite onto the dedicated e2e port, overriding the 1420
    // pinned in vite.config.ts.
    command: `npm run dev -- --port ${PORT}`,
    url: BASE_URL,
    // Never reuse an already-running server: always boot a fresh instance with
    // the dummy env below, so a real dev server on another port can't leak in.
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      VITE_SUPABASE_URL: "http://supabase.test",
      VITE_SUPABASE_ANON_KEY: "test-anon-key",
    },
  },
});
