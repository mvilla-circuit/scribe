import { BookIcon } from "./sidebar/icons";

// Temporary main-area view shown when a book is selected. The real Book view
// (Title Page, Table of Contents, document hierarchy) arrives in Phase 3b.
export function BookPlaceholder({ title }: { title: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-8 text-center">
      <div className="max-w-md">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-lg border border-border bg-surface text-muted">
          <BookIcon size={22} />
        </div>
        <h2
          className="text-3xl tracking-tight text-text"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          {title}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          This book is ready. The reading surface — title page, table of
          contents, and your documents — arrives in the next phase.
        </p>
      </div>
    </div>
  );
}
