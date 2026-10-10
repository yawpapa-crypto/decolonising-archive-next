-- Public collections (/api/discovery/public-collections, /c/*, people pages) read public reading lists
-- as the anonymous role. anon had no SELECT privilege, so the query errored (503) before RLS applied.
-- RLS "reading_lists: read own or public" still limits anon to is_public = true rows.
-- Applied to production 2026-10-10 (verified: anon sees 0 of 252 private lists).
grant select on public.reading_lists to anon;
-- Down: revoke select on public.reading_lists from anon;
