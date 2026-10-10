-- Run once in the Supabase SQL editor, then: POST /api/dev/visual-job?push=1&skipIndex=1
-- (or `node scripts/resolve-visuals.mjs --skip-index --push`).
-- The resolver writes with the service role; feeds read resolved, non-failed rows.
grant select, insert, update on public.visual_assets to service_role;
grant usage, select on sequence public.visual_assets_id_seq to service_role;
grant select on public.visual_assets to anon, authenticated;
notify pgrst, 'reload schema';
