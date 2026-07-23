-- Entry-level font overrides (global -> entry cascade; no collection layer).
-- Same nullable jsonb shape as documents.font_overrides: NULL/{} means inherit.
alter table public.entries
  add column font_overrides jsonb;
