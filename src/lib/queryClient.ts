import { QueryClient } from "@tanstack/react-query";

// Data is user-scoped and mutated optimistically, so we keep it fresh for a
// while and avoid aggressive background refetching that would fight the UI.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
    mutations: {
      retry: 0,
    },
  },
});
