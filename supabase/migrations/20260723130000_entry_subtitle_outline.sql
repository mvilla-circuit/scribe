-- Per-entry subtitle + outline flags (documents parity; no contents/banner).
alter table public.entries
  add column subtitle text,
  add column show_subtitle boolean not null default false,
  add column show_outline boolean not null default false;
