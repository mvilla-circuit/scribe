import { fireEvent, screen } from "@testing-library/react";
import { type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { makeBook } from "@/test/fixtures";
import { renderWithProviders } from "@/test/render-with-query";

import { TitlePage } from "./title-page";

const hooks = vi.hoisted(() => ({
  rename: { mutate: vi.fn() },
  update: { mutate: vi.fn(), mutateAsync: vi.fn() },
  upload: { mutateAsync: vi.fn() },
  createDocument: { mutate: vi.fn() },
  bookCoverUrl: null as string | null,
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
  useCollections: () => ({ data: [] }),
}));

vi.mock("@/fonts/use-cascaded-fonts", () => ({
  useCascadedFonts: () => ({
    fontVars: {},
    overrides: {},
    inherited: {},
    handlers: { setFont: vi.fn(), clearFont: vi.fn(), clearAll: vi.fn() },
  }),
}));

vi.mock("./masthead", () => ({
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
