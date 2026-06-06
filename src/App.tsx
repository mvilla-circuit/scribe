import { AppShell } from "./components/AppShell";
import { AuthScreen } from "./components/AuthScreen";
import { Toaster } from "./components/ui/Toaster";
import { useAuth } from "./lib/auth";

function App() {
  const { session, loading } = useAuth();

  return (
    <>
      {loading ? (
        <main className="flex h-full items-center justify-center">
          <p className="text-sm text-muted">Loading…</p>
        </main>
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
