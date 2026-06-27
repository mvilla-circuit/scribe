import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// `@tiptap/extension-drag-handle` imports its collaboration peers only to skip
// Yjs-origin transactions. This app has no collaboration, so alias those peers
// to a lightweight no-op shim instead of bundling the whole Yjs stack.
const collabShim = fileURLToPath(
  new URL("./src/editor/shims/tiptapCollab.ts", import.meta.url),
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
});
