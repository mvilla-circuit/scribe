-- Scribe initial schema: profiles, folders, books, documents, fonts
-- All user-owned tables carry user_id so RLS policies stay simple and index-friendly.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  theme text not null default 'system' check (theme in ('light', 'dark', 'system')),
  default_font text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  parent_folder_id uuid references public.folders (id) on delete cascade,
  name text not null,
  position numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.books (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  folder_id uuid references public.folders (id) on delete set null,
  title text not null default 'Untitled',
  subtitle text,
  cover_url text,
  icon text,
  theme jsonb not null default '{}'::jsonb,
  position numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  book_id uuid not null references public.books (id) on delete cascade,
  parent_document_id uuid references public.documents (id) on delete cascade,
  title text not null default 'Untitled',
  icon text,
  is_title_page boolean not null default false,
  position numeric not null default 0,
  content jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.fonts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  family text not null,
  source_url text,
  weights text[] not null default '{}',
  cached_path text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index folders_user_id_idx on public.folders (user_id);
create index folders_parent_folder_id_idx on public.folders (parent_folder_id);

create index books_user_id_idx on public.books (user_id);
create index books_folder_id_idx on public.books (folder_id);

create index documents_user_id_idx on public.documents (user_id);
create index documents_book_id_idx on public.documents (book_id);
create index documents_parent_document_id_idx on public.documents (parent_document_id);

create index fonts_user_id_idx on public.fonts (user_id);

-- ---------------------------------------------------------------------------
-- Functions + triggers
-- ---------------------------------------------------------------------------

-- Create a profile row automatically when a new auth user is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep updated_at fresh on every UPDATE.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger set_folders_updated_at
  before update on public.folders
  for each row execute function public.set_updated_at();

create trigger set_books_updated_at
  before update on public.books
  for each row execute function public.set_updated_at();

create trigger set_documents_updated_at
  before update on public.documents
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.folders enable row level security;
alter table public.books enable row level security;
alter table public.documents enable row level security;
alter table public.fonts enable row level security;

-- profiles: ownership is the row id itself (= auth user id).
create policy "Profiles are viewable by owner"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Profiles are insertable by owner"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Profiles are updatable by owner"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Profiles are deletable by owner"
  on public.profiles for delete
  using (auth.uid() = id);

-- folders
create policy "Folders are viewable by owner"
  on public.folders for select
  using (auth.uid() = user_id);

create policy "Folders are insertable by owner"
  on public.folders for insert
  with check (auth.uid() = user_id);

create policy "Folders are updatable by owner"
  on public.folders for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Folders are deletable by owner"
  on public.folders for delete
  using (auth.uid() = user_id);

-- books
create policy "Books are viewable by owner"
  on public.books for select
  using (auth.uid() = user_id);

create policy "Books are insertable by owner"
  on public.books for insert
  with check (auth.uid() = user_id);

create policy "Books are updatable by owner"
  on public.books for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Books are deletable by owner"
  on public.books for delete
  using (auth.uid() = user_id);

-- documents
create policy "Documents are viewable by owner"
  on public.documents for select
  using (auth.uid() = user_id);

create policy "Documents are insertable by owner"
  on public.documents for insert
  with check (auth.uid() = user_id);

create policy "Documents are updatable by owner"
  on public.documents for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Documents are deletable by owner"
  on public.documents for delete
  using (auth.uid() = user_id);

-- fonts
create policy "Fonts are viewable by owner"
  on public.fonts for select
  using (auth.uid() = user_id);

create policy "Fonts are insertable by owner"
  on public.fonts for insert
  with check (auth.uid() = user_id);

create policy "Fonts are updatable by owner"
  on public.fonts for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Fonts are deletable by owner"
  on public.fonts for delete
  using (auth.uid() = user_id);
