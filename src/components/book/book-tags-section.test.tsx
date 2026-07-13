import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { allTaggablesKey, taggablesKey, tagsKey } from "@/data/query-keys";
import { makeTag, makeTaggable } from "@/test/fixtures";
import { server } from "@/test/msw/server";
import {
  createTestQueryClient,
  renderWithProviders,
} from "@/test/render-with-query";

import { BookTagsSection } from "./book-tags-section";

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ session: { user: { id: "user-1" } } }),
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

beforeEach(() => {
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();
});

function seed() {
  const client = createTestQueryClient();
  const bookTaggables = [
    makeTaggable({
      id: "tg-1",
      tag_id: "tag-1",
      target_type: "book",
      target_id: "b1",
    }),
  ];
  client.setQueryData(tagsKey, [makeTag({ id: "tag-1", name: "Fantasy" })]);
  client.setQueryData(taggablesKey("book"), bookTaggables);
  client.setQueryData(allTaggablesKey, bookTaggables);
  return client;
}

describe("BookTagsSection", () => {
  it("shows the tags already assigned to this book", () => {
    renderWithProviders(<BookTagsSection bookId="b1" />, {
      client: seed(),
    });

    expect(screen.getByLabelText("Book tags")).toBeInTheDocument();
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
    client.setQueryData(taggablesKey("book"), []);
    client.setQueryData(allTaggablesKey, []);
    renderWithProviders(<BookTagsSection bookId="b1" />, { client });

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
    renderWithProviders(<BookTagsSection bookId="b1" />, {
      client: seed(),
    });

    await user.hover(screen.getByRole("button", { name: "Fantasy" }));
    await user.click(screen.getByRole("button", { name: "Remove Fantasy" }));

    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: "Fantasy" }),
      ).not.toBeInTheDocument();
    });
  });
});
