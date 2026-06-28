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
