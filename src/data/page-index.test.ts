import { waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { server } from "@/test/msw/server";
import { renderHookWithQuery } from "@/test/render-with-query";

import { usePageIndex } from "./page-index";

const DOCUMENTS_URL = "http://supabase.test/rest/v1/documents";

describe("usePageIndex", () => {
  it("returns the cross-book page index entries", async () => {
    server.use(
      http.get(DOCUMENTS_URL, () =>
        HttpResponse.json([
          {
            id: "d1",
            title: "Page one",
            icon: null,
            book_id: "b1",
            parent_document_id: null,
            is_title_page: false,
          },
        ]),
      ),
    );

    const { result } = renderHookWithQuery(() => usePageIndex());

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.data?.map((p) => p.id)).toEqual(["d1"]);
  });

  it("surfaces an error when the request fails", async () => {
    server.use(
      http.get(DOCUMENTS_URL, () => new HttpResponse(null, { status: 500 })),
    );

    const { result } = renderHookWithQuery(() => usePageIndex());

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});
