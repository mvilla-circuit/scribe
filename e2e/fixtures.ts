import { expect, type Page, test as base } from "@playwright/test";

// The localStorage key the Supabase client persists its session under, derived
// from the dummy VITE_SUPABASE_URL (`http://supabase.test`). Confirmed against
// @supabase/auth-js's storage adapter.
const SUPABASE_STORAGE_KEY = "sb-supabase-auth-token";

// A plausible, far-from-expiry session so `getSession()` returns it without
// attempting a token refresh (which would hit the network).
function fakeSession(): string {
  const oneYear = 60 * 60 * 24 * 365;
  return JSON.stringify({
    access_token: "test-access-token",
    refresh_token: "test-refresh-token",
    token_type: "bearer",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + oneYear,
    user: {
      id: "user-1",
      aud: "authenticated",
      role: "authenticated",
      email: "tester@example.com",
      app_metadata: {},
      user_metadata: { full_name: "Test Writer" },
      created_at: "2026-01-01T00:00:00.000Z",
    },
  });
}

// Adds an `authedPage`: a page that boots straight into the signed-in app by
// seeding a session into localStorage and stubbing every Supabase REST call
// with an empty result (no real backend required).
export const test = base.extend<{ authedPage: Page }>({
  authedPage: async ({ page }, use) => {
    await page.route("**/rest/v1/**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: "[]",
      }),
    );
    await page.addInitScript(
      ([key, value]) => {
        window.localStorage.setItem(key, value);
      },
      [SUPABASE_STORAGE_KEY, fakeSession()] as const,
    );
    await use(page);
  },
});

export { expect };
