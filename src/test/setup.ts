import "@testing-library/jest-dom/vitest";

import { afterAll, afterEach, beforeAll, vi } from "vitest";

import { server } from "./msw/server";

// jsdom lacks ResizeObserver, which Radix overlays (popover/dropdown/tooltip)
// instantiate to measure their anchor. A no-op stub lets any overlay-rendering
// component test mount without each one re-stubbing it.
class ResizeObserverStub {
  observe() {
    // no-op: jsdom never lays out, so there is nothing to observe.
  }
  unobserve() {
    // no-op
  }
  disconnect() {
    // no-op
  }
}
vi.stubGlobal("ResizeObserver", ResizeObserverStub);

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
