/// <reference types="vitest/config" />
import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

// `@tiptap/extension-drag-handle` imports its collaboration peers only to skip
// Yjs-origin transactions. This app has no collaboration, so alias those peers
// to a lightweight no-op shim instead of bundling the whole Yjs stack.
const collabShim = fileURLToPath(
  new URL("./src/editor/shims/tiptap-collab.ts", import.meta.url),
);

// `dictionary-en` (v4) only exports its `index.js` entry, whose default export
// reads the aff/dic off disk with `node:fs` — fine in Node, but it can't be
// bundled for the browser. The checker instead wants the raw Hunspell files as
// strings (Vite `?raw`), so map clean `dictionary-en/aff|dic` specifiers past
// the package's `exports` restriction straight to the files. TypeScript resolves
// the same `dictionary-en/aff?raw` specifiers through vite/client's `*?raw`
// ambient module, and knip still attributes them to the `dictionary-en` package.
const srcDir = fileURLToPath(new URL("./src", import.meta.url));
const dictAff = fileURLToPath(
  new URL("./node_modules/dictionary-en/index.aff", import.meta.url),
);
const dictDic = fileURLToPath(
  new URL("./node_modules/dictionary-en/index.dic", import.meta.url),
);

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  // Cardillac is personal-use only. Serve/test always resolve the real assets;
  // production builds include them only when VITE_ALLOW_CARDILLAC=true (shell
  // or .env* — loadEnv so .env.local matches import.meta.env).
  const env = loadEnv(mode, process.cwd(), "");
  const cardillacAllowedInBuild =
    env.VITE_ALLOW_CARDILLAC === "true" ||
    process.env.VITE_ALLOW_CARDILLAC === "true";
  const allowCardillac = command !== "build" || cardillacAllowedInBuild;
  const cardillacModule = allowCardillac
    ? "./src/fonts/cardillac-assets.ts"
    : "./src/fonts/cardillac-assets-empty.ts";
  const cardillacAssets = fileURLToPath(
    new URL(cardillacModule, import.meta.url),
  );

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      // Array form so the dictionary entries can use regex `find`s (a plain string
      // alias won't match the trailing `?raw` query). Prefix-replacing regexes
      // keep the `?raw` suffix intact so Vite's raw loader still fires.
      alias: [
        { find: /^dictionary-en\/aff/, replacement: dictAff },
        { find: /^dictionary-en\/dic/, replacement: dictDic },
        { find: "@tiptap/extension-collaboration", replacement: collabShim },
        { find: "@tiptap/y-tiptap", replacement: collabShim },
        { find: "@scribe/cardillac-assets", replacement: cardillacAssets },
        // `@/x` -> `src/x` (mirrors tsconfig paths). The `@rollup/plugin-alias`
        // boundary match only fires on `@/...`, so scoped packages like
        // `@tiptap/*` and `@radix-ui/*` are left untouched.
        { find: "@", replacement: srcDir },
      ],
    },
    server: { port: 1420, strictPort: true },
    clearScreen: false,
    build: {
      rollupOptions: {
        output: {
          // Split heavy vendor groups into their own chunks so the editor's
          // TipTap/ProseMirror payload, the Radix UI primitives, and the data
          // layer each cache and load independently of the app shell.
          manualChunks: (id) => {
            if (!id.includes("node_modules")) return undefined;
            if (
              id.includes("node_modules/@tiptap") ||
              id.includes("node_modules/prosemirror-")
            ) {
              return "tiptap";
            }
            if (id.includes("node_modules/@radix-ui")) return "radix";
            if (
              id.includes("node_modules/@supabase") ||
              id.includes("node_modules/@tanstack")
            ) {
              return "data";
            }
            return undefined;
          },
        },
      },
    },
    test: {
      // A single jsdom environment runs every tier (pure-logic, store, component,
      // and data-layer hooks). Vitest 4 removed `environmentMatchGlobs`, and a
      // node/jsdom split would break modules that touch browser globals at import
      // time (e.g. the Zustand `persist` store reads `localStorage`). The startup
      // cost of jsdom is negligible at this suite size.
      environment: "jsdom",
      globals: true,
      setupFiles: ["./src/test/setup.ts"],
      // The Supabase client throws at import time without these. Dummy values are
      // fine: data-layer tests intercept the HTTP boundary with MSW, and the URL
      // here is what those handlers match against.
      env: {
        VITE_SUPABASE_URL: "http://supabase.test",
        VITE_SUPABASE_ANON_KEY: "test-anon-key",
      },
      // Reset spies/mocks between tests so suites can't leak into each other.
      restoreMocks: true,
      // E2E specs are driven by Playwright, not Vitest. Git worktrees under
      // `.worktrees/` are separate checkouts and must not be swept into this
      // suite (they bring their own React copies and fail with hook mismatches).
      exclude: ["**/node_modules/**", "**/dist/**", "e2e/**", ".worktrees/**"],
      coverage: {
        provider: "v8",
        reporter: ["text", "html"],
        include: ["src/**"],
        // Exclude generated types, the test harness itself, and icon/asset-only
        // modules that carry no logic worth covering.
        exclude: [
          "src/test/**",
          "src/**/*.d.ts",
          "src/lib/database.types.ts",
          "src/**/icons.tsx",
          "src/main.tsx",
          "src/vite-env.d.ts",
        ],
      },
    },
  };
});
