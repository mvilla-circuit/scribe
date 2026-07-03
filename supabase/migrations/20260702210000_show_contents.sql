-- Per-page toggle for an inline table of contents. A parent page (one with
-- child pages) can opt in to render its descendant subtree as a contents list,
-- mirroring the book cover. Defaults to hidden so existing pages are unchanged.

alter table public.documents
  add column show_contents boolean not null default false;
