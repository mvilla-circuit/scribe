-- Collections & entries: a generic content engine (collections -> entries),
-- plus a shared tag vocabulary and polymorphic link relations. Additive to
-- books/documents: books participate only through the polymorphic taggables /
-- links join tables, so the books table itself is unchanged. Mirrors the init
-- schema conventions -- user_id-scoped, owner-only RLS, set_updated_at triggers,
-- and numeric fractional-index `position`.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null default 'Untitled',
  icon text,
  description text,
  -- `fields` is the property schema: an array of { id, name, type, config }.
  fields jsonb not null default '[]'::jsonb,
  -- `view` is the display config: { layout, coverField, visibleFields, sort }.
  view jsonb not null default '{}'::jsonb,
  position numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  collection_id uuid not null references public.collections (id) on delete cascade,
  title text not null default 'Untitled',
  icon text,
  cover_url text,
  -- `properties` holds the typed field values keyed by the collection field id.
  properties jsonb not null default '{}'::jsonb,
  -- `content` is the ProseMirror/TipTap editor body (same shape as documents).
  content jsonb not null default '{}'::jsonb,
  position numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  color text,
  position numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

-- Polymorphic tag assignment. `target_type` + `target_id` point at a book or an
-- entry; there is no real FK (the target table varies), so orphan rows are
-- cleaned by the purge_*_edges triggers below.
create table public.taggables (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  target_type text not null check (target_type in ('book', 'entry')),
  target_id uuid not null,
  created_at timestamptz not null default now(),
  unique (tag_id, target_type, target_id)
);

-- Polymorphic relation edge. `kind` defaults to '' (not null) so the unique
-- constraint actually dedupes an unlabeled edge between the same two nodes.
create table public.links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  source_type text not null check (source_type in ('book', 'entry')),
  source_id uuid not null,
  target_type text not null check (target_type in ('book', 'entry')),
  target_id uuid not null,
  kind text not null default '',
  created_at timestamptz not null default now(),
  unique (source_type, source_id, target_type, target_id, kind)
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index collections_user_id_idx on public.collections (user_id);

create index entries_user_id_idx on public.entries (user_id);
create index entries_collection_id_idx on public.entries (collection_id);

create index tags_user_id_idx on public.tags (user_id);

create index taggables_user_id_idx on public.taggables (user_id);
create index taggables_tag_id_idx on public.taggables (tag_id);
create index taggables_target_idx on public.taggables (target_type, target_id);

create index links_user_id_idx on public.links (user_id);
create index links_source_idx on public.links (source_type, source_id);
create index links_target_idx on public.links (target_type, target_id);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

create trigger set_collections_updated_at
  before update on public.collections
  for each row execute function public.set_updated_at();

create trigger set_entries_updated_at
  before update on public.entries
  for each row execute function public.set_updated_at();

create trigger set_tags_updated_at
  before update on public.tags
  for each row execute function public.set_updated_at();

-- Polymorphic-integrity cleanup: because taggables/links have no FK to books or
-- entries, purge any edge that referenced a row when it is deleted. Entry deletes
-- also cascade from a collection delete, so their edges get cleaned then too.
create or replace function public.purge_book_edges()
returns trigger
language plpgsql
as $$
begin
  delete from public.taggables
    where target_type = 'book' and target_id = old.id;
  delete from public.links
    where (source_type = 'book' and source_id = old.id)
       or (target_type = 'book' and target_id = old.id);
  return old;
end;
$$;

create trigger purge_book_edges_on_delete
  after delete on public.books
  for each row execute function public.purge_book_edges();

create or replace function public.purge_entry_edges()
returns trigger
language plpgsql
as $$
begin
  delete from public.taggables
    where target_type = 'entry' and target_id = old.id;
  delete from public.links
    where (source_type = 'entry' and source_id = old.id)
       or (target_type = 'entry' and target_id = old.id);
  return old;
end;
$$;

create trigger purge_entry_edges_on_delete
  after delete on public.entries
  for each row execute function public.purge_entry_edges();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.collections enable row level security;
alter table public.entries enable row level security;
alter table public.tags enable row level security;
alter table public.taggables enable row level security;
alter table public.links enable row level security;

-- collections
create policy "Collections are viewable by owner"
  on public.collections for select
  using (auth.uid() = user_id);

create policy "Collections are insertable by owner"
  on public.collections for insert
  with check (auth.uid() = user_id);

create policy "Collections are updatable by owner"
  on public.collections for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Collections are deletable by owner"
  on public.collections for delete
  using (auth.uid() = user_id);

-- entries
create policy "Entries are viewable by owner"
  on public.entries for select
  using (auth.uid() = user_id);

create policy "Entries are insertable by owner"
  on public.entries for insert
  with check (auth.uid() = user_id);

create policy "Entries are updatable by owner"
  on public.entries for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Entries are deletable by owner"
  on public.entries for delete
  using (auth.uid() = user_id);

-- tags
create policy "Tags are viewable by owner"
  on public.tags for select
  using (auth.uid() = user_id);

create policy "Tags are insertable by owner"
  on public.tags for insert
  with check (auth.uid() = user_id);

create policy "Tags are updatable by owner"
  on public.tags for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Tags are deletable by owner"
  on public.tags for delete
  using (auth.uid() = user_id);

-- taggables
create policy "Taggables are viewable by owner"
  on public.taggables for select
  using (auth.uid() = user_id);

create policy "Taggables are insertable by owner"
  on public.taggables for insert
  with check (auth.uid() = user_id);

create policy "Taggables are updatable by owner"
  on public.taggables for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Taggables are deletable by owner"
  on public.taggables for delete
  using (auth.uid() = user_id);

-- links
create policy "Links are viewable by owner"
  on public.links for select
  using (auth.uid() = user_id);

create policy "Links are insertable by owner"
  on public.links for insert
  with check (auth.uid() = user_id);

create policy "Links are updatable by owner"
  on public.links for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Links are deletable by owner"
  on public.links for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Storage: user-uploaded entry cover images (mirrors the page-icons bucket).
-- Files are keyed `{user_id}/{uuid}.{ext}`; public-read so the stored URL
-- renders without signing, owner-scoped for writes.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('covers', 'covers', true)
on conflict (id) do nothing;

create policy "Covers are publicly readable"
  on storage.objects for select
  using (bucket_id = 'covers');

create policy "Users can upload their own covers"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'covers'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can update their own covers"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'covers'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'covers'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete their own covers"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'covers'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
