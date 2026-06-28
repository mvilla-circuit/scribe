import { useAuth } from "./auth";

/** A signed-in user's display details derived from the Supabase session. */
export interface SessionUser {
  /** Display name: the provider's full name, falling back to the email/id. */
  name: string | undefined;
  /** First token of the full name, for greetings; null when unknown. */
  firstName: string | null;
  /** The account email, falling back to the user id. */
  email: string | undefined;
  /** Avatar image URL from the OAuth provider, when present. */
  avatarUrl: string | null;
}

/**
 * Reads the signed-in user's display details out of the auth session metadata,
 * normalizing the provider-specific keys (`full_name`/`name`,
 * `avatar_url`/`picture`) once instead of in every consumer.
 */
export function useSessionUser(): SessionUser {
  const { session } = useAuth();
  const meta = session?.user.user_metadata ?? {};
  const fullName =
    (meta.full_name as string | undefined) ?? (meta.name as string | undefined);
  const email = session?.user.email ?? session?.user.id;
  return {
    name: fullName ?? email,
    firstName: fullName ? (fullName.trim().split(/\s+/)[0] ?? null) : null,
    email,
    avatarUrl:
      (meta.avatar_url as string | undefined) ??
      (meta.picture as string | undefined) ??
      null,
  };
}
