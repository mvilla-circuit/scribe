# AGENTS.md — src/fonts

Catalog, optical metrics, lazy loaders, and cascade resolution for the reading
surface. See the root [`AGENTS.md`](../../AGENTS.md) for repo-wide conventions.

## Boundaries

```
data  ↔  fonts  →  lib
components → fonts
editor ↛ fonts   (consumes --font-* CSS vars only)
```

- Persist only `FontMap` role → fontId maps (`data/`). Never store metrics.
- Resolve with `resolveFonts(...)` so aliases canonicalize before load/metrics.
- Emit CSS only through `fontVarsFor` / the global + scoped hooks.

## Lab → runtime pipeline

Type and mono labs are **gitignored** (`type-lab.html`, `mono-lab.html`,
`font-lab.html`, `/fonts/` at repo root). Shipping truth lives in this folder.

When changing the curated set or optical baselines:

1. Tune faces in the local lab HTML (or re-export from a locked snapshot).
2. Update `_name-to-id.json` (family label → catalog id).
3. Update `metrics.json` (`display` / `text` / `code` keys must cover every
   selectable id for that role).
4. Add/remove `@fontsource/*` deps or files under `assets/` + `loaders/local.ts`.
5. If retiring an id, add a successor in `aliases.ts` (do not rewrite stored JSONB).
6. Run the gate tests below, then `npm run verify`.

Brand face (Cardillac) is **not** in `ROLE_FONTS`. It stays in `FONT_REGISTRY`
for the wordmark only and loads when `isCardillacAllowed()` is true (Vite DEV
or `VITE_ALLOW_CARDILLAC=true`). See [`assets/LICENSES.md`](assets/LICENSES.md)
and [`brand.ts`](brand.ts). Reading-surface titles use `displayTitleStyle()`.

## Gate tests for a catalog change

| Check                                         | File                        |
| --------------------------------------------- | --------------------------- |
| Role lists ↔ metrics keys                     | `catalog.test.ts`           |
| Alias map + live registry targets             | `aliases.test.ts`           |
| Fontsource cuts cover metric weights          | `metrics-cuts.test.ts`      |
| `--font-*` var names the editor expects       | `editor-css-contract.test.ts` |
| Local injectors (variable / static mid-weights) | `loaders/local.test.ts`   |

## Load vs ready

- `ensureFontLoaded` — CSS imported (reading surface can assign stacks).
- `ensureFontReady` — CSS + `document.fonts` cuts; use before painting a preview
  or brand wordmark to avoid `font-display: swap` FOUT.
