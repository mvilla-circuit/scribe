import { waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import { makeDocument } from "@/test/fixtures";
import { server } from "@/test/msw/server";
import {
  createTestQueryClient,
  renderHookWithQuery,
} from "@/test/render-with-query";

import {
  buildDocumentDuplicate,
  collectDocumentSubtree,
} from "./document-duplicate";
import {
  docFontOverrides,
  needsTitlePage,
  useDeleteDocument,
  useDocumentContent,
  useDocuments,
  useEnsureTitlePage,
  useMoveDocument,
  useUpdateDocumentContent,
} from "./documents";
import { documentContentKey, documentsKey, pageIndexKey } from "./query-keys";

// The data hooks read the session for the user id; stub auth so we don't pull
// auth.tsx (and its Tauri plugin imports) into the test runtime.
vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ session: { user: { id: "user-1" } } }),
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

const DOCUMENTS_URL = "http://supabase.test/rest/v1/documents";

describe("docFontOverrides", () => {
  it("returns the stored map when it is a plain object", () => {
    const doc = makeDocument({ font_overrides: { display: "lora" } });
    expect(docFontOverrides(doc)).toEqual({ display: "lora" });
  });

  it("falls back to an empty map for null, arrays, and non-objects", () => {
    expect(docFontOverrides(makeDocument({ font_overrides: null }))).toEqual(
      {},
    );
    expect(
      docFontOverrides(makeDocument({ font_overrides: ["lora"] })),
    ).toEqual({});
  });
});

describe("collectDocumentSubtree", () => {
  it("collects a page plus every descendant and ignores unrelated pages", () => {
    const docs = [
      makeDocument({ id: "root", parent_document_id: null }),
      makeDocument({ id: "child", parent_document_id: "root" }),
      makeDocument({ id: "grandchild", parent_document_id: "child" }),
      makeDocument({ id: "other", parent_document_id: null }),
    ];

    const subtree = collectDocumentSubtree(docs, "root");

    expect(subtree).toEqual(new Set(["root", "child", "grandchild"]));
    expect(subtree.has("other")).toBe(false);
  });
});

describe("buildDocumentDuplicate", () => {
  it("returns null when the source id is not found", () => {
    expect(buildDocumentDuplicate([makeDocument({ id: "a" })], "missing")).toBe(
      null,
    );
  });

  it("returns null when the source is a title page", () => {
    const docs = [makeDocument({ id: "title", is_title_page: true })];
    expect(buildDocumentDuplicate(docs, "title")).toBe(null);
  });

  it("deep-copies a nested subtree with fresh ids and re-parents descendants", () => {
    const docs = [
      makeDocument({ id: "root", parent_document_id: null, title: "Root" }),
      makeDocument({ id: "child", parent_document_id: "root", title: "Child" }),
      makeDocument({
        id: "grandchild",
        parent_document_id: "child",
        title: "Grandchild",
      }),
    ];

    const result = buildDocumentDuplicate(docs, "root");

    expect(result).not.toBeNull();
    const { rows, rootId } = result!;
    expect(rows).toHaveLength(3);

    // No copied row reuses an original id, and user_id is left blank for the
    // mutation to stamp.
    const originalIds = new Set(["root", "child", "grandchild"]);
    for (const row of rows) {
      expect(originalIds.has(row.id)).toBe(false);
      expect(row.user_id).toBe("");
    }

    const root = rows.find((r) => r.id === rootId)!;
    const child = rows.find((r) => r.parent_document_id === rootId)!;
    const grandchild = rows.find((r) => r.parent_document_id === child.id)!;

    // The root keeps its original (null) parent; descendants are re-parented
    // onto the new ids.
    expect(root.parent_document_id).toBe(null);
    expect(root.title).toBe("Root copy");
    expect(child.title).toBe("Child");
    expect(grandchild.title).toBe("Grandchild");
  });

  it("renames only the root and positions the copy after the source", () => {
    const docs = [
      makeDocument({ id: "a", parent_document_id: null, position: 1000 }),
      makeDocument({ id: "b", parent_document_id: null, position: 2000 }),
    ];

    const { rows, rootId } = buildDocumentDuplicate(docs, "a")!;
    const root = rows.find((r) => r.id === rootId)!;

    // Midpoint between the source (1000) and its next sibling (2000).
    expect(root.position).toBe(1500);
  });

  it("falls back to 'Untitled copy' when the source title is empty", () => {
    const docs = [makeDocument({ id: "a", title: "" })];
    const { rows, rootId } = buildDocumentDuplicate(docs, "a")!;
    expect(rows.find((r) => r.id === rootId)!.title).toBe("Untitled copy");
  });
});

describe("needsTitlePage", () => {
  it("is true when no page is flagged as the title page", () => {
    expect(needsTitlePage([])).toBe(true);
    expect(
      needsTitlePage([makeDocument({ id: "a", is_title_page: false })]),
    ).toBe(true);
  });

  it("is false once a title page exists", () => {
    expect(
      needsTitlePage([
        makeDocument({ id: "a", is_title_page: false }),
        makeDocument({ id: "title", is_title_page: true }),
      ]),
    ).toBe(false);
  });
});

describe("useDocuments", () => {
  it("fetches one book's pages sorted by position", async () => {
    server.use(
      http.get(DOCUMENTS_URL, () =>
        HttpResponse.json([
          makeDocument({ id: "d2", position: 2048 }),
          makeDocument({ id: "d1", position: 1024 }),
        ]),
      ),
    );

    const { result } = renderHookWithQuery(() => useDocuments("book-1"));

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.data?.map((d) => d.id)).toEqual(["d1", "d2"]);
  });

  it("stays disabled (and does not fetch) when no book is selected", () => {
    const { result } = renderHookWithQuery(() => useDocuments(null));
    // A disabled query never enters a fetch: it stays pending with an idle
    // fetch status rather than loading.
    expect(result.current.fetchStatus).toBe("idle");
    expect(result.current.isPending).toBe(true);
  });
});

describe("useDocumentContent", () => {
  it("fetches a single page's editor body", async () => {
    server.use(
      http.get(DOCUMENTS_URL, () =>
        HttpResponse.json({ content: { type: "doc" } }),
      ),
    );

    const { result } = renderHookWithQuery(() => useDocumentContent("d1"));

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.data).toEqual({ type: "doc" });
  });

  it("stays disabled (and does not fetch) when no document is selected", () => {
    const { result } = renderHookWithQuery(() => useDocumentContent(null));
    expect(result.current.fetchStatus).toBe("idle");
  });
});

describe("useUpdateDocumentContent", () => {
  it("patches only the content cache, leaving the metadata list and page index untouched", async () => {
    server.use(
      http.patch(DOCUMENTS_URL, () => new HttpResponse(null, { status: 204 })),
    );

    const client = createTestQueryClient();
    const invalidateSpy = vi.spyOn(client, "invalidateQueries");
    client.setQueryData(documentContentKey("d1"), { type: "doc", stale: true });

    const { result } = renderHookWithQuery(() => useUpdateDocumentContent(), {
      client,
    });
    const next = { type: "doc", content: [{ type: "paragraph" }] };
    result.current.mutate({ id: "d1", content: next });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // The optimistic write lands in the dedicated content entry...
    expect(client.getQueryData(documentContentKey("d1"))).toEqual(next);
    // ...and the structural list / cross-book page index are never invalidated,
    // so a keystroke-batch never triggers a full refetch or outline rebuild.
    expect(invalidateSpy).not.toHaveBeenCalledWith({
      queryKey: documentsKey("book-1"),
    });
    expect(invalidateSpy).not.toHaveBeenCalledWith({ queryKey: pageIndexKey });
  });

  it("rolls the content cache back when the server rejects the save", async () => {
    server.use(
      http.patch(DOCUMENTS_URL, () => new HttpResponse(null, { status: 500 })),
    );

    const client = createTestQueryClient();
    const previous = { type: "doc", content: [] };
    client.setQueryData(documentContentKey("d1"), previous);

    const { result } = renderHookWithQuery(() => useUpdateDocumentContent(), {
      client,
    });
    result.current.mutate({ id: "d1", content: { type: "doc", content: [] } });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(client.getQueryData(documentContentKey("d1"))).toEqual(previous);
  });
});

describe("useDeleteDocument", () => {
  it("optimistically removes the page and all of its descendants", async () => {
    server.use(
      http.delete(DOCUMENTS_URL, () => new HttpResponse(null, { status: 204 })),
    );

    const client = createTestQueryClient();
    client.setQueryData(documentsKey("book-1"), [
      makeDocument({ id: "root", parent_document_id: null }),
      makeDocument({ id: "child", parent_document_id: "root" }),
      makeDocument({ id: "keep", parent_document_id: null }),
    ]);

    const { result } = renderHookWithQuery(() => useDeleteDocument("book-1"), {
      client,
    });
    result.current.mutate({ id: "root" });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(
      client
        .getQueryData<{ id: string }[]>(documentsKey("book-1"))
        ?.map((d) => d.id),
    ).toEqual(["keep"]);
  });
});

describe("useMoveDocument", () => {
  it("optimistically reparents and repositions a page, and invalidates the page index", async () => {
    server.use(
      http.patch(DOCUMENTS_URL, () => new HttpResponse(null, { status: 204 })),
    );

    const client = createTestQueryClient();
    const invalidateSpy = vi.spyOn(client, "invalidateQueries");
    client.setQueryData(documentsKey("book-1"), [
      makeDocument({ id: "d1", parent_document_id: null, position: 1024 }),
    ]);

    const { result } = renderHookWithQuery(() => useMoveDocument("book-1"), {
      client,
    });
    result.current.mutate({
      id: "d1",
      parent_document_id: "parent",
      position: 4096,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const moved = client.getQueryData<
      { parent_document_id: string | null; position: number }[]
    >(documentsKey("book-1"))?.[0];
    expect(moved?.parent_document_id).toBe("parent");
    expect(moved?.position).toBe(4096);

    // onSettled keeps the cross-book page index fresh.
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: pageIndexKey });
  });
});

describe("useEnsureTitlePage", () => {
  it("retries creating the Title Page after a transient insert failure", async () => {
    let inserts = 0;
    server.use(
      http.get(DOCUMENTS_URL, () => HttpResponse.json([])),
      http.post(DOCUMENTS_URL, () => {
        inserts += 1;
        // First attempt fails (transient); the rollback removes the optimistic
        // Title Page, so a correct implementation must retry on the next render.
        return inserts === 1
          ? new HttpResponse(null, { status: 500 })
          : new HttpResponse(null, { status: 201 });
      }),
    );

    renderHookWithQuery(() => {
      useEnsureTitlePage("book-1");
    });

    await waitFor(() => {
      expect(inserts).toBe(2);
    });
  });
});
