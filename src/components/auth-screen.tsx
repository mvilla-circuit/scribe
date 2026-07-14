import { useState } from "react";

import { ScribeLogo } from "@/components/scribe-logo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.167 6.656 3.58 9 3.58z"
      />
    </svg>
  );
}

export function AuthScreen() {
  const { signInWithGoogle } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    setBusy(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Sign-in failed. Please try again.",
      );
      setBusy(false);
    }
  };

  return (
    <main className="flex h-full items-center justify-center px-6">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-8 shadow-card">
        <div className="mb-8 text-center">
          <h1 className="flex justify-center">
            <ScribeLogo
              iconSize={22}
              textClassName="text-3xl"
              className="justify-center"
            />
          </h1>
          <p className="mt-2 text-sm text-muted">Sign in to start writing.</p>
        </div>

        <Button
          variant="secondary"
          onClick={() => void handleSignIn()}
          disabled={busy}
          className="w-full py-2.5"
        >
          <GoogleIcon />
          {busy ? "Opening browser…" : "Continue with Google"}
        </Button>

        {error && (
          <p className="mt-4 text-center text-sm text-danger">{error}</p>
        )}

        <p className="mt-6 text-center text-xs text-muted">
          A browser window will open to complete sign-in.
        </p>
      </div>
    </main>
  );
}
