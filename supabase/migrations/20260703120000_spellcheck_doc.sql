-- Per-document spellcheck settings for the in-app spell checker.
--
-- documents.spellcheck_enabled: whether our custom (nspell-backed) spell checker
-- runs for this page. Defaults to true so every page — existing and new — gets
-- squiggles out of the box; the page toolbar toggles it off per document.
--
-- documents.spellcheck_ignores: a jsonb array of words the writer chose to
-- "Ignore" for this document only. Defaults to an empty array so existing pages
-- start with nothing ignored.

alter table public.documents
  add column spellcheck_enabled boolean not null default true,
  add column spellcheck_ignores jsonb not null default '[]'::jsonb;
