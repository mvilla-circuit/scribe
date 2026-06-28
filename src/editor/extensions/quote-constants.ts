// The quote block's variant set, in their own leaf module so the node
// definition and its node view can both read them without importing each other
// (which would form a circular dependency).

/** The two visual treatments a quote block can take. */
export type QuoteVariant = "pullquote" | "accentquote";

/** The variant a fresh quote (and the `> ` markdown shortcut) starts in. */
export const DEFAULT_QUOTE_VARIANT: QuoteVariant = "accentquote";
