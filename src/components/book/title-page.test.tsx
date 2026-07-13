import { fireEvent, screen } from "@testing-library/react";
import { type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { allTaggablesKey, taggablesKey, tagsKey } from "@/data/query-keys";
import { useUIStore } from "@/store/ui";
import {
  makeBook,
  makeCollection,
  makeTag,
  makeTaggable,
} from "@/test/fixtures";
import {
  createTestQueryClient,
  renderWithProviders,
} from "@/test/render-with-query";

import { TitlePage } from "./title-page";

const hooks = vi.hoisted(() => ({
  rename: { mutate: vi.fn() },
  update: { mutate: vi.fn(), mutateAsync: vi.fn() },
  upload: { mutateAsync: vi.fn() },
  createDocument: { mutate: vi.fn() },
  bookCoverUrl: null as string | null,
  collections: [] as ReturnType<typeof makeCollection>[],
}));

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ session: { user: { id: "user-1" } } }),
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

vi.mock("@/data/books", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/data/books")>();
  return {
    ...actual,
    useRenameBook: () => hooks.rename,
    useUpdateBook: () => hooks.update,
  };
});

vi.mock("@/data/documents", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/data/documents")>();
  return {
    ...actual,
    useCreateDocument: () => hooks.createDocument,
  };
});

vi.mock("@/data/collections", () => ({
  useCollections: () => ({ data: hooks.collections }),
}));

vi.mock("@/fonts/use-cascaded-fonts", () => ({
  useCascadedFonts: () => ({
    fontVars: {},
    overrides: {},
    inherited: {},
    handlers: { setFont: vi.fn(), clearFont: vi.fn(), clearAll: vi.fn() },
  }),
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

vi.mock("./table-of-contents", () => ({
  TableOfContents: () => <div data-testid="toc" />,
}));

vi.mock("./nav-history-controls", () => ({
  NavHistoryControls: () => null,
}));

vi.mock("./font-control", () => ({
  FontControl: () => null,
}));

beforeEach(() => {
  vi.clearAllMocks();
  hooks.bookCoverUrl = null;
  hooks.collections = [];
  useUIStore.setState({ activeCollectionId: null });
});

describe("TitlePage covers", () => {
  it("shows Add cover when the book has no cover", () => {
    renderWithProviders(
      <TitlePage
        book={makeBook({ cover_url: null })}
        documents={[]}
        loading={false}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Add cover" }),
    ).toBeInTheDocument();
  });

  it("uploads a cover through Add cover", async () => {
    hooks.upload.mutateAsync.mockResolvedValue("https://example.com/book.png");
    hooks.update.mutateAsync.mockResolvedValue(undefined);

    renderWithProviders(
      <TitlePage
        book={makeBook({ cover_url: null })}
        documents={[]}
        loading={false}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Add cover" }));

    await vi.waitFor(() => {
      expect(hooks.update.mutateAsync).toHaveBeenCalledWith({
        id: "book-1",
        cover_url: "https://example.com/book.png",
      });
    });
  });

  it("removes the book cover", () => {
    renderWithProviders(
      <TitlePage
        book={makeBook({ cover_url: "https://example.com/book.jpg" })}
        documents={[]}
        loading={false}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Remove cover" }));

    expect(hooks.update.mutate).toHaveBeenCalledWith(
      { id: "book-1", cover_url: null },
      expect.any(Object),
    );
  });
});

describe("TitlePage breadcrumb", () => {
  it("navigates to the parent collection when its crumb is clicked", () => {
    hooks.collections = [makeCollection({ id: "c1", name: "Field Notes" })];

    renderWithProviders(
      <TitlePage
        book={makeBook({ collection_id: "c1" })}
        documents={[]}
        loading={false}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Field Notes" }));

    expect(useUIStore.getState().activeCollectionId).toBe("c1");
  });
});

describe("TitlePage tags", () => {
  it("renders book tags under the title", () => {
    const client = createTestQueryClient();
    client.setQueryData(tagsKey, [makeTag({ id: "tag-1", name: "Epic" })]);
    client.setQueryData(taggablesKey("book"), [
      makeTaggable({
        id: "tg-1",
        tag_id: "tag-1",
        target_type: "book",
        target_id: "book-1",
      }),
    ]);
    client.setQueryData(allTaggablesKey, [
      makeTaggable({
        id: "tg-1",
        tag_id: "tag-1",
        target_type: "book",
        target_id: "book-1",
      }),
    ]);

    renderWithProviders(
      <TitlePage
        book={makeBook({ id: "book-1", title: "First Light" })}
        documents={[]}
        loading={false}
      />,
      { client },
    );

    expect(screen.getByLabelText("Book tags")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Epic" })).toBeInTheDocument();
    expect(
      screen
        .getByLabelText("Book title")
        .compareDocumentPosition(screen.getByLabelText("Book tags")) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});
