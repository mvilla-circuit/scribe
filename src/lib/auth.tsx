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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => {
        setSession(data.session);
      })
      .catch((err: unknown) => {
        // A failed session fetch must not leave the app stuck on the boot
        // loader; treat it as "signed out" and let the user retry sign-in.
        console.error("Failed to restore Supabase session", err);
      })
      .finally(() => {
        setLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });

    return () => {
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
    const cleanup = async () => {
      unlisten?.();
      unlisten = null;
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
          unlisten = un;
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

// eslint-disable-next-line react-refresh/only-export-components -- The auth context hook intentionally ships alongside its AuthProvider component.
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
