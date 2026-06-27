-- Reading mode was scaffolded into the schema but never shipped to the UI or
-- editor, so its per-page flag is unused. Remove the column.

alter table public.documents drop column read_mode;
