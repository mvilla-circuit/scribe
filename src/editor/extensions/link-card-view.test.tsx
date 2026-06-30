import { render, screen, waitFor } from "@testing-library/react";
import type { NodeViewProps } from "@tiptap/react";
import { StrictMode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { LinkMetadata } from "@/editor/link-preview";

import { LinkCardView } from "./link-card-view";

const { fetchLinkMetadata } = vi.hoisted(() => ({
  fetchLinkMetadata: vi.fn(),
}));

vi.mock("@/editor/link-preview", async (importActual) => {
  const actual = await importActual<typeof import("@/editor/link-preview")>();
  return { ...actual, fetchLinkMetadata };
});

vi.mock("@tauri-apps/plugin-opener", () => ({ openUrl: vi.fn() }));
vi.mock("sonner", () => ({ toast: { success: vi.fn() } }));

const META: LinkMetadata = {
  title: "Example Domain",
  description: "An illustrative example.",
  siteName: "example.com",
  favicon: null,
  image: null,
};

function renderCard(attrs: Record<string, unknown>) {
  const updateAttributes = vi.fn();
  const fakeNode = { attrs };
  const fakeEditor = { isEditable: false };
  // The card view only reads node.attrs and editor.isEditable; the remaining
  // NodeView props are unused, so a partial stub keeps the harness focused on
  // the metadata-fetch behavior under test.
  const props: Partial<NodeViewProps> = {
    node: fakeNode as NodeViewProps["node"],
    updateAttributes,
    editor: fakeEditor as NodeViewProps["editor"],
    deleteNode: vi.fn(),
  };
  const { container } = render(
    <StrictMode>
      <LinkCardView {...(props as NodeViewProps)} />
    </StrictMode>,
  );
  return { updateAttributes, container };
}

describe("LinkCardView", () => {
  afterEach(() => {
    fetchLinkMetadata.mockReset();
  });

  it("writes fetched metadata back even when the effect double-mounts (StrictMode)", async () => {
    fetchLinkMetadata.mockResolvedValue(META);
    const { updateAttributes } = renderCard({
      url: "https://example.com",
      status: "loading",
    });

    await waitFor(() => {
      expect(updateAttributes).toHaveBeenCalledWith(
        expect.objectContaining({ ...META, status: "ready" }),
      );
    });
    // StrictMode double-invokes the mount effect; the URL must still be fetched
    // exactly once, not skipped entirely.
    expect(fetchLinkMetadata).toHaveBeenCalledTimes(1);
  });

  it("renders a full-bleed preview image when one was extracted", () => {
    const { container } = renderCard({
      url: "https://example.com/post",
      status: "ready",
      title: "Example",
      image: "https://example.com/og.png",
    });

    // The preview image is decorative (empty alt, the title carries meaning), so
    // it has no queryable role — assert the styled media element structurally.
    // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access -- decorative <img alt=""> has no accessible role to target semantically
    const img = container.querySelector(".scribe-linkcard-image");
    expect(img).toHaveAttribute("src", "https://example.com/og.png");
    // No monogram fallback tile when a real image is shown.
    expect(screen.queryByText("E")).not.toBeInTheDocument();
  });

  it("renders a tinted fallback tile (monogram) when there is no image", () => {
    renderCard({
      url: "https://news.ycombinator.com",
      status: "ready",
      title: "Hacker News",
      image: null,
    });

    expect(screen.getByText("N")).toBeInTheDocument();
  });

  it("treats an image-only result (no title) as ready", async () => {
    fetchLinkMetadata.mockResolvedValue({
      ...META,
      title: null,
      description: null,
      image: "https://example.com/og.png",
    });
    const { updateAttributes } = renderCard({
      url: "https://example.com",
      status: "loading",
    });

    await waitFor(() => {
      expect(updateAttributes).toHaveBeenCalledWith(
        expect.objectContaining({ status: "ready" }),
      );
    });
  });

  it("retries an errored card on mount so stale failures self-heal", async () => {
    fetchLinkMetadata.mockResolvedValue(META);
    const { updateAttributes } = renderCard({
      url: "https://www.youtube.com/watch?v=abc",
      status: "error",
    });

    await waitFor(() => {
      expect(updateAttributes).toHaveBeenCalledWith(
        expect.objectContaining({ ...META, status: "ready" }),
      );
    });
    expect(fetchLinkMetadata).toHaveBeenCalledTimes(1);
  });

  it("titles an unfetchable link with its URL path instead of a bare host", () => {
    fetchLinkMetadata.mockResolvedValue({
      title: null,
      description: null,
      siteName: "github.com",
      favicon: null,
      image: null,
    });
    renderCard({
      url: "https://github.com/mvilla-circuit/scribe",
      status: "error",
      title: null,
      image: null,
    });

    expect(screen.getByText("mvilla-circuit/scribe")).toBeInTheDocument();
  });

  it("marks the card as errored when nothing usable is found", async () => {
    fetchLinkMetadata.mockResolvedValue({
      ...META,
      title: null,
      description: null,
      image: null,
    });
    const { updateAttributes } = renderCard({
      url: "https://example.com",
      status: "loading",
    });

    await waitFor(() => {
      expect(updateAttributes).toHaveBeenCalledWith(
        expect.objectContaining({ status: "error" }),
      );
    });
  });
});
