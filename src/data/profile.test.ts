import { waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { afterEach, describe, expect, it, vi } from "vitest";

import { server } from "@/test/msw/server";
import {
  createTestQueryClient,
  renderHookWithQuery,
} from "@/test/render-with-query";

import type { Profile } from "./profile";
import {
  profileDictionary,
  profileFonts,
  useProfile,
  useUpdateProfileDictionary,
  useUpdateProfileFonts,
} from "./profile";

// A mutable session so individual tests can simulate the signed-out state that
// gates `useProfile`'s query.
const auth = vi.hoisted(() => {
  const state: { session: { user: { id: string } } | null } = {
    session: { user: { id: "user-1" } },
  };
  return state;
});
vi.mock("@/lib/auth", () => ({ useAuth: () => ({ session: auth.session }) }));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

const PROFILE_URL = "http://supabase.test/rest/v1/profiles";

function makeProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: "user-1",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    default_font: null,
    display_name: null,
    fonts: {},
    dictionary: [],
    theme: "system",
    ...overrides,
  };
}

afterEach(() => {
  auth.session = { user: { id: "user-1" } };
});

describe("profileFonts", () => {
  it("returns the fonts map when it is a plain object", () => {
    expect(profileFonts(makeProfile({ fonts: { text: "lora" } }))).toEqual({
      text: "lora",
    });
  });

  it("falls back to an empty map for null/undefined/array fonts", () => {
    expect(profileFonts(null)).toEqual({});
    expect(profileFonts(undefined)).toEqual({});
    expect(profileFonts(makeProfile({ fonts: ["lora"] }))).toEqual({});
  });

  it("falls back to an empty map when fonts is a primitive", () => {
    expect(profileFonts(makeProfile({ fonts: 5 }))).toEqual({});
    expect(profileFonts(makeProfile({ fonts: "lora" }))).toEqual({});
  });

  it("passes a clean string-valued map through unchanged", () => {
    expect(
      profileFonts(
        makeProfile({ fonts: { display: "lora", text: "inter", code: "" } }),
      ),
    ).toEqual({ display: "lora", text: "inter", code: "" });
  });

  it("keeps only the string-valued entries from a mixed map", () => {
    expect(
      profileFonts(
        makeProfile({
          fonts: { text: "lora", code: 42, display: null },
        }),
      ),
    ).toEqual({ text: "lora" });
  });
});

describe("profileDictionary", () => {
  it("returns the stored word list when it is an array of strings", () => {
    expect(
      profileDictionary(makeProfile({ dictionary: ["zzyzx", "scribe"] })),
    ).toEqual(["zzyzx", "scribe"]);
  });

  it("falls back to an empty list for null/undefined and drops non-strings", () => {
    expect(profileDictionary(null)).toEqual([]);
    expect(profileDictionary(undefined)).toEqual([]);
    expect(
      profileDictionary(makeProfile({ dictionary: ["ok", 5, null] })),
    ).toEqual(["ok"]);
  });
});

describe("useProfile", () => {
  it("fetches the signed-in user's profile row", async () => {
    server.use(
      http.get(PROFILE_URL, () =>
        HttpResponse.json(makeProfile({ display_name: "Writer" })),
      ),
    );

    const { result } = renderHookWithQuery(() => useProfile());

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.data?.display_name).toBe("Writer");
  });

  it("stays disabled (and does not fetch) when signed out", () => {
    auth.session = null;
    const { result } = renderHookWithQuery(() => useProfile());
    expect(result.current.fetchStatus).toBe("idle");
  });
});

describe("useUpdateProfileFonts", () => {
  it("optimistically writes the fonts map and keeps it on success", async () => {
    server.use(
      http.post(PROFILE_URL, () => new HttpResponse(null, { status: 204 })),
    );

    const client = createTestQueryClient();
    client.setQueryData(["profile"], makeProfile({ fonts: {} }));

    const { result } = renderHookWithQuery(() => useUpdateProfileFonts(), {
      client,
    });
    result.current.mutate({ text: "lora" });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(client.getQueryData<Profile>(["profile"])?.fonts).toEqual({
      text: "lora",
    });
  });

  it("seeds an optimistic profile row when none is cached yet", async () => {
    server.use(
      http.post(PROFILE_URL, () => new HttpResponse(null, { status: 204 })),
    );

    const client = createTestQueryClient();
    // No profile row in the cache: the first-ever font change must still apply
    // optimistically rather than no-op against a missing row.
    client.setQueryData(["profile"], null);

    const { result } = renderHookWithQuery(() => useUpdateProfileFonts(), {
      client,
    });
    result.current.mutate({ text: "lora" });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    const seeded = client.getQueryData<Profile>(["profile"]);
    expect(seeded?.id).toBe("user-1");
    expect(seeded?.fonts).toEqual({ text: "lora" });
  });

  it("rolls back the optimistic write when the server rejects it", async () => {
    server.use(
      http.post(PROFILE_URL, () => new HttpResponse(null, { status: 500 })),
    );

    const client = createTestQueryClient();
    client.setQueryData(["profile"], makeProfile({ fonts: { text: "old" } }));

    const { result } = renderHookWithQuery(() => useUpdateProfileFonts(), {
      client,
    });
    result.current.mutate({ text: "lora" });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(client.getQueryData<Profile>(["profile"])?.fonts).toEqual({
      text: "old",
    });
  });
});

describe("useUpdateProfileDictionary", () => {
  it("adds a word to the profile dictionary optimistically and keeps it on success", async () => {
    server.use(
      http.post(PROFILE_URL, () => new HttpResponse(null, { status: 204 })),
    );

    const client = createTestQueryClient();
    client.setQueryData(["profile"], makeProfile({ dictionary: [] }));

    const { result } = renderHookWithQuery(() => useUpdateProfileDictionary(), {
      client,
    });
    result.current.mutate(["zzyzx"]);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(client.getQueryData<Profile>(["profile"])?.dictionary).toEqual([
      "zzyzx",
    ]);
  });

  it("seeds an optimistic profile row when none is cached yet", async () => {
    server.use(
      http.post(PROFILE_URL, () => new HttpResponse(null, { status: 204 })),
    );

    const client = createTestQueryClient();
    client.setQueryData(["profile"], null);

    const { result } = renderHookWithQuery(() => useUpdateProfileDictionary(), {
      client,
    });
    result.current.mutate(["zzyzx"]);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    const seeded = client.getQueryData<Profile>(["profile"]);
    expect(seeded?.id).toBe("user-1");
    expect(seeded?.dictionary).toEqual(["zzyzx"]);
  });

  it("rolls the optimistic write back when the server rejects it", async () => {
    server.use(
      http.post(PROFILE_URL, () => new HttpResponse(null, { status: 500 })),
    );

    const client = createTestQueryClient();
    client.setQueryData(["profile"], makeProfile({ dictionary: ["old"] }));

    const { result } = renderHookWithQuery(() => useUpdateProfileDictionary(), {
      client,
    });
    result.current.mutate(["zzyzx"]);

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(client.getQueryData<Profile>(["profile"])?.dictionary).toEqual([
      "old",
    ]);
  });
});
