import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { DocumentMeta } from "@/data/documents";
import { makeBook, makeDocument } from "@/test/fixtures";
import { renderWithProviders } from "@/test/render-with-query";

import { DocumentView } from "./document-view";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// DocumentView's mutation hooks read the session via useAuth; a lightweight stub
// avoids standing up the real (Tauri/Supabase-backed) AuthProvider in a test
// that never triggers a mutation.
vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ session: null }),
}));

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
