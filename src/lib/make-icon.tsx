// Shared factory for the Lucide-backed chrome icons used across the sidebar and
// in-book outline. Wrapping Lucide preserves a local `{ size, className }` API
// and a uniform stroke weight so every call site stays unchanged and the icon
// set reads consistently.
import type { LucideProps } from "lucide-react";

/** Props shared by every chrome icon: an optional class name and pixel size. */
export interface IconProps {
  className?: string;
  size?: number;
}

// Slightly lighter than Lucide's default 2px stroke to match the app's refined,
// low-weight aesthetic.
const STROKE_WIDTH = 1.75;

/**
 * Wraps a Lucide icon component in the app's local `{ size, className }` API and
 * uniform stroke weight, so every call site stays unchanged and the icon set
 * reads consistently. Defaults to a 16px icon.
 */
export function makeIcon(Component: React.ComponentType<LucideProps>) {
  return function Icon({ className, size = 16 }: IconProps) {
    return (
      <Component
        size={size}
        className={className}
        strokeWidth={STROKE_WIDTH}
        aria-hidden
      />
    );
  };
}
