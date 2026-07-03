import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { documentsKey } from "@/data/query-keys";
import { useUIStore } from "@/store/ui";
import { makeBook, makeDocument } from "@/test/fixtures";
import {
  createTestQueryClient,
  renderWithProviders,
} from "@/test/render-with-query";

import { OutlinePanel } from "./outline-panel";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// OutlinePanel's mutation hooks read the session via useAuth; a lightweight stub
// avoids standing up the real (Tauri/Supabase-backed) AuthProvider in a test
// that never triggers a mutation.
vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ session: null }),
}));

const BOOK = makeBook({ id: "b1", title: "Genesis" });

// Radix menus probe pointer-capture and scroll their focused item into view;
// jsdom implements neither, so polyfill them for the dropdown to open.
beforeEach(() => {
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();
  useUIStore.setState({ activeBookId: "b1", activeDocId: null });
});

function seedClient() {
  const client = createTestQueryClient();
  client.setQueryData(documentsKey("b1"), [
    makeDocument({ id: "tp", is_title_page: true, position: 0 }),
    makeDocument({ id: "d1", title: "Chapter 1", position: 1024 }),
  ]);
  return client;
}

describe("OutlinePanel copy link", () => {
  it("copies the page link from the row menu", async () => {
    // userEvent.setup() installs its own clipboard stub, so override it after.
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    renderWithProviders(<OutlinePanel book={BOOK} />, { client: seedClient() });

    await user.click(screen.getByRole("button", { name: "More actions" }));
    await user.click(
      await screen.findByRole("menuitem", { name: "Copy link" }),
    );

    expect(writeText).toHaveBeenCalledWith("scribe://page/d1");
  });
});
