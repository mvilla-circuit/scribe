-- Account-wide custom dictionary for the in-app spell checker.
--
-- profiles.dictionary: a jsonb array of words the writer added via "Add to
-- dictionary". These are treated as correctly spelled everywhere (across every
-- book and page), unlike per-document ignores. Defaults to an empty array so
-- existing users start with an empty personal dictionary.

alter table public.profiles
  add column dictionary jsonb not null default '[]'::jsonb;
