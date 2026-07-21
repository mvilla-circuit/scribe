/**
 * Cardillac woff2 URLs for personal / DEV builds. Vite resolves
 * `@scribe/cardillac-assets` to this module only when the allow gate is open;
 * commercial production builds get `cardillac-assets-empty.ts` instead so these
 * files never enter the asset graph.
 */
export const CARDILLAC_FONT_ASSETS = import.meta.glob<string>(
  "./brand-assets/Cardillac-*.woff2",
  {
    eager: true,
    import: "default",
    query: "?url",
  },
);
