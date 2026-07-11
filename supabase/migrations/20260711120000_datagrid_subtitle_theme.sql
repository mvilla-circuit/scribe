-- Datagrid chrome parity with books: optional subtitle + theme jsonb (fonts /
-- showSubtitle), so a datagrid page can host the same top-right subtitle toggle
-- and Aa font controls as a book title page.

alter table public.datagrids
  add column subtitle text,
  add column theme jsonb not null default '{}'::jsonb;
