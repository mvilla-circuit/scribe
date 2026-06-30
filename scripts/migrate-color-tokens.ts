// One-time data migration: rewrite the resolved color literals saved before the
// palette was tokenized into the new `var(--swatch-…)` references, so existing
// content reads from the same single source of truth (index.css) as new edits.
//
// Background: the editor used to persist a fully-resolved color (hex / rgba) on
// every mark, node attribute, glyph icon, and the page banner. After moving the
// palette to CSS-variable tokens (see src/editor/palette.ts + src/index.css),
// those baked literals no longer track the palette. This script maps each known
// legacy literal to its token and rewrites the affected rows once.
//
// Run after the tokens have shipped in CSS:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
//     npm run migrate:colors -- --dry-run        # report counts, write nothing
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
//     npm run migrate:colors                      # apply
//
// It is idempotent: a second run finds only tokens (never legacy literals) and
// changes nothing. Take a database snapshot before applying.

import { createClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Legacy -> token value map
// ---------------------------------------------------------------------------

// The hue sweep exactly as it was last deployed (the literals actually sitting
// in the database), in order. The slug is the *new* token slug, so the hue
// formerly labelled "Sage" maps onto `moss`. "Ink" is intentionally absent: it
// was always stored as a `var(--swatch-ink*)` token, so it needs no rewrite.
const LEGACY_HUES: readonly { slug: string; solid: string; wash: string }[] = [
  { slug: "stone", solid: "#8c857c", wash: "150, 158, 150" },
  { slug: "honey", solid: "#b0924f", wash: "214, 178, 110" },
  { slug: "terracotta", solid: "#b07a5c", wash: "212, 160, 120" },
  { slug: "umber", solid: "#8a6e57", wash: "168, 140, 108" },
  { slug: "clay", solid: "#b27f78", wash: "200, 142, 134" },
  { slug: "rosewood", solid: "#b6829a", wash: "206, 150, 178" },
  { slug: "mauve", solid: "#a47db2", wash: "196, 150, 206" },
  { slug: "plum", solid: "#6f5499", wash: "150, 112, 196" },
  { slug: "sky", solid: "#6ba6c8", wash: "120, 178, 210" },
  { slug: "dusk", solid: "#5a6cb0", wash: "96, 120, 198" },
  { slug: "eucalyptus", solid: "#4e8a84", wash: "110, 168, 160" },
  // Formerly "Sage".
  { slug: "moss", solid: "#84926d", wash: "150, 168, 124" },
  { slug: "fern", solid: "#5f7d5b", wash: "118, 158, 114" },
];

// The translucent-wash surfaces, each composing the hue's rgb triple at its own
// alpha. These must mirror palette.ts `washPalette(base, spread, …)` exactly so
// the generated legacy strings match what was stored byte-for-byte.
const WASH_SURFACES: readonly { base: number; spread: number }[] = [
  { base: 0.3, spread: 0.02 }, // HIGHLIGHT_COLORS
  { base: 0.16, spread: 0.01 }, // CALLOUT_COLORS
  { base: 0.23, spread: 0.01 }, // TABLE_HEADER_COLORS
  { base: 0.19, spread: 0.01 }, // TABLE_CELL_COLORS
];

// washPalette nudges the lead hue down and the second hue up by `spread`, the
// rest sit at `base`; formatted to two decimals like the palette does.
function alphaFor(i: number, base: number, spread: number): string {
  const a = i === 0 ? base - spread : i === 1 ? base + spread : base;
  return a.toFixed(2);
}

// old literal string -> new token string.
const VALUE_MAP: Map<string, string> = (() => {
  const map = new Map<string, string>();
  LEGACY_HUES.forEach((hue, i) => {
    map.set(hue.solid, `var(--swatch-${hue.slug})`);
    for (const { base, spread } of WASH_SURFACES) {
      const a = alphaFor(i, base, spread);
      map.set(
        `rgba(${hue.wash}, ${a})`,
        `rgba(var(--swatch-${hue.slug}-rgb), ${a})`,
      );
    }
  });
  return map;
})();

// Map a single stored color string to its token, leaving anything unknown
// (already-tokenized values, the Ink tokens, user emoji, etc.) untouched.
function migrateValue(value: string): string {
  return VALUE_MAP.get(value) ?? value;
}

// ---------------------------------------------------------------------------
// Glyph icons (a tagged JSON string that may embed a palette color)
// ---------------------------------------------------------------------------

// Mirrors src/data/icon.ts: a stored icon is tagged JSON; a `glyph` may carry a
// palette `color`. Anything that isn't our JSON (legacy bare emoji) is returned
// verbatim. Only the embedded color is remapped, and only when it changes.
function migrateIcon(raw: string): string {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return raw;
  }
  if (!parsed || typeof parsed !== "object") return raw;
  const icon = parsed as Record<string, unknown>;
  if (icon.type !== "glyph" || typeof icon.color !== "string") return raw;
  const nextColor = migrateValue(icon.color);
  if (nextColor === icon.color) return raw;
  return JSON.stringify({ ...icon, color: nextColor });
}

// ---------------------------------------------------------------------------
// ProseMirror document walk
// ---------------------------------------------------------------------------

// Walk the ProseMirror JSON in place, remapping every color-bearing slot: mark
// attrs (`textStyle`/`highlight`/`underline` color), node attrs (`color`,
// `background`), and the nested glyph-icon color on `attrs.icon`.
function walk(node: unknown): void {
  if (Array.isArray(node)) {
    for (const child of node) walk(child);
    return;
  }
  if (!node || typeof node !== "object") return;
  const obj = node as Record<string, unknown>;

  const attrs = obj.attrs;
  if (attrs && typeof attrs === "object") {
    const a = attrs as Record<string, unknown>;
    if (typeof a.color === "string") a.color = migrateValue(a.color);
    if (typeof a.background === "string")
      a.background = migrateValue(a.background);
    if (typeof a.icon === "string") a.icon = migrateIcon(a.icon);
  }

  if (Array.isArray(obj.marks)) {
    for (const mark of obj.marks) {
      if (!mark || typeof mark !== "object") continue;
      const markAttrs = (mark as Record<string, unknown>).attrs;
      if (markAttrs && typeof markAttrs === "object") {
        const ma = markAttrs as Record<string, unknown>;
        if (typeof ma.color === "string") ma.color = migrateValue(ma.color);
      }
    }
  }

  if (Array.isArray(obj.content)) {
    for (const child of obj.content) walk(child);
  }
}

// Returns a migrated copy of a document body plus whether anything changed.
function migrateContent(content: unknown): {
  next: unknown;
  changed: boolean;
} {
  if (content === null || typeof content !== "object") {
    return { next: content, changed: false };
  }
  const next: unknown = JSON.parse(JSON.stringify(content));
  const before = JSON.stringify(next);
  walk(next);
  return { next, changed: JSON.stringify(next) !== before };
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

interface DocumentRow {
  id: string;
  content: unknown;
  banner_color: string | null;
  icon: string | null;
}
interface BookRow {
  id: string;
  icon: string | null;
}

const PAGE_SIZE = 500;

// Keyset paging sentinel: the all-zero UUID sorts before any real id, so the
// first `id > ZERO_UUID` page starts at the very beginning. (An empty string
// isn't a valid uuid and Postgres rejects the comparison.)
const ZERO_UUID = "00000000-0000-0000-0000-000000000000";

function parseArgs(argv: string[]): { dryRun: boolean; limit: number | null } {
  let dryRun = false;
  let limit: number | null = null;
  for (const arg of argv) {
    if (arg === "--dry-run") dryRun = true;
    else if (arg.startsWith("--limit=")) {
      const n = Number.parseInt(arg.slice("--limit=".length), 10);
      if (Number.isFinite(n) && n > 0) limit = n;
    }
  }
  return { dryRun, limit };
}

async function main(): Promise<void> {
  const { dryRun, limit } = parseArgs(process.argv.slice(2));

  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error(
      "Missing env: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (the service-role key, not the anon key).",
    );
    process.exit(1);
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log(
    `Color token migration — ${dryRun ? "DRY RUN (no writes)" : "APPLYING"}` +
      (limit ? `, limit ${limit} documents` : ""),
  );
  console.log(`Loaded ${VALUE_MAP.size} legacy color mappings.`);

  let scannedDocs = 0;
  let changedDocs = 0;

  // Documents: body content + banner + icon. Keyset by id for a stable page
  // order that survives writes between pages.
  let cursor = ZERO_UUID;
  for (;;) {
    if (limit !== null && scannedDocs >= limit) break;
    const { data, error } = await supabase
      .from("documents")
      .select("id, content, banner_color, icon")
      .gt("id", cursor)
      .order("id", { ascending: true })
      .limit(PAGE_SIZE);
    if (error) throw error;
    const rows = (data ?? []) as DocumentRow[];
    if (rows.length === 0) break;

    for (const row of rows) {
      if (limit !== null && scannedDocs >= limit) break;
      scannedDocs += 1;
      cursor = row.id;

      const { next: nextContent, changed: contentChanged } = migrateContent(
        row.content,
      );
      const nextBanner =
        row.banner_color === null ? null : migrateValue(row.banner_color);
      const nextIcon = row.icon === null ? null : migrateIcon(row.icon);

      const changed =
        contentChanged ||
        nextBanner !== row.banner_color ||
        nextIcon !== row.icon;
      if (!changed) continue;
      changedDocs += 1;

      if (!dryRun) {
        const { error: updateError } = await supabase
          .from("documents")
          .update({
            content: nextContent,
            banner_color: nextBanner,
            icon: nextIcon,
          })
          .eq("id", row.id);
        if (updateError) throw updateError;
      }
    }

    if (rows.length < PAGE_SIZE) break;
  }

  console.log(
    `Documents: ${scannedDocs} scanned, ${changedDocs} ${dryRun ? "would change" : "updated"}.`,
  );

  // Books: only the icon column can embed a palette color.
  let bookScanned = 0;
  let bookChanged = 0;
  let bookCursor = ZERO_UUID;
  for (;;) {
    const { data, error } = await supabase
      .from("books")
      .select("id, icon")
      .gt("id", bookCursor)
      .order("id", { ascending: true })
      .limit(PAGE_SIZE);
    if (error) throw error;
    const rows = (data ?? []) as BookRow[];
    if (rows.length === 0) break;

    for (const row of rows) {
      bookScanned += 1;
      bookCursor = row.id;
      const nextIcon = row.icon === null ? null : migrateIcon(row.icon);
      if (nextIcon === row.icon) continue;
      bookChanged += 1;
      if (!dryRun) {
        const { error: updateError } = await supabase
          .from("books")
          .update({ icon: nextIcon })
          .eq("id", row.id);
        if (updateError) throw updateError;
      }
    }

    if (rows.length < PAGE_SIZE) break;
  }

  console.log(
    `Books: ${bookScanned} scanned, ${bookChanged} ${dryRun ? "would change" : "updated"}.`,
  );
  console.log("Done.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
