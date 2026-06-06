-- Per-page toggle for the subtitle field, so pages without a subtitle aren't
-- cluttered by an empty slot. Existing pages that already have a subtitle keep
-- showing it; everything else defaults to hidden.

alter table public.documents
  add column show_subtitle boolean not null default false;

update public.documents
  set show_subtitle = true
  where subtitle is not null and subtitle <> '';
