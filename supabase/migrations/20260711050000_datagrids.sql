-- Datagrids: Notion-style database tables that live inside a collection. A
-- datagrid owns a property schema (`fields`), a set of saved `datagrid_views`
-- (table/gallery/board layouts + filters/sorts), and its `datagrid_rows` (the
-- records). Mirrors the collections/entries conventions -- user_id-scoped,
-- owner-only RLS, set_updated_at triggers, and numeric fractional-index
-- `position`. Everything cascades: deleting a collection removes its datagrids,
-- and deleting a datagrid removes its views and rows.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.datagrids (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  collection_id uuid not null references public.collections (id) on delete cascade,
  name text not null default 'Untitled',
  icon text,
  cover_url text,
  -- `fields` is the property schema: an array of { id, name, type, config }.
  fields jsonb not null default '[]'::jsonb,
  position numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.datagrid_views (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  datagrid_id uuid not null references public.datagrids (id) on delete cascade,
  name text not null default 'Table',
  -- `config` is the display config: { layout, filters, sorts, groupBy, ... }.
  config jsonb not null default '{}'::jsonb,
  position numeric not null default 0,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.datagrid_rows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  datagrid_id uuid not null references public.datagrids (id) on delete cascade,
  title text not null default 'Untitled',
  icon text,
  cover_url text,
  -- `properties` holds the typed field values keyed by the datagrid field id.
  properties jsonb not null default '{}'::jsonb,
  -- `content` is the ProseMirror/TipTap editor body of the row's detail page.
  content jsonb not null default '{}'::jsonb,
  position numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index datagrids_user_id_idx on public.datagrids (user_id);
create index datagrids_collection_id_idx on public.datagrids (collection_id);

create index datagrid_views_user_id_idx on public.datagrid_views (user_id);
create index datagrid_views_datagrid_id_idx on public.datagrid_views (datagrid_id);

create index datagrid_rows_user_id_idx on public.datagrid_rows (user_id);
create index datagrid_rows_datagrid_id_idx on public.datagrid_rows (datagrid_id);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

create trigger set_datagrids_updated_at
  before update on public.datagrids
  for each row execute function public.set_updated_at();

create trigger set_datagrid_views_updated_at
  before update on public.datagrid_views
  for each row execute function public.set_updated_at();

create trigger set_datagrid_rows_updated_at
  before update on public.datagrid_rows
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.datagrids enable row level security;
alter table public.datagrid_views enable row level security;
alter table public.datagrid_rows enable row level security;

-- datagrids
create policy "Datagrids are viewable by owner"
  on public.datagrids for select
  using (auth.uid() = user_id);

create policy "Datagrids are insertable by owner"
  on public.datagrids for insert
  with check (auth.uid() = user_id);

create policy "Datagrids are updatable by owner"
  on public.datagrids for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Datagrids are deletable by owner"
  on public.datagrids for delete
  using (auth.uid() = user_id);

-- datagrid_views
create policy "Datagrid views are viewable by owner"
  on public.datagrid_views for select
  using (auth.uid() = user_id);

create policy "Datagrid views are insertable by owner"
  on public.datagrid_views for insert
  with check (auth.uid() = user_id);

create policy "Datagrid views are updatable by owner"
  on public.datagrid_views for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Datagrid views are deletable by owner"
  on public.datagrid_views for delete
  using (auth.uid() = user_id);

-- datagrid_rows
create policy "Datagrid rows are viewable by owner"
  on public.datagrid_rows for select
  using (auth.uid() = user_id);

create policy "Datagrid rows are insertable by owner"
  on public.datagrid_rows for insert
  with check (auth.uid() = user_id);

create policy "Datagrid rows are updatable by owner"
  on public.datagrid_rows for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Datagrid rows are deletable by owner"
  on public.datagrid_rows for delete
  using (auth.uid() = user_id);
