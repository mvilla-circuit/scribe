import type { PostgrestError, Session } from "@supabase/supabase-js";

// Shared CRUD plumbing for the data layer. These collapse the identical
// "require a signed-in user" guard and "run a write, throw on error" snippet
// that every table file (books, folders, documents, profile, icon upload)
// would otherwise re-declare.

/**
 * Returns the signed-in user's id, or throws the canonical "Not authenticated"
 * error. Centralizes the guard every create/update mutation shares so the
 * message can't drift between call sites.
 */
export function requireUserId(session: Session | null): string {
  const userId = session?.user.id;
  if (!userId) throw new Error("Not authenticated");
  return userId;
}

/**
 * Awaits a Supabase write (insert/update/delete) and throws its error if the
 * request failed, otherwise resolves. Callers build the query with a literal
 * table name so it stays fully typed; this only owns the shared error check.
 */
export async function execWrite(
  query: PromiseLike<{ error: PostgrestError | null }>,
): Promise<void> {
  const { error } = await query;
  if (error) throw error;
}
