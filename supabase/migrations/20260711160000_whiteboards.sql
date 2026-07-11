-- Whiteboards: collection-scoped spatial canvases persisted as a single scene.
-- Mirrors the datagrids conventions: user-scoped, owner-only RLS, a shared
-- set_updated_at trigger, and numeric fractional-index position.

create table public.whiteboards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  collection_id uuid not null references public.collections (id) on delete cascade,
  name text not null default 'Untitled',
  icon text,
  cover_url text,
  scene jsonb not null default '{}'::jsonb,
  position numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index whiteboards_user_id_idx on public.whiteboards (user_id);
create index whiteboards_collection_id_idx on public.whiteboards (collection_id);

create trigger set_whiteboards_updated_at
  before update on public.whiteboards
  for each row execute function public.set_updated_at();

alter table public.whiteboards enable row level security;

create policy "Whiteboards are viewable by owner"
  on public.whiteboards for select
  using (auth.uid() = user_id);

create policy "Whiteboards are insertable by owner"
  on public.whiteboards for insert
  with check (auth.uid() = user_id);

create policy "Whiteboards are updatable by owner"
  on public.whiteboards for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Whiteboards are deletable by owner"
  on public.whiteboards for delete
  using (auth.uid() = user_id);
