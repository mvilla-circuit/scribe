import { QueryClient } from "@tanstack/react-query";

/**
 * The app-wide React Query client. Data is user-scoped and mutated
 * optimistically, so it stays fresh for a while and avoids aggressive
 * background refetching that would fight the UI.
 */
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
