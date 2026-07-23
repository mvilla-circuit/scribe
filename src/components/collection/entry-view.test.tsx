import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { forwardRef, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { EntryFontOverrides } from "@/data/entries";
import type { OutlineHeading } from "@/editor/outline";
import { useUIStore } from "@/store/ui";
import { renderWithProviders } from "@/test/render-with-query";

import { EntryView } from "./entry-view";

// jsdom has no IntersectionObserver, which PageOutline uses to track the
// active heading — a no-op stub lets the outline mount without it.
class IntersectionObserverStub {
  observe() {
    // no-op
  }
  unobserve() {
    // no-op
  }
  disconnect() {
    // no-op
  }
}
vi.stubGlobal("IntersectionObserver", IntersectionObserverStub);

const hooks = vi.hoisted(() => ({
  rename: { mutate: vi.fn() },
  update: { mutate: vi.fn(), mutateAsync: vi.fn() },
  updateContent: { mutateAsync: vi.fn() },
  updateFontOverrides: { mutate: vi.fn(), mutateAsync: vi.fn() },
  upload: { mutateAsync: vi.fn() },
  entryCollectionId: "c1",
  entryCoverUrl: null as string | null,
  entryFontOverrides: null as EntryFontOverrides | null,
  entrySubtitle: null as string | null,
  entryShowSubtitle: false,
  entryShowOutline: false,
}));

vi.mock("@/components/ui/page-cover", () => ({
  PageCover: ({
    coverUrl,
    onRemove,
  }: {
    coverUrl: string | null;
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
  useUploadCover: () => hooks.upload,
  deleteCoverObject: vi.fn(),
}));

vi.mock("@/data/entries", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/data/entries")>();
  return {
    ...actual,
    useEntries: () => ({
      data: [
        {
          id: "e1",
          user_id: "user-1",
          collection_id: hooks.entryCollectionId,
          title: "Field notes",
          icon: null,
          cover_url: hooks.entryCoverUrl,
          properties: {},
          font_overrides: hooks.entryFontOverrides,
          subtitle: hooks.entrySubtitle,
          show_subtitle: hooks.entryShowSubtitle,
          show_outline: hooks.entryShowOutline,
          position: 1024,
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z",
        },
      ],
      isLoading: false,
      isError: false,
    }),
    useEntryContent: () => ({ data: {}, isSuccess: true }),
    useRenameEntry: () => hooks.rename,
    useUpdateEntry: () => hooks.update,
    useUpdateEntryContent: () => hooks.updateContent,
    useUpdateEntryFontOverrides: () => hooks.updateFontOverrides,
  };
});

// useEntryFonts reads the signed-in profile for the global font layer; a
// no-profile stub keeps the entry's own overrides the whole cascade so tests
// don't need to stand up auth/session state to exercise the fonts control.
vi.mock("@/data/profile", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/data/profile")>();
  return {
    ...actual,
    useProfile: () => ({ data: null, isLoading: false }),
  };
});

vi.mock("@/data/collections", () => ({
  useCollections: () => ({
    data: [
      { id: "c1", name: "Research" },
      { id: "c2", name: "Archive" },
    ],
  }),
}));

vi.mock("@/editor/lazy-editor", () => ({
  Editor: forwardRef<unknown, Record<string, unknown>>(
    function EditorStub(props) {
      const onOutlineChange = props.onOutlineChange as
        ((headings: OutlineHeading[]) => void) | undefined;
      return (
        <div className="scribe-prose" data-testid="scribe-editor">
          <button
            type="button"
            onClick={() => {
              onOutlineChange?.([{ pos: 1, level: 1, text: "Field log" }]);
            }}
          >
            Emit headings
          </button>
        </div>
      );
    },
  ),
}));

vi.mock("@/components/book/editor-bridge-host", () => ({
  EditorBridgeHost: ({ children }: { children: ReactNode }) => children,
}));

vi.mock("@/components/ui/masthead", () => ({
  Masthead: ({
    children,
    actions,
  }: {
    children: ReactNode;
    actions?: ReactNode;
  }) => (
    <header>
      {actions}
      {children}
    </header>
  ),
}));

beforeEach(() => {
  vi.clearAllMocks();
  hooks.entryCollectionId = "c1";
  hooks.entryCoverUrl = null;
  hooks.entryFontOverrides = null;
  hooks.entrySubtitle = null;
  hooks.entryShowSubtitle = false;
  hooks.entryShowOutline = false;
});

describe("EntryView", () => {
  it("renders title and editor", () => {
    renderWithProviders(<EntryView collectionId="c1" entryId="e1" />);

    expect(screen.getByRole("textbox", { name: "Document title" })).toHaveValue(
      "Field notes",
    );
    expect(screen.getByTestId("scribe-editor")).toBeInTheDocument();
  });

  it("renaming commits via rename mutation", () => {
    renderWithProviders(<EntryView collectionId="c1" entryId="e1" />);

    const title = screen.getByRole("textbox", { name: "Document title" });
    fireEvent.change(title, { target: { value: "Archive notes" } });
    fireEvent.blur(title);

    expect(hooks.rename.mutate).toHaveBeenCalledWith({
      id: "e1",
      title: "Archive notes",
    });
  });

  it("breadcrumbs the entry's collection even when the store prop is stale", () => {
    hooks.entryCollectionId = "c2";
    renderWithProviders(<EntryView collectionId="c1" entryId="e1" />);

    expect(screen.getByRole("button", { name: "Archive" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Research" }),
    ).not.toBeInTheDocument();
  });

  it("navigates to the collection via the breadcrumb", () => {
    renderWithProviders(<EntryView collectionId="c1" entryId="e1" />);

    fireEvent.click(screen.getByRole("button", { name: "Research" }));

    expect(useUIStore.getState().activeCollectionId).toBe("c1");
    expect(useUIStore.getState().activeEntryId).toBeNull();
  });

  it("shows the entry cover when one is set", () => {
    hooks.entryCoverUrl = "https://example.com/field-notes.jpg";
    renderWithProviders(<EntryView collectionId="c1" entryId="e1" />);

    expect(screen.getByRole("img", { name: "Page cover" })).toHaveAttribute(
      "src",
      "https://example.com/field-notes.jpg",
    );
  });

  it("uploads a cover through Add cover", async () => {
    hooks.upload.mutateAsync.mockResolvedValue("https://example.com/new.png");
    hooks.update.mutateAsync.mockResolvedValue(undefined);
    renderWithProviders(<EntryView collectionId="c1" entryId="e1" />);

    fireEvent.click(screen.getByRole("button", { name: "Add cover" }));

    await vi.waitFor(() => {
      expect(hooks.update.mutateAsync).toHaveBeenCalledWith({
        id: "e1",
        cover_url: "https://example.com/new.png",
        cover_position: 50,
      });
    });
  });

  it("removes the entry cover", () => {
    hooks.entryCoverUrl = "https://example.com/field-notes.jpg";
    renderWithProviders(<EntryView collectionId="c1" entryId="e1" />);

    fireEvent.click(screen.getByRole("button", { name: "Remove cover" }));

    expect(hooks.update.mutate).toHaveBeenCalledWith(
      { id: "e1", cover_url: null },
      expect.any(Object),
    );
  });

  it("renders the Doc fonts control when the entry is loaded", () => {
    renderWithProviders(<EntryView collectionId="c1" entryId="e1" />);

    expect(screen.getByRole("button", { name: "Fonts" })).toBeInTheDocument();
  });

  it("omits the Doc fonts control when the entry isn't found", () => {
    renderWithProviders(<EntryView collectionId="c1" entryId="missing" />);

    expect(
      screen.queryByRole("button", { name: "Fonts" }),
    ).not.toBeInTheDocument();
  });

  it("setting a font persists entry overrides", async () => {
    const user = userEvent.setup();
    renderWithProviders(<EntryView collectionId="c1" entryId="e1" />);

    await user.click(screen.getByRole("button", { name: "Fonts" }));
    await user.click(
      await screen.findByRole("button", { name: /system \(new york\)/i }),
    );
    await user.click(
      await screen.findByRole("button", {
        name: /aleothe quick brown fox jumps over the lazy dog/i,
      }),
    );

    expect(hooks.updateFontOverrides.mutate).toHaveBeenCalledWith({
      id: "e1",
      font_overrides: { display: "aleo" },
    });
  });

  it("clearing the last override persists a null font_overrides", async () => {
    hooks.entryFontOverrides = { display: "playfair-display" };
    const user = userEvent.setup();
    renderWithProviders(<EntryView collectionId="c1" entryId="e1" />);

    await user.click(screen.getByRole("button", { name: "Fonts" }));
    await user.click(
      await screen.findByRole("button", { name: /playfair display/i }),
    );
    await user.click(await screen.findByText("Inherit"));

    expect(hooks.updateFontOverrides.mutate).toHaveBeenCalledWith({
      id: "e1",
      font_overrides: null,
    });
  });

  it("renders subtitle, outline, and fonts controls in order when the entry is loaded", () => {
    renderWithProviders(<EntryView collectionId="c1" entryId="e1" />);

    const labels = screen
      .getAllByRole("button")
      .map((button) => button.getAttribute("aria-label"));
    const subtitleIndex = labels.indexOf("Show subtitle");
    const outlineIndex = labels.indexOf("Show outline");
    const fontsIndex = labels.indexOf("Fonts");

    expect(subtitleIndex).toBeGreaterThan(-1);
    expect(outlineIndex).toBeGreaterThan(subtitleIndex);
    expect(fontsIndex).toBeGreaterThan(outlineIndex);
  });

  it("omits the subtitle, outline, and fonts controls when the entry isn't found", () => {
    renderWithProviders(<EntryView collectionId="c1" entryId="missing" />);

    expect(
      screen.queryByRole("button", { name: "Show subtitle" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Show outline" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Fonts" }),
    ).not.toBeInTheDocument();
  });

  it("toggles the subtitle on via the subtitle control", () => {
    renderWithProviders(<EntryView collectionId="c1" entryId="e1" />);

    fireEvent.click(screen.getByRole("button", { name: "Show subtitle" }));

    expect(hooks.update.mutate).toHaveBeenCalledWith({
      id: "e1",
      show_subtitle: true,
    });
  });

  it("shows the subtitle field while enabled and toggles it off", () => {
    hooks.entryShowSubtitle = true;
    renderWithProviders(<EntryView collectionId="c1" entryId="e1" />);

    expect(
      screen.getByRole("textbox", { name: "Document subtitle" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Hide subtitle" }));

    expect(hooks.update.mutate).toHaveBeenCalledWith({
      id: "e1",
      show_subtitle: false,
    });
  });

  it("commits subtitle text via the update mutation", () => {
    hooks.entryShowSubtitle = true;
    renderWithProviders(<EntryView collectionId="c1" entryId="e1" />);

    const subtitle = screen.getByRole("textbox", {
      name: "Document subtitle",
    });
    fireEvent.change(subtitle, { target: { value: "Notes from the field" } });
    fireEvent.blur(subtitle);

    expect(hooks.update.mutate).toHaveBeenCalledWith({
      id: "e1",
      subtitle: "Notes from the field",
    });
  });

  it("commits an empty subtitle as null", () => {
    hooks.entryShowSubtitle = true;
    hooks.entrySubtitle = "Notes from the field";
    renderWithProviders(<EntryView collectionId="c1" entryId="e1" />);

    const subtitle = screen.getByRole("textbox", {
      name: "Document subtitle",
    });
    fireEvent.change(subtitle, { target: { value: "" } });
    fireEvent.blur(subtitle);

    expect(hooks.update.mutate).toHaveBeenCalledWith({
      id: "e1",
      subtitle: null,
    });
  });

  it("toggles the outline via the outline control", () => {
    renderWithProviders(<EntryView collectionId="c1" entryId="e1" />);

    fireEvent.click(screen.getByRole("button", { name: "Show outline" }));

    expect(hooks.update.mutate).toHaveBeenCalledWith({
      id: "e1",
      show_outline: true,
    });
  });

  it("reserves the outline gutter and lists headings the editor reports", () => {
    hooks.entryShowOutline = true;
    renderWithProviders(<EntryView collectionId="c1" entryId="e1" />);

    expect(screen.queryByText("On this page")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Emit headings" }));

    expect(screen.getByText("On this page")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Field log" }),
    ).toBeInTheDocument();
  });
});
