-- Optional full-width banner shown directly below a page's breadcrumbs. A null
-- banner_color means "no banner"; a palette value turns it on. banner_text is a
-- single optional caption line rendered inside the band.

alter table public.documents
  add column banner_color text,
  add column banner_text  text;
