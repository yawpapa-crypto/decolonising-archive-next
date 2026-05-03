# Auth & roles — setup notes

This project uses Supabase Auth + a `profiles` table to model the role
hierarchy:

```
Public  →  Member  →  Curator  →  Admin
```

Public users browse the archive without an account. Members sign themselves
up. Curator and Admin are promoted manually by an Admin — never selectable
at sign-up.

## Required env vars

Already present in `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — anon / publishable key (safe in the browser)
- `SUPABASE_SERVICE_ROLE_KEY` — server-only key for privileged jobs (never ship to the browser)

## One-time install

The Supabase SSR helpers require an extra package:

```sh
npm install @supabase/ssr
```

## Apply the SQL migrations

Apply these migrations in order:

1. `supabase/migrations/0001_auth_and_research.sql` — auth profiles + research tables
2. `supabase/migrations/0002_workspace_and_curator_tools.sql` — curator editorial tables (dossiers, archive_notes, featured_records, themed_pathways, submitted_content)
3. `supabase/migrations/0002_reading_list_item_snapshots.sql` — reading list item snapshots
4. `supabase/migrations/0003_media_links_and_rights.sql` — `media_links` table + `rights_note` on `media_library`
5. `supabase/migrations/0004_media_library_table_and_links_rls.sql` — **creates the `media_library` table + `media-library` Storage bucket + tightens `media_links` RLS to curator-only**

> ⚠️ Migration 0004 is required — earlier migrations reference `media_library` but never created it. On a fresh database the curator media library page will 500 until 0004 is applied.

> Note: `0002_media.sql` (creates a separate `media` table + `archive-media` bucket) is from an earlier design and is **not** used by the current code. You can skip applying it; if it's already applied it's harmless — both buckets and tables can co-exist.

### Migration 1 creates:

- `archive_role` enum (`member` / `curator` / `admin`)
- `profiles` table (1:1 with `auth.users`, role defaults to `member`)
- `bookmarks`, `saved_searches`, `reading_lists`, `reading_list_items`
- `is_admin()` and `is_curator_or_admin()` helpers
- A trigger `on_auth_user_created` that auto-creates a Member profile row
- Row Level Security on every table

### Migration 2 creates:

- `archive_media_kind` enum (`image` / `pdf` / `audio` / `video`) and `archive_media_status` enum (`pending` / `ready` / `failed`)
- `media` table (id, kind, status, title, description, file_path, mime_type, size_bytes, uploaded_by)
- RLS so curators+admins can write, everyone can read `ready` rows
- The `archive-media` Storage bucket (public-read, 100 MB bucket cap)
- Storage policies: curator+ insert/update/delete; public read

### Apply

Either via the Supabase CLI:

```sh
supabase db push
```

…or by pasting each file in order into the Supabase dashboard SQL editor.

## Promote a user to Curator or Admin

Roles can only be changed by an Admin. From the Supabase SQL editor:

```sql
update public.profiles set role = 'curator' where email = 'someone@example.com';
update public.profiles set role = 'admin'   where email = 'you@example.com';
```

(Bootstrap your own admin row this way the first time. After that, you can
build a UI in `/admin` that calls the service-role client to update roles.)

## Enable OAuth providers in Supabase

In the Supabase dashboard → Authentication → Providers:

1. **Google** — enable, paste your OAuth client ID + secret from Google Cloud Console.
2. **GitHub** — enable, paste your OAuth app's client ID + secret from GitHub Developer Settings.

For both, set the authorized redirect URI to:

```
https://<your-project-ref>.supabase.co/auth/v1/callback
```

…and add your site URL (e.g. `http://localhost:3000` for dev,
`https://ared.design` for prod) under Authentication → URL Configuration →
Redirect URLs.

## Routes added

| Path                   | Who can see it                |
|------------------------|-------------------------------|
| `/signin`              | Public (anyone signed-out)    |
| `/signup`              | Public — creates Member only  |
| `/auth/callback`       | OAuth + magic-link return URL |
| `/auth/confirm`        | Email confirmation return URL |
| `/auth/signout` (POST) | Signs the user out            |
| `/workspace`           | Member, Curator, Admin        |
| `/curator`             | Curator, Admin                |
| `/admin`               | Admin (existing route)        |

## Permissions cheat-sheet

Use the helpers in `src/lib/auth.ts` from any server component or route handler:

```ts
import { requireMember, requireCurator, requireAdmin, hasRole } from "@/src/lib/auth";

await requireMember();   // redirect to /signin if not signed-in
await requireCurator();  // redirect to /workspace?denied=curator if under-privileged
await requireAdmin();    // redirect to /workspace?denied=admin if under-privileged
```

For conditional UI:

```ts
const profile = await getCurrentProfile();
if (hasRole(profile, "curator")) { /* show editorial controls */ }
```

## Why `proxy.ts` instead of `middleware.ts`?

Next.js 16 renamed Middleware to **Proxy**. The file at the project root
(`proxy.ts`) refreshes the Supabase session cookie on every request so server
components always see a fresh user.

## `/admin` is now Supabase-gated

The legacy shared-password `/admin-login` flow has been removed:

- `ADMIN_PASSWORD` env var is **no longer used** (safe to delete).
- `/admin-login` now permanently redirects to `/signin?next=/admin`.
- `/admin/*` requires a Supabase profile with `role = 'admin'`. Anonymous
  users get bounced to `/signin?next=/admin`; signed-in non-admins get
  bounced to `/workspace?denied=admin` with a notice.

Promote yourself to admin once via the Supabase SQL editor:

```sql
update public.profiles set role = 'admin' where email = 'you@example.com';
```

After that, sign in at `/signin` and visit `/admin`.

## Curator media library

Curators (and admins) can upload audio / video / PDF / image files at
`/curator/media`. Per-kind size caps:

| Kind  | Max size |
| ----- | -------- |
| Image | 10 MB    |
| PDF   | 20 MB    |
| Audio | 25 MB    |
| Video | 100 MB   |

Implementation notes:

- Single Storage bucket `archive-media` with one folder per kind (`image/`, `pdf/`, `audio/`, `video/`).
- Direct uploads via signed URLs — the file streams browser → Supabase Storage, never through the Next.js function. So 100 MB videos work without hitting any serverless body limit.
- The route at `/api/curator/media` (POST/PATCH/DELETE) is the only server-side surface; it requires the Curator role and re-validates kind/MIME/size on the server even though the UI also validates client-side.
- The bucket is public-read so the archive remains browsable without auth. Member/Public users see only `ready` media rows; curators+ also see `pending`/`failed` rows for triage.
