export function MainEmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-8 text-center">
      <div className="max-w-md">
        <h2 className="text-2xl font-semibold tracking-tight text-text">
          Welcome to Scribe
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          A calm place to write. Select a document from the sidebar to begin —
          or create your first book once books arrive in the next phase.
        </p>
      </div>
    </div>
  );
}
