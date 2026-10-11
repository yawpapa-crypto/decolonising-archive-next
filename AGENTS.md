<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Cloud Agent

The dev server is `npm run dev` on port 3001. The package script already binds `0.0.0.0`.

`Navbar` calls `getCurrentProfile`, which creates a Supabase client at request time. `/` returns 500 unless `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are set. Placeholders `http://127.0.0.1:54321` and `local-dev-publishable-key` render the public shell; auth calls fail open. Without `SUPABASE_SERVICE_ROLE_KEY`, `GET /api/site-content` returns 500 and the catalogue uses its default copy.

The catalogue UI is `/assets/js/app.js`, loaded with a native `defer` script in `ArchiveAppPage`. `next/script` `afterInteractive` only preloads that file in this Next.js version, so `#app` stays empty.
