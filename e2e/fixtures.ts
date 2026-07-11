import { expect, type Page, type Route, test as base } from "@playwright/test";

// The localStorage key the Supabase client persists its session under, derived
// from the dummy VITE_SUPABASE_URL (`http://supabase.test`). Confirmed against
// @supabase/auth-js's storage adapter.
const SUPABASE_STORAGE_KEY = "sb-supabase-auth-token";

// A plausible, far-from-expiry session so `getSession()` returns it without
// attempting a token refresh (which would hit the network).
function fakeSession(): string {
  const oneYear = 60 * 60 * 24 * 365;
  return JSON.stringify({
    access_token: "test-access-token",
    refresh_token: "test-refresh-token",
    token_type: "bearer",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + oneYear,
    user: {
      id: "user-1",
      aud: "authenticated",
      role: "authenticated",
      email: "tester@example.com",
      app_metadata: {},
      user_metadata: { full_name: "Test Writer" },
      created_at: "2026-01-01T00:00:00.000Z",
    },
  });
}

type Row = Record<string, unknown>;

/**
 * Rows seeded into the in-memory Supabase REST stand-in, keyed by table.
 * Collection-only tables are optional so existing book specs stay terse.
 */
export interface SeedData {
  books: Row[];
  folders: Row[];
  documents: Row[];
  collections?: Row[];
  entries?: Row[];
  datagrids?: Row[];
  datagrid_views?: Row[];
  datagrid_rows?: Row[];
}

const EMPTY_SEED: SeedData = { books: [], folders: [], documents: [] };

// PostgREST encodes filters as `column=eq.<value>` or `column=in.(a,b)`;
// pull the matching id(s) back out.
function eqParam(url: URL, key: string): string | null {
  const raw = url.searchParams.get(key);
  return raw?.startsWith("eq.") ? raw.slice(3) : null;
}

function inParam(url: URL, key: string): string[] | null {
  const raw = url.searchParams.get(key);
  if (!raw?.startsWith("in.(") || !raw.endsWith(")")) return null;
  const inner = raw.slice(4, -1);
  if (inner === "") return [];
  return inner.split(",").map((part) => part.replace(/^"(.*)"$/, "$1"));
}

function parseRows(raw: string | null): Row[] {
  if (!raw) return [];
  const parsed: unknown = JSON.parse(raw);
  return Array.isArray(parsed) ? (parsed as Row[]) : [parsed as Row];
}

// Backs every `**/rest/v1/**` call against a mutable per-test store, so a
// created row survives the optimistic mutation's settle-time refetch (which
// would otherwise re-read the original seed and drop it).
function handleRest(store: Record<string, Row[]>, route: Route): Promise<void> {
  const request = route.request();
  const url = new URL(request.url());
  const table = url.pathname.split("/rest/v1/")[1]?.split("/")[0] ?? "";
  const rows = (store[table] ??= []);

  switch (request.method()) {
    case "GET": {
      const bookId = eqParam(url, "book_id");
      const collectionId = eqParam(url, "collection_id");
      const datagridId = eqParam(url, "datagrid_id");
      const id = eqParam(url, "id");
      let result = rows;
      if (bookId) result = result.filter((r) => r.book_id === bookId);
      if (collectionId)
        result = result.filter((r) => r.collection_id === collectionId);
      if (datagridId)
        result = result.filter((r) => r.datagrid_id === datagridId);
      if (id) result = result.filter((r) => r.id === id);
      // `.single()`/`.maybeSingle()` request a lone object via this Accept type;
      // mirror PostgREST by returning the matching row (or null) rather than an
      // array, so a single-row read resolves to the object the caller expects.
      const wantsObject = (request.headers().accept ?? "").includes(
        "application/vnd.pgrst.object+json",
      );
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(wantsObject ? (result[0] ?? null) : result),
      });
    }
    case "POST": {
      rows.push(...parseRows(request.postData()));
      // Inserts use `Prefer: return=minimal`, so an empty body is enough.
      return route.fulfill({
        status: 201,
        contentType: "application/json",
        body: "[]",
      });
    }
    case "PATCH": {
      const id = eqParam(url, "id");
      const ids = inParam(url, "id");
      const patch = parseRows(request.postData())[0] ?? {};
      if (id) {
        for (const r of rows) {
          if (r.id === id) Object.assign(r, patch);
        }
      } else if (ids) {
        const match = new Set(ids);
        for (const r of rows) {
          if (match.has(String(r.id))) Object.assign(r, patch);
        }
      } else {
        return route.fulfill({ status: 400, body: "missing id filter" });
      }
      return route.fulfill({ status: 204, body: "" });
    }
    case "DELETE": {
      const id = eqParam(url, "id");
      const ids = inParam(url, "id");
      if (id) {
        store[table] = rows.filter((r) => r.id !== id);
      } else if (ids) {
        const remove = new Set(ids);
        store[table] = rows.filter((r) => !remove.has(String(r.id)));
      } else {
        // Refuse unfiltered deletes so a missing filter can't wipe the table.
        return route.fulfill({ status: 400, body: "missing id filter" });
      }
      return route.fulfill({ status: 204, body: "" });
    }
    default:
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: "[]",
      });
  }
}

// `authedPage` boots straight into the signed-in app: it seeds a session into
// localStorage and routes Supabase REST through the in-memory store above.
// Override `seed` per test (via `test.use({ seed: ... })`) to start with books,
// folders, or documents already present.
export const test = base.extend<{ seed: SeedData; authedPage: Page }>({
  seed: [EMPTY_SEED, { option: true }],
  authedPage: async ({ page, seed }, use) => {
    const store: Record<string, Row[]> = {
      books: [...seed.books],
      folders: [...seed.folders],
      documents: [...seed.documents],
      collections: [...(seed.collections ?? [])],
      entries: [...(seed.entries ?? [])],
      datagrids: [...(seed.datagrids ?? [])],
      datagrid_views: [...(seed.datagrid_views ?? [])],
      datagrid_rows: [...(seed.datagrid_rows ?? [])],
    };

    await page.route("**/rest/v1/**", (route) => handleRest(store, route));
    await page.addInitScript(
      ([key, value]) => {
        window.localStorage.setItem(key, value);
      },
      [SUPABASE_STORAGE_KEY, fakeSession()] as const,
    );
    await use(page);
  },
});

export { expect };
