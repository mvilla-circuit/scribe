/**
 * Compact inverted chrome for controls floating over cover / banner media.
 * Near-black in light mode and near-white in dark so labels stay readable on
 * any photo — quieter than elevated surface cards.
 */
export const COVER_FLOATING_CONTROL_CLASS =
  "inline-flex items-center justify-center rounded-md bg-inverted text-inverted-text/85 outline-none transition-colors hover:text-inverted-text focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60";

/** Square icon hit target for cover floating controls. */
export const COVER_FLOATING_ICON_CLASS = "size-7";

/** Icon button: square hit target + inverted hover fill. */
export const COVER_FLOATING_ICON_BUTTON_CLASS = `${COVER_FLOATING_CONTROL_CLASS} ${COVER_FLOATING_ICON_CLASS} hover:bg-inverted hover:text-inverted-text`;

/** Compact labeled control (Change cover, Save, Cancel). */
export const COVER_FLOATING_LABEL_CLASS = "gap-1 px-2 py-1 text-xs font-medium";
