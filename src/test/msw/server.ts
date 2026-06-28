import { setupServer } from "msw/node";

import { handlers } from "./handlers";

// Shared MSW server wired into the global test setup (see src/test/setup.ts).
export const server = setupServer(...handlers);
