import { AuthScreen } from "./components/AuthScreen";
import { useAuth } from "./lib/auth";

function App() {
  const { session, loading, signOut } = useAuth();

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

  return (
    <main className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="text-4xl font-semibold tracking-tight text-text">Scribe</h1>
      <p className="text-base text-muted">
        Signed in as {session.user.email ?? session.user.id}
      </p>
      <button
        type="button"
        onClick={() => void signOut()}
        className="mt-2 rounded-lg border border-black/10 bg-surface px-4 py-2 text-sm font-medium text-text transition hover:bg-black/[0.03]"
      >
        Sign out
      </button>
    </main>
  );
}

export default App;
