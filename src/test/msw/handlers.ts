import type { RequestHandler } from "msw";

// Default handlers are intentionally empty. Each data-layer test declares the
// Supabase endpoints it depends on with `server.use(...)`, which keeps fixtures
// next to the assertions that rely on them and makes unmocked calls fail.
export const handlers: RequestHandler[] = [];
