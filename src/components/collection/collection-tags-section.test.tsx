import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { taggablesKey, tagsKey } from "@/data/query-keys";
import { makeTag, makeTaggable } from "@/test/fixtures";
import { server } from "@/test/msw/server";
import {
  createTestQueryClient,
  renderWithProviders,
} from "@/test/render-with-query";

import { CollectionTagsSection } from "./collection-tags-section";

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ session: { user: { id: "user-1" } } }),
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

// Radix dropdowns probe pointer-capture / scroll focused items into view;
// jsdom implements neither, so polyfill them for the color/remove menu to
// open (matches the pattern in row-action-menu.test.tsx).
beforeEach(() => {
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();
});

function seed() {
  const client = createTestQueryClient();
  client.setQueryData(tagsKey, [makeTag({ id: "tag-1", name: "Fantasy" })]);
  client.setQueryData(taggablesKey("collection"), [
    makeTaggable({ id: "tg-1", tag_id: "tag-1", target_id: "c1" }),
  ]);
  return client;
}

describe("CollectionTagsSection", () => {
  it("shows the tags already assigned to this collection", () => {
    renderWithProviders(<CollectionTagsSection collectionId="c1" />, {
      client: seed(),
    });

    expect(screen.getByRole("button", { name: "Fantasy" })).toBeInTheDocument();
  });

  it("assigns a new tag through the mutation", async () => {
    server.use(
      http.post(
        "http://supabase.test/rest/v1/tags",
        () => new HttpResponse(null, { status: 201 }),
      ),
      http.post(
        "http://supabase.test/rest/v1/taggables",
        () => new HttpResponse(null, { status: 201 }),
      ),
    );
    const user = userEvent.setup();
    const client = createTestQueryClient();
    client.setQueryData(tagsKey, []);
    client.setQueryData(taggablesKey("collection"), []);
    renderWithProviders(<CollectionTagsSection collectionId="c1" />, {
      client,
    });

    await user.click(screen.getByRole("button", { name: "Add tag" }));
    await user.type(screen.getByLabelText("New tag name"), "Draft");
    await user.keyboard("{Enter}");

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Draft" })).toBeInTheDocument();
    });
  });

  it("unassigns a tag through the mutation", async () => {
    server.use(
      http.delete(
        "http://supabase.test/rest/v1/taggables",
        () => new HttpResponse(null, { status: 204 }),
      ),
    );
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    renderWithProviders(<CollectionTagsSection collectionId="c1" />, {
      client: seed(),
    });

    await user.click(screen.getByRole("button", { name: "Fantasy" }));
    await user.click(await screen.findByRole("menuitem", { name: "Remove" }));

    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: "Fantasy" }),
      ).not.toBeInTheDocument();
    });
  });

  it("recolors a tag through the mutation", async () => {
    server.use(
      http.patch(
        "http://supabase.test/rest/v1/tags",
        () => new HttpResponse(null, { status: 204 }),
      ),
    );
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const client = seed();
    renderWithProviders(<CollectionTagsSection collectionId="c1" />, {
      client,
    });

    await user.click(screen.getByRole("button", { name: "Fantasy" }));
    await user.click(
      await screen.findByRole("button", { name: "moss for Fantasy" }),
    );

    await waitFor(() => {
      expect(
        client.getQueryData<{ id: string; color: string | null }[]>(tagsKey),
      ).toEqual([expect.objectContaining({ id: "tag-1", color: "moss" })]);
    });
  });
});
