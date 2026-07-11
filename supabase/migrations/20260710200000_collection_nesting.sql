-- Nested collections: collections become first-class Library containers that hold
-- books (books.collection_id) and other collections (collections.parent_collection_id)
-- to any depth. Both FKs are ON DELETE SET NULL so deleting a collection reparents
-- its books and child collections back to the top level rather than cascading a
-- destructive delete. A cycle-guard trigger rejects a parent chain that would make
-- a collection its own ancestor.

-- ---------------------------------------------------------------------------
-- Columns + indexes
-- ---------------------------------------------------------------------------

alter table public.books
  add column collection_id uuid references public.collections (id) on delete set null;

create index books_collection_id_idx on public.books (collection_id);

alter table public.collections
  add column parent_collection_id uuid references public.collections (id) on delete set null;

create index collections_parent_collection_id_idx
  on public.collections (parent_collection_id);

-- ---------------------------------------------------------------------------
-- Cycle guard
-- ---------------------------------------------------------------------------

-- Reject a parent_collection_id that would introduce a cycle (a collection being
-- its own ancestor). Walks up the chain from the proposed parent; if it reaches
-- the row being written, the assignment is illegal.
create or replace function public.check_collection_cycle()
returns trigger
language plpgsql
as $$
declare
  ancestor uuid := new.parent_collection_id;
begin
  while ancestor is not null loop
    if ancestor = new.id then
      raise exception 'collection % cannot be its own ancestor', new.id;
    end if;
    select parent_collection_id into ancestor
      from public.collections
      where id = ancestor;
  end loop;
  return new;
end;
$$;

create trigger check_collection_cycle_before_write
  before insert or update of parent_collection_id on public.collections
  for each row execute function public.check_collection_cycle();
