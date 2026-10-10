# Functional and security audit — 3 October 2026

## Scope and limits
Local development checks of public pages, search providers, catalogue, anonymous API boundaries, auth source code, dependency advisories, migrations, TypeScript, lint, and regression tests. This is a bounded audit, not a penetration test or a guarantee that every route works. No accounts were created, emails sent, or production database writes performed. Successful sign-in, signup email delivery, OAuth completion, onboarding saves and signed-in library saves require usable Supabase credentials and a test account. Production build and deployed database/RLS behavior were not verified.

## Fixes made
- Shortened Fieldnotes closing copy and made oversized video headings pale grey.
- Blocked backslash/control-character redirect destinations and reused shared validation for sign-in.
- Removed infrastructure details from sign-in credential errors.
- Unsave now reports database failures instead of false success.
- Capped Explore page input at 500.
- Authentication APIs explicitly return 503 when Supabase is unavailable.
- Signup handles missing auth configuration with a readable message.
- Fixed the Workbench lint error by using the editor chain directly.

## Checks
- Five regression tests pass: preference origin, redirect safety, Unsplash hotlinking/ixid/credits/use tracking and rejection of untrusted endpoints.
- TypeScript passes.
- Repository lint: zero errors, 126 warnings after fixing the Workbench declaration ordering.
- Rechecked missing-config onboarding response: 503, with a readable message.
- 52 migration files: zero version errors; lint zero errors, 17 historical warnings.
- Initial homepage request returned 500 during the scan; an independent repeat returned 200. Treat cold-start behavior as needing further observation.
- Supabase public URL and publishable key are not usable in the local process. Auth APIs originally returned 500; explicit 503 behavior was added.

| Route | Method | Observed initial status | Results |
|---|---|---:|---|
| `/home-next` | GET | 500 |  |
| `/home-next/help` | GET | 200 |  |
| `/home-next/fieldnotes` | GET | 200 |  |
| `/library?q=African%20philosophy` | GET | 200 |  |
| `/signin` | GET | 200 |  |
| `/signup` | GET | 200 |  |
| `/api/catalogue/stats` | GET | 200 | {'taxonomy': 13} |
| `/api/catalogue/records?limit=3` | GET | 200 | {'items': 3} |
| `/api/search/openlibrary?q=African%20philosophy&limit=3` | GET | 200 | {'docs': 3} |
| `/api/search/crossref?q=African%20philosophy&limit=3` | GET | 200 | {'results': 3} |
| `/api/discover?q=African%20philosophy&type=books` | GET | 200 | {'items': 36} |
| `/api/explore` | POST | 200 | {'items': 21} |
| `/api/onboarding` | GET | 500 |  |
| `/api/onboarding` | POST | 500 |  |
| `/api/for-you/save` | POST | 500 |  |
| `/api/admin/reports/weekly` | GET | 403 |  |
| `/auth/callback?next=//example.com` | GET | 200 |  |
| `/api/catalogue/record-image` | GET | 400 |  |

## Dependency security findings
npm audit --omit=dev reports 23 affected package entries: 2 critical, 14 high and 7 moderate. Transitive entries can represent the same underlying advisory. This is not evidence every issue is exploitable in this app. Do not approve as security-cleared.

Critical affected packages: Next.js and MapLibre GL. Next has a same-major upgrade available; MapLibre remediation reported by npm requires a major upgrade. Tiptap also has high-severity advisories. Dependency upgrades were not automatically applied because they require compatibility and map/editor regression verification.

- `@payloadcms/db-postgres`: moderate; fix availability: `False`.
- `@payloadcms/next`: high; fix availability: `False`.
- `@tiptap/core`: high; fix availability: `{'name': '@tiptap/core', 'version': '3.31.4', 'isSemVerMajor': False}`.
  - [Tiptap: mergeAttributes() turns an own __proto__ key into inherited executable DOM attributes](https://github.com/advisories/GHSA-cp6q-959q-f8rh)
  - [Tiptap: Quadratic ReDoS in block and inline Markdown attribute parsing](https://github.com/advisories/GHSA-j95f-988m-3j2f)
- `@tiptap/starter-kit`: moderate; fix availability: `True`.
- `maplibre-gl`: critical; fix availability: `{'name': 'maplibre-gl', 'version': '6.11.2', 'isSemVerMajor': True}`.
  - [MapLibre GL JS: XSS Sanitizer Bypass in DOM.sanitize() via Live NamedNodeMap Removal Skip](https://github.com/advisories/GHSA-jrc7-96c5-q579)
- `next`: critical; fix availability: `True`.
  - [Next.js: Middleware / Proxy bypass in App Router applications using Turbopack and single locale](https://github.com/advisories/GHSA-6gpp-xcg3-4w24)
  - [Next.js: Denial of Service in App Router using Server Actions](https://github.com/advisories/GHSA-m99w-x7hq-7vfj)
  - [Next.js: Server-Side Request Forgery in Server Actions on custom servers](https://github.com/advisories/GHSA-89xv-2m56-2m9x)
  - [Next.js: Cache confusion of response bodies for requests with bodies](https://github.com/advisories/GHSA-68g3-v927-f742)
  - [Next.js: Cache confusion of response bodies for requests with bodies containing invalid UTF-8 byte sequences](https://github.com/advisories/GHSA-4633-3j49-mh5q)
  - [Next.js: Unbounded Server Action payload in Edge runtime](https://github.com/advisories/GHSA-4c39-4ccg-62r3)
  - [Next.js: Server-Side Request Forgery in rewrites via attacker-controlled destination hostname](https://github.com/advisories/GHSA-p9j2-gv94-2wf4)
  - [Next.js: Denial of Service in the Image Optimization API using SVGs](https://github.com/advisories/GHSA-q8wf-6r8g-63ch)
  - [Next.js: Unauthenticated disclosure of internal Server Function endpoints](https://github.com/advisories/GHSA-955p-x3mx-jcvp)
  - [Next.js: Unauthenticated Remote Code Execution on windows-hosted servers](https://github.com/advisories/GHSA-p293-qw3h-jr36)
  - [Next.js: Unauthenticated Remote Code Execution in Image Optimization API when AVIF files are used](https://github.com/advisories/GHSA-2xp9-vwfh-vxw4)
  - [Next.js: Remote Code Execution in next/og ImageResponse](https://github.com/advisories/GHSA-vcvr-r3jv-pc5j)
- `payload`: high; fix availability: `True`.
  - [Payload CMS default account-unlock access allows authenticated users to reset other accounts' lockouts](https://github.com/advisories/GHSA-jg8r-5jh2-v2xj)

## Security source review
Admin report endpoint rejected an anonymous request (403). Catalogue image lookup without an ID returned 400. Onboarding and save operations constrain writes to the authenticated user; live RLS enforcement remains unverified. CSP, frame protection and nosniff headers are configured; CSP still permits unsafe-inline and unsafe-eval. Tightening script policy requires nonce/animation compatibility testing. Unsplash credentials remain server-side and download tracking validates the endpoint host/path.

## Remaining approval blockers
1. Configure Supabase and test real account creation, confirmation, password recovery, OAuth, onboarding and persistence.
2. Remediate dependency advisories and verify a production build.
3. Run authenticated authorization/RLS checks and broader provider failure and pagination tests.
4. Review remaining lint warnings and observe homepage cold starts.

## Follow-up: local account connection and Research Bench retirement

- Active `.env.local` had empty Supabase URL and key settings. Reused the existing project settings from `.env-PY.local` without printing values. Auth health responds HTTP 200. The anonymous profiles query correctly returns permission denied; it does not expose profile data.
- The backed-up service key is rejected as unregistered. Privileged admin functionality is **not verified** and needs a current server-only service key for the same project.
- `/signin` responds 200; `/api/onboarding` now returns the expected anonymous 401 instead of a configuration failure. Real account login and app synchronization still require a user session; neither is claimed tested.
- Research Bench navigation entries removed. Proxy redirects `/my/workbench` and descendants to the new library and returns 410 for `/api/workbench` and descendants before old handlers run. Historical data and source code remain recoverable; no database tables or user research records were deleted.
- Homepage CTA reads “Download our app”. Fieldnotes includes a staged SVG pen drawing of noticing, recording, and gathering, with replay and reduced-motion support.
- Warning cleanup remains incomplete. No lint rule was disabled to obtain a clean result.
