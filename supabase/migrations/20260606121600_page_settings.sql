-- Page-level settings for documents: optional subtitle, an opt-in heading
-- outline, and a per-page read/edit mode. (Icons reuse the existing `icon`
-- column added in the initial schema.)

alter table public.documents add column subtitle text;
alter table public.documents add column show_outline boolean not null default false;
alter table public.documents add column read_mode boolean not null default false;
