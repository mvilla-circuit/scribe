-- Allow AVIF (and the other client-accepted image types) on the covers bucket.
-- Without an explicit allow-list entry, some Storage deployments reject AVIF
-- uploads and surface the opaque "No content provided" error.

update storage.buckets
set allowed_mime_types = array[
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/avif'
]
where id = 'covers';
