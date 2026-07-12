import { MORANDI_SWATCHES, titleCaseHue } from "@/lib/swatches";

import { SwatchDot, SwatchGridLayout } from "./swatch-grid";

/**
 * Morandi hue picker (datagrid options, collection tags) — one dot per palette
 * hue, no clear chip. Uses the shared Accent chrome from `SwatchGridLayout` so
 * size and spacing match every other 5-col palette.
 *
 * Tooltips show the Title Case hue name; `ariaLabelForHue` receives that same
 * Title Case string so callers can add context without re-casing.
 */
export function MorandiSwatchGrid({
  value,
  onChange,
  ariaLabelForHue,
}: {
  value: string | null;
  onChange: (hue: string) => void;
  ariaLabelForHue: (hue: string) => string;
}) {
  return (
    <SwatchGridLayout>
      {MORANDI_SWATCHES.map((hue) => {
        const name = titleCaseHue(hue);
        return (
          <SwatchDot
            key={hue}
            label={name}
            ariaLabel={ariaLabelForHue(name)}
            background={`var(--swatch-${hue})`}
            active={value === hue}
            onClick={() => {
              onChange(hue);
            }}
          />
        );
      })}
    </SwatchGridLayout>
  );
}
