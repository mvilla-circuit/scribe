import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchLinkMetadata, parseMetadata, pathLabel } from "./link-preview";

const { fetchMock } = vi.hoisted(() => ({ fetchMock: vi.fn() }));

vi.mock("@tauri-apps/plugin-http", () => ({ fetch: fetchMock }));

function htmlResponse(html: string, ok = true) {
  return {
    ok,
    text: () => Promise.resolve(html),
    json: () => Promise.reject(new Error("not json")),
  };
}

function jsonResponse(data: unknown, ok = true) {
  return {
    ok,
    text: () => Promise.resolve(""),
    json: () => Promise.resolve(data),
  };
}

afterEach(() => {
  fetchMock.mockReset();
});

describe("parseMetadata", () => {
  it("falls back through the secondary image candidates", () => {
    const html = `
      <html><head>
        <meta property="og:image:secure_url" content="https://cdn.example.com/secure.jpg" />
      </head></html>`;
    expect(parseMetadata(html, "https://example.com").image).toBe(
      "https://cdn.example.com/secure.jpg",
    );
  });

  it("reads twitter:image:src and link[rel=image_src]", () => {
    const twitter = `<meta name="twitter:image:src" content="https://example.com/t.png" />`;
    expect(
      parseMetadata(`<head>${twitter}</head>`, "https://example.com").image,
    ).toBe("https://example.com/t.png");

    const linkRel = `<link rel="image_src" href="/hero.png" />`;
    expect(
      parseMetadata(`<head>${linkRel}</head>`, "https://example.com").image,
    ).toBe("https://example.com/hero.png");
  });
});

describe("pathLabel", () => {
  it("returns the cleaned path for a deep link", () => {
    expect(pathLabel("https://github.com/owner/repo")).toBe("owner/repo");
  });

  it("decodes percent-escapes and trims slashes", () => {
    expect(pathLabel("https://example.com/a%20b/")).toBe("a b");
  });

  it("returns null for a bare domain", () => {
    expect(pathLabel("https://github.com")).toBeNull();
    expect(pathLabel("https://github.com/")).toBeNull();
  });
});

describe("fetchLinkMetadata", () => {
  it("uses the YouTube oEmbed endpoint when the page HTML lacks OG tags", async () => {
    fetchMock.mockImplementation((input: unknown) => {
      const u = String(input);
      if (u.includes("oembed")) {
        return Promise.resolve(
          jsonResponse({
            title: "Rick Astley - Never Gonna Give You Up",
            thumbnail_url: "https://i.ytimg.com/vi/LGEB1hpxeOs/hqdefault.jpg",
            provider_name: "YouTube",
          }),
        );
      }
      // The watch page returns a JS shell with no usable OG metadata.
      return Promise.resolve(
        htmlResponse("<html><head><title></title></head></html>"),
      );
    });

    const meta = await fetchLinkMetadata(
      "https://www.youtube.com/watch?v=LGEB1hpxeOs",
    );

    expect(meta.title).toBe("Rick Astley - Never Gonna Give You Up");
    expect(meta.image).toBe("https://i.ytimg.com/vi/LGEB1hpxeOs/hqdefault.jpg");
    expect(meta.siteName).toBe("YouTube");
    const oembedCalls = fetchMock.mock.calls.filter(([u]) =>
      String(u).includes("oembed"),
    );
    expect(oembedCalls).toHaveLength(1);
  });

  it("does not call oEmbed for an ordinary site that yields OG metadata", async () => {
    fetchMock.mockResolvedValue(
      htmlResponse(`
        <head>
          <meta property="og:title" content="Example" />
          <meta property="og:image" content="https://example.com/og.png" />
        </head>`),
    );

    const meta = await fetchLinkMetadata("https://example.com/post");

    expect(meta.title).toBe("Example");
    expect(meta.image).toBe("https://example.com/og.png");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
