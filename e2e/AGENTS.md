# AGENTS.md — e2e

**Playwright** end-to-end specs. See the root [`AGENTS.md`](../AGENTS.md) for
repo-wide conventions.

## Area-specific rules

- Specs are named `*.spec.ts`; shared setup/fixtures live in `fixtures.ts`.
- Run with `npm run e2e`, or `npm run e2e:ui` for the interactive runner.
- These specs are driven by Playwright, **not** Vitest — Vitest explicitly
  excludes `e2e/`. Don't add `*.test.ts` files here.
- Linting uses the Playwright ESLint plugin. `react-hooks/rules-of-hooks` is
  turned off in this folder because Playwright fixtures take a `use` callback
  param that the React Hooks plugin misreads as React 19's `use` hook.
- CI runs this suite as a separate job and uploads the `playwright-report/`
  artifact on failure.

## Running locally

- `npm run e2e` boots its **own** Vite server on a dedicated port (`1430`) with
  dummy Supabase env injected (`VITE_SUPABASE_URL=http://supabase.test`), then
  runs headless. No real backend, network, or running dev server is required —
  the `authedPage` fixture seeds a fake session into `localStorage` and stubs all
  `rest/v1` traffic against an in-memory store.
- The e2e port (`1430`) is intentionally separate from the app dev server
  (`1420`, pinned with `strictPort`) and the OAuth loopback (`1421`), and
  `reuseExistingServer` is **`false`**, so e2e always starts a clean instance
  with the dummy env. This avoids a subtle failure mode: if e2e reused a real
  `npm run dev` / `npm run tauri dev` server, that server runs with the real
  `.env.local` URL, whose Supabase session storage key
  (`sb-<real-ref>-auth-token`) differs from the dummy key the fixture seeds
  (`sb-supabase-auth-token`, derived from `http://supabase.test`). The seeded
  session is then never found and the app boots to the **sign-in screen** instead
  of the signed-in shell — every `authedPage` spec fails at the first step. If
  you ever see that symptom, it's an env/storage-key mismatch, not a broken spec.
