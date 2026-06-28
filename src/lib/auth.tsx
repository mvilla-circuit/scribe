import { cancel, onUrl, start } from "@fabianlars/tauri-plugin-oauth";
import type { Session } from "@supabase/supabase-js";
import { openUrl } from "@tauri-apps/plugin-opener";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "./supabase";

// Fixed loopback port the OAuth provider redirects back to. Must be listed in
// Supabase's Auth → URL Configuration → Redirect URLs as `http://localhost:1421`.
const OAUTH_PORT = 1421;

// How long to wait for the browser redirect before giving up. Without a bound,
// abandoning the browser tab leaves `await redirect` pending forever, so the
// `finally` cleanup never runs and the loopback server stays bound to the port
// for the rest of the session (blocking any retry).
const OAUTH_TIMEOUT_MS = 3 * 60_000;

interface AuthContextValue {
  session: Session | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Provides the auth context: restores and tracks the Supabase session and
 * exposes Google sign-in / sign-out. Wrap the app once near its root.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    // `onAuthStateChange` fires an INITIAL_SESSION event on subscribe, which can
    // resolve before or after `getSession`. Track whether an auth event has
    // landed so a late `getSession` result can't clobber the newer value, and so
    // neither writes state after unmount.
    let authEventSeen = false;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!ignore && !authEventSeen) setSession(data.session);
      })
      .catch((err: unknown) => {
        // A failed session fetch must not leave the app stuck on the boot
        // loader; treat it as "signed out" and let the user retry sign-in.
        console.error("Failed to restore Supabase session", err);
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      authEventSeen = true;
      if (ignore) return;
      setSession(nextSession);
      setLoading(false);
    });

    return () => {
      ignore = true;
      subscription.unsubscribe();
    };
  }, []);

  // Desktop OAuth via a localhost loopback server: the same running app that
  // starts the flow also receives the redirect, so the PKCE verifier matches.
  // Resolves only once the redirect has been received and the code exchanged;
  // rejects (so the caller can surface a message) when the redirect carries no
  // code or the exchange fails, instead of silently leaving the user stranded.
  const signInWithGoogle = useCallback(async () => {
    const port = await start({
      ports: [OAUTH_PORT],
      response:
        "Sign-in complete. You can close this tab and return to Scribe.",
    });

    let unlisten: (() => void) | null = null;
    let detached = false;
    // Detach the URL listener exactly once. If cleanup runs before `onUrl`'s
    // promise resolves (e.g. timeout/error before the listener registered),
    // `detached` makes the late `.then` below detach immediately instead of
    // leaking the listener.
    const detach = () => {
      if (detached) return;
      detached = true;
      unlisten?.();
      unlisten = null;
    };
    const cleanup = async () => {
      detach();
      await cancel(port).catch(() => {
        /* best-effort cleanup; ignore */
      });
    };

    try {
      const redirect = new Promise<void>((resolve, reject) => {
        // Time-box the wait so an abandoned browser flow rejects (and the
        // `finally` below frees the port) instead of hanging indefinitely.
        const timer = setTimeout(() => {
          reject(new Error("Sign-in timed out. Please try again."));
        }, OAUTH_TIMEOUT_MS);
        const succeed = () => {
          clearTimeout(timer);
          resolve();
        };
        const fail = (err: Error) => {
          clearTimeout(timer);
          reject(err);
        };
        void onUrl((url) => {
          void (async () => {
            try {
              const code = new URL(url).searchParams.get("code");
              if (!code) {
                throw new Error(
                  "Sign-in didn't complete — no authorization code was returned.",
                );
              }
              const { error } =
                await supabase.auth.exchangeCodeForSession(code);
              if (error) throw error;
              succeed();
            } catch (err) {
              fail(
                err instanceof Error
                  ? err
                  : new Error("Sign-in failed. Please try again."),
              );
            }
          })();
        }).then((un) => {
          // If cleanup already ran while `onUrl` was still registering, detach
          // right away; otherwise hold the handle for `detach()` to call.
          if (detached) un();
          else unlisten = un;
        });
      });

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `http://localhost:${port}`,
          skipBrowserRedirect: true,
        },
      });
      if (error) throw error;
      if (data.url) await openUrl(data.url);

      await redirect;
    } finally {
      await cleanup();
    }
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ session, loading, signInWithGoogle, signOut }),
    [session, loading, signInWithGoogle, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Reads the auth context; throws if used outside an {@link AuthProvider}. */
// eslint-disable-next-line react-refresh/only-export-components -- The auth context hook intentionally ships alongside its AuthProvider component.
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
