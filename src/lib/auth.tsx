import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { getCurrent, onOpenUrl } from "@tauri-apps/plugin-deep-link";
import { openUrl } from "@tauri-apps/plugin-opener";
import { supabase } from "./supabase";

const REDIRECT_URL = "scribe://auth-callback";

type AuthContextValue = {
  session: Session | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Extract the PKCE `code` from any incoming deep-link URLs and exchange it for a session.
async function completeOAuthRedirect(urls: string[]) {
  for (const raw of urls) {
    try {
      const code = new URL(raw).searchParams.get("code");
      if (!code) continue;
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) console.error("Code exchange failed", error);
    } catch (err) {
      console.error("Could not parse deep link", raw, err);
    }
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unlisten: (() => void) | undefined;

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

    // Cold start: the app may have been launched by the deep link itself.
    void getCurrent()
      .then((urls) => {
        if (urls && urls.length > 0) void completeOAuthRedirect(urls);
      })
      .catch(() => {});

    // Warm start: app already running when the redirect arrives.
    void onOpenUrl((urls) => void completeOAuthRedirect(urls))
      .then((fn) => {
        unlisten = fn;
      })
      .catch((err) => console.error("Deep link listener failed", err));

    return () => {
      subscription.unsubscribe();
      unlisten?.();
    };
  }, []);

  const signInWithGoogle = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: REDIRECT_URL, skipBrowserRedirect: true },
    });
    if (error) throw error;
    if (data.url) await openUrl(data.url);
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ session, loading, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
