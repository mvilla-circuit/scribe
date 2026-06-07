import { useEffect, useRef } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { toast } from "sonner";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { Tooltip } from "../../components/ui/Tooltip";
import { fetchLinkMetadata, hostLabel } from "../linkPreview";
import { keepAsLink } from "./LinkCard";
import {
  CopyIcon,
  ExternalLinkIcon,
  LinkIcon,
  RefreshIcon,
  TrashIcon,
} from "../icons";

type Status = "loading" | "ready" | "error";

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

  useEffect(() => {
    if (!url || status !== "loading") return;
    if (fetchedFor.current === url) return;
    fetchedFor.current = url;
    let cancelled = false;
    fetchLinkMetadata(url).then((meta) => {
      if (cancelled) return;
      updateAttributes({
        ...meta,
        status: meta.title ? "ready" : "error",
      });
    });
    return () => {
      cancelled = true;
    };
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
    toast("Link copied");
  };

  return (
    <NodeViewWrapper
      className="scribe-linkcard group/linkcard"
      data-status={status}
    >
      <div
        role="link"
        tabIndex={0}
        onClick={open}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            open();
          }
        }}
        className="scribe-linkcard-body"
      >
        {status === "loading" ? (
          <div className="scribe-linkcard-skeleton">
            <div className="scribe-linkcard-text">
              <span className="scribe-skel scribe-skel-site" />
              <span className="scribe-skel scribe-skel-title" />
              <span className="scribe-skel scribe-skel-desc" />
            </div>
            <span className="scribe-skel scribe-linkcard-thumb" />
          </div>
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
                      (e.currentTarget as HTMLImageElement).style.display =
                        "none";
                    }}
                  />
                ) : null}
                <span className="truncate">{siteName}</span>
              </div>
              <div className="scribe-linkcard-title">
                {title || hostLabel(url)}
              </div>
              {description && (
                <div className="scribe-linkcard-desc">{description}</div>
              )}
              {status === "error" && !description && (
                <div className="scribe-linkcard-desc truncate">{url}</div>
              )}
            </div>
            {image && status === "ready" && (
              <div
                className="scribe-linkcard-thumb"
                style={{ backgroundImage: `url("${image}")` }}
              />
            )}
          </>
        )}
      </div>

      {editable && (
        <div className="scribe-block-controls scribe-linkcard-controls">
          <Ctrl label="Open in browser" onClick={open}>
            <ExternalLinkIcon size={14} />
          </Ctrl>
          <Ctrl label="Copy link" onClick={copy}>
            <CopyIcon size={14} />
          </Ctrl>
          <Ctrl label="Refresh preview" onClick={refresh}>
            <RefreshIcon size={14} />
          </Ctrl>
          <Ctrl label="Convert to link" onClick={() => keepAsLink(editor, url)}>
            <LinkIcon size={14} />
          </Ctrl>
          <Ctrl label="Remove" onClick={() => deleteNode()}>
            <TrashIcon size={14} />
          </Ctrl>
        </div>
      )}
    </NodeViewWrapper>
  );
}

function Ctrl({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Tooltip content={label}>
      <button
        type="button"
        aria-label={label}
        onMouseDown={(e) => e.preventDefault()}
        onClick={onClick}
        className="scribe-block-btn"
      >
        {children}
      </button>
    </Tooltip>
  );
}
