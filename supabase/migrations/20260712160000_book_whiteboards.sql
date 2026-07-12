-- Book-owned whiteboards: a whiteboard belongs to either a collection or a
-- book (XOR). Book boards may nest under a document page as leaves; collection
-- boards stay flat under their collection.

alter table public.whiteboards
  add column book_id uuid references public.books (id) on delete cascade,
  add column parent_document_id uuid references public.documents (id) on delete cascade;

alter table public.whiteboards
  alter column collection_id drop not null;

alter table public.whiteboards
  add constraint whiteboards_owner_xor check (
    (collection_id is not null and book_id is null)
    or (collection_id is null and book_id is not null)
  );

alter table public.whiteboards
  add constraint whiteboards_parent_requires_book check (
    parent_document_id is null or book_id is not null
  );

create index whiteboards_book_id_idx on public.whiteboards (book_id);
create index whiteboards_book_parent_idx
  on public.whiteboards (book_id, parent_document_id);

-- Enforce that a nested whiteboard's parent document lives in the same book.
create or replace function public.whiteboards_parent_same_book()
returns trigger
language plpgsql
as $$
begin
  if new.parent_document_id is null then
    return new;
  end if;
  if new.book_id is null then
    raise exception 'parent_document_id requires book_id';
  end if;
  if not exists (
    select 1
    from public.documents d
    where d.id = new.parent_document_id
      and d.book_id = new.book_id
  ) then
    raise exception 'whiteboard parent must belong to the same book';
  end if;
  return new;
end;
$$;

create trigger whiteboards_parent_same_book
  before insert or update of book_id, parent_document_id
  on public.whiteboards
  for each row
  execute function public.whiteboards_parent_same_book();
