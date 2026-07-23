import { QueryClient } from "@tanstack/react-query";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { delay, http, HttpResponse } from "msw";
import { forwardRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { DocumentMeta } from "@/data/documents";
import { booksKey, documentContentKey, pageIndexKey } from "@/data/query-keys";
import { makeBook, makeDocument } from "@/test/fixtures";
import { server } from "@/test/msw/server";
import { renderWithProviders } from "@/test/render-with-query";

import { DocumentView } from "./document-view";

const cover = vi.hoisted(() => ({
  upload: { mutateAsync: vi.fn() },
  update: { mutate: vi.fn(), mutateAsync: vi.fn() },
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/components/ui/page-cover", () => ({
  PageCover: ({
    coverUrl,
    onRemove,
  }: {
    coverUrl: string | null;
    onUpload: (file: File) => Promise<string>;
    onRemove: () => void;
  }) =>
    coverUrl ? (
      <section aria-label="Page cover">
        <img src={coverUrl} alt="Page cover" />
        <button type="button" onClick={onRemove}>
          Remove cover
        </button>
      </section>
    ) : null,
  AddCoverButton: ({
    onUpload,
  }: {
    onUpload: (file: File) => Promise<string>;
  }) => (
    <button
      type="button"
      aria-label="Add cover"
      onClick={() => {
        void onUpload(new File(["cover"], "cover.png", { type: "image/png" }));
      }}
    >
      Add cover
    </button>
  ),
}));

vi.mock("@/data/cover-upload", () => ({
  useUploadCover: () => cover.upload,
  deleteCoverObject: vi.fn(),
}));

vi.mock("@/data/documents", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/data/documents")>();
  return { ...actual, useUpdateDocument: () => cover.update };
});

// DocumentView's mutation hooks read the session via useAuth; a lightweight,
// mutable stub avoids standing up the real (Tauri/Supabase-backed) AuthProvider.
// Signed-out by default (matches the copy-link test); dictionary-gating tests
// opt into a signed-in user so the profile query actually runs.
const auth = vi.hoisted(() => {
  const state: { session: { user: { id: string } } | null } = {
    session: null,
  };
  return state;
});
vi.mock("@/lib/auth", () => ({ useAuth: () => ({ session: auth.session }) }));

// The real editor is a heavy, lazily-loaded TipTap surface; a stub lets these
// tests assert whether it is mounted (the gating behavior) without booting it.
vi.mock("@/editor/lazy-editor", () => ({
  Editor: forwardRef<unknown, Record<string, unknown>>(function EditorStub() {
    return <div data-testid="scribe-editor" />;
  }),
}));

const PROFILE_URL = "http://supabase.test/rest/v1/profiles";

afterEach(() => {
  auth.session = null;
  vi.clearAllMocks();
});

// A client that never refetches, so seeded cache entries stand in for the
// network and only the query left unseeded (the profile) exercises MSW.
function noRefetchClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity, staleTime: Infinity },
      mutations: { retry: false },
    },
  });
}

const BOOK = makeBook({ id: "b1", title: "Genesis" });

function meta(overrides: Partial<DocumentMeta> = {}): DocumentMeta {
  const { content: _content, ...rest } = makeDocument({
    id: "d1",
    book_id: "b1",
    title: "Chapter 1",
    ...overrides,
  });
  return rest;
}

describe("DocumentView copy link", () => {
  it("copies the page link from the title affordance", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    // userEvent.setup() installs its own clipboard stub, so override it after.
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    const doc = meta();
    renderWithProviders(
      <DocumentView book={BOOK} document={doc} documents={[doc]} />,
    );

    await user.click(screen.getByRole("button", { name: "Copy link to page" }));

    expect(writeText).toHaveBeenCalledWith("scribe://page/d1");
  });
});

describe("DocumentView cover and banner", () => {
  it("sets a cover and clears the existing banner", async () => {
    const user = userEvent.setup();
    cover.upload.mutateAsync.mockResolvedValue("https://example.com/cover.png");
    cover.update.mutateAsync.mockResolvedValue(undefined);
    const doc = meta({
      banner_color: "var(--swatch-stone)",
      banner_text: "A quiet preface",
    });

    renderWithProviders(
      <DocumentView book={BOOK} document={doc} documents={[doc]} />,
    );

    await user.click(screen.getByRole("button", { name: "Add cover" }));

    expect(cover.update.mutateAsync).toHaveBeenCalledWith({
      id: "d1",
      cover_url: "https://example.com/cover.png",
      cover_position: 50,
      banner_color: null,
      banner_text: null,
    });
  });

  it("sets a banner and clears the existing cover", async () => {
    const user = userEvent.setup();
    const doc = meta({ cover_url: "https://example.com/cover.png" });

    renderWithProviders(
      <DocumentView book={BOOK} document={doc} documents={[doc]} />,
    );

    await user.click(screen.getByRole("button", { name: "Add banner" }));
    await user.click(screen.getByRole("button", { name: "Stone" }));

    expect(cover.update.mutate).toHaveBeenCalledWith(
      {
        id: "d1",
        banner_color: "var(--swatch-stone)",
        cover_url: null,
      },
      expect.any(Object),
    );
  });
});

describe("DocumentView spellcheck dictionary gating", () => {
  it("holds the editor back while the profile dictionary is still loading", () => {
    // Signed in, so the profile query runs; leave it pending forever.
    auth.session = { user: { id: "user-1" } };
    server.use(
      http.get(PROFILE_URL, async () => {
        // Never settles within the test: the profile (dictionary) stays loading.
        await delay("infinite");
        return HttpResponse.json(null);
      }),
    );

    const client = noRefetchClient();
    // Content is ready; only the dictionary (profile) is outstanding.
    client.setQueryData(documentContentKey("d1"), {});

    const doc = meta();
    renderWithProviders(
      <DocumentView book={BOOK} document={doc} documents={[doc]} />,
      { client },
    );

    // The page renders, but the editor is withheld until the dictionary settles
    // so account-wide words aren't briefly flagged as misspellings.
    expect(
      screen.getByRole("button", { name: "Copy link to page" }),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("scribe-editor")).not.toBeInTheDocument();
  });

  it("mounts the editor once the profile dictionary has resolved", async () => {
    auth.session = { user: { id: "user-1" } };
    server.use(
      http.get(PROFILE_URL, () =>
        HttpResponse.json({ id: "user-1", dictionary: [] }),
      ),
    );

    const client = noRefetchClient();
    client.setQueryData(documentContentKey("d1"), {});
    // Seeded so EditorBridgeHost's books/page-index queries don't hit the network.
    client.setQueryData(booksKey, [BOOK]);
    client.setQueryData(pageIndexKey, []);

    const doc = meta();
    renderWithProviders(
      <DocumentView book={BOOK} document={doc} documents={[doc]} />,
      { client },
    );

    expect(await screen.findByTestId("scribe-editor")).toBeInTheDocument();
  });
});
