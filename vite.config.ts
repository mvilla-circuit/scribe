/// <reference types="vitest/config" />
import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// `@tiptap/extension-drag-handle` imports its collaboration peers only to skip
// Yjs-origin transactions. This app has no collaboration, so alias those peers
// to a lightweight no-op shim instead of bundling the whole Yjs stack.
const collabShim = fileURLToPath(
  new URL("./src/editor/shims/tiptap-collab.ts", import.meta.url),
);

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      // `@/x` -> `src/x` (mirrors tsconfig paths). The `@rollup/plugin-alias`
      // boundary match only fires on `@/...`, so scoped packages like
      // `@tiptap/*` and `@radix-ui/*` are left untouched.
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@tiptap/extension-collaboration": collabShim,
      "@tiptap/y-tiptap": collabShim,
    },
  },
  server: { port: 1420, strictPort: true },
  clearScreen: false,
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
    // E2E specs are driven by Playwright, not Vitest.
    exclude: ["**/node_modules/**", "**/dist/**", "e2e/**"],
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
});
