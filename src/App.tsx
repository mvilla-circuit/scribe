import { AppShell } from "./components/AppShell";
import { AuthScreen } from "./components/AuthScreen";
import { useAuth } from "./lib/auth";

function App() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <main className="flex h-full items-center justify-center">
        <p className="text-sm text-muted">Loading…</p>
      </main>
    );
  }

  if (!session) {
    return <AuthScreen />;
  }

  return <AppShell />;
}

export default App;
