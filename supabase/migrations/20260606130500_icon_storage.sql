-- Storage for user-uploaded page icons. Files are keyed under a per-user folder
-- (`{user_id}/{uuid}.{ext}`) so the RLS policies below can scope writes to the
-- owner by inspecting the first path segment. The bucket is public-read so the
-- stored public URL renders without signing.

insert into storage.buckets (id, name, public)
values ('page-icons', 'page-icons', true)
on conflict (id) do nothing;

create policy "Page icons are publicly readable"
  on storage.objects for select
  using (bucket_id = 'page-icons');

create policy "Users can upload their own page icons"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'page-icons'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can update their own page icons"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'page-icons'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'page-icons'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete their own page icons"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'page-icons'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
