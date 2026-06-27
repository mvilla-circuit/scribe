import "react";

// React's `CSSProperties` is intentionally closed (no index signature), so
// inline styles that set CSS custom properties (`--foo`) don't typecheck.
// csstype's own guidance is to augment the interface; doing it once here lets
// us write `{ "--accent": color }` directly instead of casting at each site.
declare module "react" {
  // eslint-disable-next-line @typescript-eslint/consistent-indexed-object-style -- Augmenting the existing CSSProperties interface requires an index signature; a Record type alias can't be merged into an interface.
  interface CSSProperties {
    [key: `--${string}`]: string | number | undefined;
  }
}
