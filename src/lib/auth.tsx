import { cancel, onUrl, start } from "@fabianlars/tauri-plugin-oauth";
import type { Session } from "@supabase/supabase-js";
import { openUrl } from "@tauri-apps/plugin-opener";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

import { supabase } from "./supabase";

// Fixed loopback port the OAuth provider redirects back to. Must be listed in
// Supabase's Auth → URL Configuration → Redirect URLs as `http://localhost:1421`.
const OAUTH_PORT = 1421;

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
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
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
  const signInWithGoogle = async () => {
    const port = await start({
      ports: [OAUTH_PORT],
      response:
        "Sign-in complete. You can close this tab and return to Scribe.",
    });

    const unlisten = await onUrl((url) => {
      void (async () => {
        try {
          const code = new URL(url).searchParams.get("code");
          if (code) {
            const { error } = await supabase.auth.exchangeCodeForSession(code);
            if (error) console.error("Code exchange failed", error);
          }
        } catch (err) {
          console.error("Could not parse OAuth redirect", url, err);
        } finally {
          unlisten();
          await cancel(port).catch(() => {
            /* best-effort cleanup; ignore */
          });
        }
      })();
    });

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `http://localhost:${port}`,
          skipBrowserRedirect: true,
        },
      });
      if (error) throw error;
      if (data.url) await openUrl(data.url);
    } catch (err) {
      unlisten();
      await cancel(port).catch(() => {
        /* best-effort cleanup; ignore */
      });
      throw err;
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider
      value={{ session, loading, signInWithGoogle, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- The auth context hook intentionally ships alongside its AuthProvider component.
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
