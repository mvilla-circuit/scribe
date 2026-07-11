import { waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import { server } from "@/test/msw/server";
import { renderHookWithQuery } from "@/test/render-with-query";

import {
  coverObjectPathFromPublicUrl,
  deleteCoverObject,
  useUploadCover,
} from "./cover-upload";

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ session: { user: { id: "user-1" } } }),
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

const COVERS_URL = "http://supabase.test/storage/v1/object/covers";

describe("coverObjectPathFromPublicUrl", () => {
  it("extracts the object path from a covers public URL", () => {
    expect(
      coverObjectPathFromPublicUrl(
        "http://supabase.test/storage/v1/object/public/covers/user-1/abc.png",
      ),
    ).toBe("user-1/abc.png");
  });

  it("returns null for unrelated URLs", () => {
    expect(
      coverObjectPathFromPublicUrl("https://cdn.example/cover.png"),
    ).toBeNull();
  });
});

describe("deleteCoverObject", () => {
  it("no-ops for non-covers URLs", async () => {
    await expect(
      deleteCoverObject("https://cdn.example/cover.png"),
    ).resolves.toBeUndefined();
  });

  it("requests deletion for a covers public URL", async () => {
    let sawDelete = false;
    server.use(
      http.delete(COVERS_URL, () => {
        sawDelete = true;
        return HttpResponse.json([{}]);
      }),
      http.delete(`${COVERS_URL}/:path*`, () => {
        sawDelete = true;
        return HttpResponse.json([{}]);
      }),
    );

    await deleteCoverObject(
      "http://supabase.test/storage/v1/object/public/covers/user-1/abc.png",
    );

    expect(sawDelete).toBe(true);
  });
});

describe("useUploadCover", () => {
  it("rejects an unsupported image type", async () => {
    const { result } = renderHookWithQuery(() => useUploadCover());
    const file = new File(["cover"], "cover.svg", { type: "image/svg+xml" });

    result.current.mutate(file);

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(result.current.error).toEqual(new Error("Unsupported image type"));
  });

  it("rejects a file larger than 10 MB", async () => {
    const { result } = renderHookWithQuery(() => useUploadCover());
    const file = new File([new Uint8Array(10 * 1024 * 1024 + 1)], "cover.png", {
      type: "image/png",
    });

    result.current.mutate(file);

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(result.current.error).toEqual(
      new Error("Image must be under 10 MB"),
    );
  });

  it("uploads a supported cover and returns its public URL", async () => {
    let uploadUrl = "";
    server.use(
      http.post(`${COVERS_URL}/:userId/:filename`, ({ request }) => {
        uploadUrl = request.url;
        return HttpResponse.json({ Key: "user-1/cover.png" });
      }),
    );

    const { result } = renderHookWithQuery(() => useUploadCover());
    const file = new File(["cover"], "cover.png", { type: "image/png" });

    result.current.mutate(file);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(uploadUrl).toMatch(
      /^http:\/\/supabase\.test\/storage\/v1\/object\/covers\/user-1\/[0-9a-f-]+\.png$/,
    );
    expect(result.current.data).toMatch(
      /^http:\/\/supabase\.test\/storage\/v1\/object\/public\/covers\/user-1\/[0-9a-f-]+\.png$/,
    );
  });
});
