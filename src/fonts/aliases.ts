/**
 * Compatibility map for font ids removed from the production catalog.
 *
 * Stored font maps remain untouched; resolution applies these substitutions
 * when a document is read.
 */
export const FONT_ALIASES: Readonly<Record<string, string>> = {
  "anonymous-pro": "source-code-pro",
  "azeret-mono": "jetbrains-mono",
  "b612-mono": "jetbrains-mono",
  "bodoni-moda": "playfair-display",
  cousine: "source-code-pro",
  "courier-prime": "source-code-pro",
  "dm-sans": "inter",
  "ibm-plex-mono": "jetbrains-mono",
  "red-hat-mono": "geist-mono",
  "ubuntu-sans-mono": "ubuntu-mono",
  "victor-mono": "jetbrains-mono",
};

/**
 * Maps a stored font id to the current catalog id. Unknown ids pass through
 * unchanged so callers can still apply role defaults.
 */
export function canonicalizeFontId(fontId: string): string {
  return FONT_ALIASES[fontId] ?? fontId;
}
