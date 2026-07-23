alter table public.books
  add column cover_position numeric not null default 50
    constraint books_cover_position_range
      check (cover_position >= 0 and cover_position <= 100);

alter table public.documents
  add column cover_position numeric not null default 50
    constraint documents_cover_position_range
      check (cover_position >= 0 and cover_position <= 100);

alter table public.collections
  add column cover_position numeric not null default 50
    constraint collections_cover_position_range
      check (cover_position >= 0 and cover_position <= 100);

alter table public.entries
  add column cover_position numeric not null default 50
    constraint entries_cover_position_range
      check (cover_position >= 0 and cover_position <= 100);

alter table public.datagrids
  add column cover_position numeric not null default 50
    constraint datagrids_cover_position_range
      check (cover_position >= 0 and cover_position <= 100);

alter table public.datagrid_rows
  add column cover_position numeric not null default 50
    constraint datagrid_rows_cover_position_range
      check (cover_position >= 0 and cover_position <= 100);

alter table public.whiteboards
  add column cover_position numeric not null default 50
    constraint whiteboards_cover_position_range
      check (cover_position >= 0 and cover_position <= 100);
