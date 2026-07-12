import {
  NodeViewContent,
  type NodeViewProps,
  NodeViewWrapper,
} from "@tiptap/react";
import {
  type CSSProperties,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { Input } from "@/components/ui/input";
import { Tooltip } from "@/components/ui/tooltip";
import { AccentColorPopover } from "@/editor/block-control-presets";
import { BlockControls } from "@/editor/block-controls";
import { AttributionIcon } from "@/editor/icons";
import { cn } from "@/lib/utils";

import { DEFAULT_QUOTE_VARIANT } from "./quote-constants";

// The quote's writing surface: a tinted/ruled/pull-quote block (driven by the
// `variant` class) whose accent color flows through the `--quote-accent` CSS
// variable so every variant retints from one swatch choice. A quiet control
// cluster fades in on hover/focus with an accent palette and a toggle for the
// optional, right-aligned attribution line. Every control writes back via
// updateAttributes, so edits persist with the document.
export function QuoteView({ node, updateAttributes, editor }: NodeViewProps) {
  const variant = (node.attrs.variant as string) || DEFAULT_QUOTE_VARIANT;
  const color = (node.attrs.color as string | null) ?? null;
  const attribution = (node.attrs.attribution as string) || "";
  const showAttribution = Boolean(node.attrs.showAttribution);
  const editable = editor.isEditable;

  const [colorOpen, setColorOpen] = useState(false);
  const citeRef = useRef<HTMLInputElement>(null);

  // Focus the citation field the moment it's switched on, so the writer can
  // start typing the attribution without a second click.
  const justEnabled = useRef(false);
  useEffect(() => {
    if (showAttribution && justEnabled.current) {
      citeRef.current?.focus();
      justEnabled.current = false;
    }
  }, [showAttribution]);

  // The citation input is debounced: every keystroke updates a local draft (so
  // the field stays responsive) but only commits to the node attribute after a
  // short pause. Writing the attribute dispatches a ProseMirror transaction that
  // marks autosave dirty and re-runs every editor selector, so doing it per
  // keystroke is needlessly heavy.
  const [draftCite, setDraftCite] = useState(attribution);
  const citeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [citeFocused, setCiteFocused] = useState(false);
  // Latest values mirrored into refs so the captured-once commit paths (the
  // debounce callback and the unmount flush) stay current without re-binding:
  //  - `attributionRef` lets a commit short-circuit when nothing changed,
  //  - `updateAttributesRef` keeps the writer fresh across node updates,
  //  - `pendingCiteRef` holds the value queued by an in-flight debounce so the
  //    unmount cleanup can flush it instead of dropping a just-typed citation.
  const attributionRef = useRef(attribution);
  const updateAttributesRef = useRef(updateAttributes);
  const pendingCiteRef = useRef<string | null>(null);
  // Refresh the mirrors after render (not during it, which the refs lint
  // forbids) so the captured-once commit paths read current values.
  useEffect(() => {
    attributionRef.current = attribution;
    updateAttributesRef.current = updateAttributes;
  });
  // Re-sync the draft when the stored value changes from elsewhere (undo, a
  // collaborator) — but never while the field is focused, so a debounced commit
  // of our own keystrokes can't clobber what's still being typed. Reconciling
  // during render (per React's "you might not need an effect") rather than in an
  // effect avoids the cascading-render the lint guards against.
  const [prevAttribution, setPrevAttribution] = useState(attribution);
  if (attribution !== prevAttribution) {
    setPrevAttribution(attribution);
    if (!citeFocused) setDraftCite(attribution);
  }
  // On unmount, flush a pending debounced citation rather than dropping it — a
  // writer who types and immediately navigates away would otherwise lose the
  // last edit. No-op when nothing is queued, preserving prior behavior.
  useEffect(
    () => () => {
      if (!citeTimer.current) return;
      clearTimeout(citeTimer.current);
      citeTimer.current = null;
      const pending = pendingCiteRef.current;
      pendingCiteRef.current = null;
      if (pending !== null && pending !== attributionRef.current) {
        try {
          updateAttributesRef.current({ attribution: pending });
        } catch {
          // The node may already be gone (e.g. the quote was deleted) by the
          // time we unmount; there's nothing left to persist to.
        }
      }
    },
    [],
  );
  const commitCite = useCallback((value: string) => {
    if (citeTimer.current) clearTimeout(citeTimer.current);
    pendingCiteRef.current = value;
    citeTimer.current = setTimeout(() => {
      citeTimer.current = null;
      pendingCiteRef.current = null;
      if (value !== attributionRef.current) {
        updateAttributesRef.current({ attribution: value });
      }
    }, 300);
  }, []);
  const flushCite = useCallback((value: string) => {
    if (citeTimer.current) {
      clearTimeout(citeTimer.current);
      citeTimer.current = null;
    }
    pendingCiteRef.current = null;
    // Skip the write — and the transaction it would dispatch — when the value
    // already matches what's stored.
    if (value !== attributionRef.current) {
      updateAttributesRef.current({ attribution: value });
    }
  }, []);

  const wrapperStyle: CSSProperties | undefined = color
    ? { "--quote-accent": color }
    : undefined;

  return (
    <NodeViewWrapper
      className={cn("scribe-quote", `scribe-quote--${variant}`, "group/quote")}
      data-quote=""
      data-variant={variant}
      style={wrapperStyle}
    >
      <NodeViewContent className="scribe-quote-body" />

      {showAttribution && (editable || attribution) && (
        <div className="scribe-quote-cite" contentEditable={false}>
          {editable ? (
            <span
              className="scribe-quote-cite-field"
              data-value={attribution || "Add a citation…"}
            >
              <Input
                ref={citeRef}
                type="text"
                // size=1 keeps the input's own intrinsic width tiny so the
                // invisible grid sizer (the field's ::after, set to the text)
                // drives the width. Otherwise the input's default 20-char width
                // inflates the auto track and the text floats left of the edge.
                size={1}
                value={draftCite}
                placeholder="Add a citation…"
                onChange={(e) => {
                  setDraftCite(e.target.value);
                  commitCite(e.target.value);
                }}
                onFocus={() => {
                  setCiteFocused(true);
                }}
                onBlur={(e) => {
                  setCiteFocused(false);
                  flushCite(e.target.value);
                }}
                onKeyDown={(e) => {
                  e.stopPropagation();
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                }}
                className="h-auto focus-visible:ring-0 scribe-quote-cite-input"
                aria-label="Quote attribution"
              />
            </span>
          ) : (
            <span className="scribe-quote-cite-input">{attribution}</span>
          )}
        </div>
      )}

      {editable && (
        <BlockControls className="scribe-quote-controls" open={colorOpen}>
          <Tooltip
            content={showAttribution ? "Hide attribution" : "Show attribution"}
          >
            <button
              type="button"
              aria-pressed={showAttribution}
              aria-label={
                showAttribution ? "Hide attribution" : "Show attribution"
              }
              onClick={() => {
                justEnabled.current = !showAttribution;
                updateAttributes({ showAttribution: !showAttribution });
              }}
              className="scribe-block-btn"
            >
              <AttributionIcon size={15} />
            </button>
          </Tooltip>

          <AccentColorPopover
            color={color}
            onChange={(value) => {
              updateAttributes({ color: value });
            }}
            open={colorOpen}
            onOpenChange={setColorOpen}
            triggerLabel="Style"
            triggerAriaLabel="Quote style"
          />
        </BlockControls>
      )}
    </NodeViewWrapper>
  );
}
