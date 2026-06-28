import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  render,
  renderHook,
  type RenderHookOptions,
  type RenderOptions,
} from "@testing-library/react";
import type { PropsWithChildren, ReactElement } from "react";

import { TooltipProvider } from "@/components/ui/tooltip";

// A throwaway QueryClient (one per test, so state never leaks) with retries off
// for deterministic failures. gcTime is Infinity so observer-less cache entries
// seeded via setQueryData survive long enough for assertions to read them.
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity, staleTime: 0 },
      mutations: { retry: false },
    },
  });
}

function makeWrapper(client: QueryClient) {
  return function QueryWrapper({ children }: PropsWithChildren) {
    return (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
  };
}

type WithClient<T> = T & { client?: QueryClient };

// Renders a hook inside a fresh QueryClientProvider and returns the client so
// tests can seed/inspect the cache. The wrapper here is also the seam to extend
// for full component rendering (wrap render() the same way) when needed.
export function renderHookWithQuery<Result, Props>(
  hook: (props: Props) => Result,
  options: WithClient<Omit<RenderHookOptions<Props>, "wrapper">> = {},
) {
  const { client = createTestQueryClient(), ...hookOptions } = options;
  return {
    client,
    ...renderHook(hook, { wrapper: makeWrapper(client), ...hookOptions }),
  };
}

// Renders a component inside a fresh QueryClientProvider + TooltipProvider and
// returns the client so tests can seed/inspect the React Query cache (e.g.
// `client.setQueryData(booksKey, [...])`) before or after rendering.
export function renderWithProviders(
  ui: ReactElement,
  options: WithClient<Omit<RenderOptions, "wrapper">> = {},
) {
  const { client = createTestQueryClient(), ...renderOptions } = options;
  const Wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={client}>
      <TooltipProvider>{children}</TooltipProvider>
    </QueryClientProvider>
  );
  return {
    client,
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  };
}
