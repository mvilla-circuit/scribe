import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthProvider, useAuth } from "./auth";

// Hoisted mocks: auth.tsx reaches into Tauri plugins and the Supabase client,
// none of which exist in the test runtime. We capture the `onUrl` redirect
// callback so each test can simulate the loopback server receiving a redirect.
const h = vi.hoisted(() => ({
  start: vi.fn(() => Promise.resolve(1421)),
  cancel: vi.fn(() => Promise.resolve()),
  openUrl: vi.fn(() => Promise.resolve()),
  getSession: vi.fn(() => Promise.resolve({ data: { session: null } })),
  onAuthStateChange: vi.fn(() => ({
    data: { subscription: { unsubscribe: vi.fn() } },
  })),
  signInWithOAuth: vi.fn(() =>
    Promise.resolve({
      data: { url: "https://accounts.google.com/o/oauth2/v2/auth" },
      error: null as Error | null,
    }),
  ),
  exchangeCodeForSession: vi.fn(() =>
    Promise.resolve({ error: null as Error | null }),
  ),
  capturedUrlCb: { current: null as ((url: string) => void) | null },
}));

vi.mock("@fabianlars/tauri-plugin-oauth", () => ({
  start: h.start,
  cancel: h.cancel,
  onUrl: (cb: (url: string) => void) => {
    h.capturedUrlCb.current = cb;
    return Promise.resolve(() => {
      /* unlisten no-op */
    });
  },
}));
vi.mock("@tauri-apps/plugin-opener", () => ({ openUrl: h.openUrl }));
vi.mock("./supabase", () => ({
  supabase: {
    auth: {
      getSession: h.getSession,
      onAuthStateChange: h.onAuthStateChange,
      signInWithOAuth: h.signInWithOAuth,
      exchangeCodeForSession: h.exchangeCodeForSession,
      signOut: vi.fn(() => Promise.resolve({ error: null })),
    },
  },
}));

const REDIRECT = "http://localhost:1421/";

async function setupAuth() {
  const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
  // Let the provider's getSession effect settle so its setState doesn't escape
  // act during the assertions below.
  await waitFor(() => {
    expect(result.current.loading).toBe(false);
  });
  return result;
}

/**
 * Drive sign-in to the point where the loopback `onUrl` callback is armed.
 * Returns the in-flight promise wrapped in an object so this async helper
 * doesn't adopt/flatten it (we need the un-settled promise to assert on).
 */
async function startSignIn(auth: { current: ReturnType<typeof useAuth> }) {
  const promise = auth.current.signInWithGoogle();
  // Avoid an unhandled rejection if the flow rejects before we assert.
  promise.catch(() => {
    /* asserted on below */
  });
  await waitFor(() => {
    expect(h.capturedUrlCb.current).toBeTruthy();
  });
  return { promise };
}

describe("signInWithGoogle", () => {
  beforeEach(() => {
    h.capturedUrlCb.current = null;
    h.exchangeCodeForSession.mockResolvedValue({ error: null });
    h.signInWithOAuth.mockResolvedValue({
      data: { url: "https://accounts.google.com/o/oauth2/v2/auth" },
      error: null,
    });
  });

  it("rejects when the redirect carries no authorization code", async () => {
    const auth = await setupAuth();
    const { promise } = await startSignIn(auth);

    h.capturedUrlCb.current!(`${REDIRECT}?error=access_denied`);

    await expect(promise).rejects.toThrow();
  });

  it("rejects when the code exchange fails", async () => {
    h.exchangeCodeForSession.mockResolvedValue({
      error: new Error("exchange failed"),
    });
    const auth = await setupAuth();
    const { promise } = await startSignIn(auth);

    h.capturedUrlCb.current!(`${REDIRECT}?code=abc123`);

    await expect(promise).rejects.toThrow();
  });

  it("resolves once the code is exchanged successfully", async () => {
    const auth = await setupAuth();
    const { promise } = await startSignIn(auth);

    h.capturedUrlCb.current!(`${REDIRECT}?code=abc123`);

    await expect(promise).resolves.toBeUndefined();
  });
});
