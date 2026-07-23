import { act } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { EntryMeta } from "@/data/entries";
import { profileKey } from "@/data/query-keys";
import { makeEntry } from "@/test/fixtures";
import {
  createTestQueryClient,
  renderHookWithQuery,
} from "@/test/render-with-query";

import { useEntryFonts } from "./use-entry-fonts";

// useProfile reads the session via useAuth; a lightweight stub avoids standing
// up the real (Tauri/Supabase-backed) AuthProvider. Signed-in so the profile
// query is enabled and seeded cache data is actually read.
vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ session: { user: { id: "user-1" } } }),
}));

function clientWithProfileFonts(fonts: Record<string, string>) {
  const client = createTestQueryClient();
  client.setQueryData(profileKey, {
    id: "user-1",
    fonts,
    dictionary: [],
    default_font: null,
    display_name: null,
    theme: "system",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  });
  return client;
}

describe("useEntryFonts", () => {
  it("layers global fonts then the entry's overrides into resolved; inherited stays global-only", () => {
    const entry: EntryMeta = makeEntry({
      font_overrides: { text: "lora" },
    });
    const client = clientWithProfileFonts({
      display: "playfair-display",
      text: "inter",
    });

    const { result } = renderHookWithQuery(
      () => useEntryFonts({ entry, onChangeOverrides: vi.fn() }),
      { client },
    );

    expect(result.current.overrides).toEqual({ text: "lora" });
    expect(result.current.inherited).toEqual(
      expect.objectContaining({ display: "playfair-display", text: "inter" }),
    );
    expect(result.current.resolved).toEqual(
      expect.objectContaining({ display: "playfair-display", text: "lora" }),
    );
  });

  it("emits null via onChange when clearing the last override (collapseEmpty)", () => {
    const entry: EntryMeta = makeEntry({
      font_overrides: { display: "playfair-display" },
    });
    const onChangeOverrides = vi.fn();
    const client = clientWithProfileFonts({});

    const { result } = renderHookWithQuery(
      () => useEntryFonts({ entry, onChangeOverrides }),
      { client },
    );

    act(() => {
      result.current.handlers.clearFont("display");
    });

    expect(onChangeOverrides).toHaveBeenCalledWith(null);
  });

  it("resolves the global-only cascade safely when entry is null", () => {
    const client = clientWithProfileFonts({ code: "jetbrains-mono" });

    const { result } = renderHookWithQuery(
      () => useEntryFonts({ entry: null, onChangeOverrides: vi.fn() }),
      { client },
    );

    expect(result.current.overrides).toEqual({});
    expect(result.current.inherited).toEqual(
      expect.objectContaining({ code: "jetbrains-mono" }),
    );
    expect(result.current.resolved).toEqual(result.current.inherited);
  });
});
