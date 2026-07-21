/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  /**
   * Personal builds: set `true` to embed Cardillac. Production commercial /
   * App Store builds must leave this unset (or `false`).
   */
  readonly VITE_ALLOW_CARDILLAC?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
