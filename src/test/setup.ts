import "@testing-library/jest-dom/vitest";

import { afterAll, afterEach, beforeAll } from "vitest";

import { server } from "./msw/server";

// Testing Library auto-cleans the DOM after each test because `globals` is on
// (it hooks the global `afterEach`), so we only manage the MSW server here.

// Fail loudly on any request a test did not explicitly mock; data-layer tests
// register the Supabase endpoints they expect via `server.use(...)`.
beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});
