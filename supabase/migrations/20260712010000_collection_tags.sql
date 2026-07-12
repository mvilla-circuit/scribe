-- Allow tagging collections; case-insensitive unique tag names per user;
-- purge taggables when a collection is deleted.

-- Extend polymorphic target_type to include collections.
alter table public.taggables
  drop constraint if exists taggables_target_type_check;

alter table public.taggables
  add constraint taggables_target_type_check
  check (target_type in ('book', 'entry', 'collection'));

-- Case-insensitive uniqueness: drop the case-sensitive unique (user_id, name)
-- and replace with a functional unique index on lower(name).
alter table public.tags
  drop constraint if exists tags_user_id_name_key;

create unique index if not exists tags_user_id_lower_name_key
  on public.tags (user_id, lower(name));

-- Purge collection tag edges when the collection row is deleted.
create or replace function public.purge_collection_edges()
returns trigger
language plpgsql
as $$
begin
  delete from public.taggables
    where target_type = 'collection' and target_id = old.id;
  return old;
end;
$$;

drop trigger if exists purge_collection_edges_on_delete on public.collections;

create trigger purge_collection_edges_on_delete
  after delete on public.collections
  for each row execute function public.purge_collection_edges();
