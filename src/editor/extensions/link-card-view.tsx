import { openUrl } from "@tauri-apps/plugin-opener";
import { type NodeViewProps, NodeViewWrapper } from "@tiptap/react";
import { type CSSProperties, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { BlockControls } from "@/editor/block-controls";
import { CardSurface } from "@/editor/card-surface";
import { EditorIconButton } from "@/editor/editor-icon-button";
import {
  CopyIcon,
  ExternalLinkIcon,
  LinkIcon,
  RefreshIcon,
  TrashIcon,
} from "@/editor/icons";
import { fetchLinkMetadata, hostLabel, pathLabel } from "@/editor/link-preview";

import { keepAsLink } from "./link-card-commands";

type Status = "loading" | "ready" | "error";

// A stable hue (0–360) derived from the hostname, so the no-image fallback tile
// gets a calm, domain-consistent tint instead of looking blank.
function hueFromHost(url: string): number {
  const host = hostLabel(url);
  let hash = 0;
  for (const ch of host) hash = (hash * 31 + ch.charCodeAt(0)) % 360;
  return hash;
}

// The full-bleed media rail: a preview image when one was extracted, otherwise a
// calm domain-tinted tile (favicon, or a monogram) so a card is never blank. A
// broken image swaps to the tile; remounting via `key={image}` resets that.
function LinkCardMedia({
  url,
  image,
  favicon,
}: {
  url: string;
  image: string | null;
  favicon: string | null;
}) {
  const [broken, setBroken] = useState(false);
  const showImage = Boolean(image) && !broken;
  const fallbackStyle: CSSProperties = { ["--seed-hue"]: hueFromHost(url) };
  const monogram = hostLabel(url).charAt(0).toUpperCase() || "\u2022";

  return (
    <div
      className="scribe-linkcard-media"
      data-empty={showImage ? undefined : "true"}
    >
      {showImage ? (
        <img
          src={image ?? undefined}
          alt=""
          className="scribe-linkcard-image"
          onError={() => {
            setBroken(true);
          }}
        />
      ) : (
        <div className="scribe-linkcard-fallback" style={fallbackStyle}>
          {favicon ? (
            <img
              src={favicon}
              alt=""
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <span>{monogram}</span>
          )}
        </div>
      )}
    </div>
  );
}

// Renders a bookmark card and owns the one-time metadata fetch. On insert (with
// no cached metadata, status="loading") it fetches once, then writes the result
// back via updateAttributes so the cache lives in the document. Refresh re-runs
// the fetch; convert/remove fall back to a plain link or delete the node.
export function LinkCardView({
  node,
  updateAttributes,
  editor,
  deleteNode,
}: NodeViewProps) {
  const url = (node.attrs.url as string) ?? "";
  const status = (node.attrs.status as Status) ?? "ready";
  const title = node.attrs.title as string | null;
  const description = node.attrs.description as string | null;
  const siteName = (node.attrs.siteName as string | null) ?? hostLabel(url);
  const favicon = node.attrs.favicon as string | null;
  const image = node.attrs.image as string | null;
  const editable = editor.isEditable;

  // Guard so the fetch fires once per URL even under StrictMode's double-mount.
  const fetchedFor = useRef<string | null>(null);
  // Track liveness instead of cancelling per-effect: StrictMode's mount/unmount/
  // remount cycle would otherwise cancel the sole in-flight fetch while the
  // `fetchedFor` guard blocks a restart, stranding the card in "loading".
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    // Fetch while loading, and also retry "error" cards once on mount so nodes
    // that failed before (e.g. a transient network blip, or state poisoned by an
    // earlier bug) self-heal instead of being permanently stuck.
    if (!url || (status !== "loading" && status !== "error")) return;
    if (fetchedFor.current === url) return;
    fetchedFor.current = url;
    void fetchLinkMetadata(url).then((meta) => {
      // Drop the result only if the view is gone or a newer fetch (refresh / URL
      // change) has superseded this one.
      if (!mounted.current || fetchedFor.current !== url) return;
      updateAttributes({
        ...meta,
        // Any extracted preview (title or image) counts as a usable card.
        status: meta.title || meta.image ? "ready" : "error",
      });
    });
  }, [url, status, updateAttributes]);

  const open = () => {
    if (url) void openUrl(url);
  };

  const refresh = () => {
    fetchedFor.current = null;
    updateAttributes({ status: "loading" });
  };

  const copy = () => {
    void navigator.clipboard.writeText(url);
    toast.success("Link copied");
  };

  return (
    <NodeViewWrapper
      className="scribe-linkcard group/linkcard"
      data-status={status}
    >
      <CardSurface className="scribe-linkcard-body" onActivate={open}>
        {status === "loading" ? (
          <>
            <div className="scribe-linkcard-text">
              <span className="scribe-skel scribe-skel-site" />
              <span className="scribe-skel scribe-skel-title" />
              <span className="scribe-skel scribe-skel-desc" />
            </div>
            <div className="scribe-linkcard-media">
              <span className="scribe-skel scribe-linkcard-media-skel" />
            </div>
          </>
        ) : (
          <>
            <div className="scribe-linkcard-text">
              <div className="scribe-linkcard-site">
                {favicon ? (
                  <img
                    src={favicon}
                    alt=""
                    className="scribe-linkcard-favicon"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                ) : null}
                <span className="truncate">{siteName}</span>
              </div>
              <div className="scribe-linkcard-title">
                {title || pathLabel(url) || hostLabel(url)}
              </div>
              {description && (
                <div className="scribe-linkcard-desc">{description}</div>
              )}
            </div>
            <LinkCardMedia
              key={image ?? "empty"}
              url={url}
              image={image}
              favicon={favicon}
            />
          </>
        )}
      </CardSurface>

      {editable && (
        <BlockControls className="scribe-linkcard-controls">
          <EditorIconButton label="Open in browser" onClick={open}>
            <ExternalLinkIcon size={14} />
          </EditorIconButton>
          <EditorIconButton label="Copy link" onClick={copy}>
            <CopyIcon size={14} />
          </EditorIconButton>
          <EditorIconButton label="Refresh preview" onClick={refresh}>
            <RefreshIcon size={14} />
          </EditorIconButton>
          <EditorIconButton
            label="Convert to link"
            onClick={() => {
              keepAsLink(editor, url);
            }}
          >
            <LinkIcon size={14} />
          </EditorIconButton>
          <EditorIconButton
            label="Remove"
            onClick={() => {
              deleteNode();
            }}
          >
            <TrashIcon size={14} />
          </EditorIconButton>
        </BlockControls>
      )}
    </NodeViewWrapper>
  );
}
