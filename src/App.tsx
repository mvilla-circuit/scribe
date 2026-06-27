import { PenLine } from "lucide-react";
import { AppShell } from "./components/AppShell";
import { AuthScreen } from "./components/AuthScreen";
import { Toaster } from "./components/ui/Toaster";
import { makeIcon } from "./lib/makeIcon";
import { useAuth } from "./lib/auth";

const BrandIcon = makeIcon(PenLine);

// Calm, on-brand boot screen shown while we resolve whether there's a session.
// A quiet pulse keeps the wordmark feeling alive without a spinner.
function BootLoader() {
  return (
    <main className="flex h-full items-center justify-center bg-bg">
      <div className="scribe-skel-pulse flex flex-col items-center gap-4">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-selected text-accent">
          <BrandIcon size={24} />
        </span>
        <span
          className="text-lg font-semibold tracking-tight text-text"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Scribe
        </span>
      </div>
    </main>
  );
}

function App() {
  const { session, loading } = useAuth();

  return (
    <>
      {loading ? (
        <BootLoader />
      ) : session ? (
        <AppShell />
      ) : (
        <AuthScreen />
      )}
      <Toaster />
    </>
  );
}

export default App;
