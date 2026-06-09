-- Phase 6 typography system.
--
-- profiles.fonts: the global role -> fontId map ({ display, text, code }). An
-- empty object means "use the system defaults", so existing users keep the
-- current look until they pick fonts in Settings.
--
-- documents.font_overrides: an optional per-page role -> fontId override map
-- ({ display?, text?, code? }) that wins over the book's and global maps. NULL
-- (or an empty object) means the page inherits live, so new pages need no row.
-- The book level stores the same shape under books.theme.fonts.

alter table public.profiles
  add column fonts jsonb not null default '{}'::jsonb;

alter table public.documents
  add column font_overrides jsonb;
