# ARED — website build, processes and operational handover

Prepared 5 October 2026, Australia/Melbourne.

## 1. What this document covers

This is a technical and product handover for the existing ARED website and its redesign. It records the development process visible in the repository and this project’s working history, the software and external services involved, the principal data flows, and the remaining acceptance work. It is not a claim that every historical feature is deployed or that every installed dependency is actively used. Source files, dated audits and generated artifacts are the evidence; older audit results describe their date, not a current security guarantee.

The project is `decolonising-archive-next-main`. The related Field application is maintained separately in the sibling `APP_DA` project. The website’s public identity is ARED / Decolonising Archive, with ared.design as the intended public domain. Most redesign development and testing has used localhost:3000.

No application code, accounts or deployment settings were changed to prepare this document. No secrets are included.

## 2. Product purpose and principles

ARED brings archival records, photographs, material culture, literature and curatorial knowledge into a common discovery interface. Visitors can browse and search without mandatory onboarding. Members can save records, organise collections, follow curators and collections, and use their library with Field.

The governing principles developed through the redesign were:

- Preserve provenance, original institutional links, rights and context alongside images.
- Preserve existing member identities and ownership rather than creating a new account system for the redesign.
- Mix local archival material and external providers without passing decorative fallback photography off as an archival record.
- Use explainable recommendation evidence and distinguish editorial curation from personalisation.
- Keep public browsing open. An earlier proposal to force signup after the first search was explicitly superseded; saves and account features still require authentication.
- Retire the Research Bench experience without silently destroying historical research data.
- Make the interface calm, image-led and responsive, with motion that respects reduced-motion preferences.

## 3. How the website was developed

### Stage A — existing application and audit

The starting point was a Next.js application with catalogue, search, library, admin, authentication and substantial Research Bench functionality. Development began by inspecting existing routes, schemas, provider adapters and account ownership. The redesign was built alongside the old interface under `/home-next`, making it possible to reuse working services and compare the new experience without rebuilding the backend from scratch.

Audits recorded actual failures separately from proposed improvements. Important issues included blank environment overrides, account onboarding gates that incorrectly blocked legacy users, unreliable image fallbacks, stale collection deletion state, unsafe redirect inputs and private navigation caching.

### Stage B — visual direction and iterative redesign

Cosmos references established the editorial layout: restrained navigation, large image fields, soft surfaces, compact controls and collection-led browsing. Apple references informed centred film presentation, generous product spacing, rounded media surfaces, understated transitions and frosted navigation. The user subsequently asked to reduce the Apple resemblance and restore more of the Cosmos character.

The design was refined through repeated screenshot comparison and direct browser inspection: typography tracking, image density, hero spacing, CTA copy, film centring, mobile menus, footer image removal and separation between Suggested headings and cards.

The actual font setup in `app/home-next/font.ts` is Fraunces for editorial display text and Inter for interface text. Fraunces is an open substitute for the proprietary reference typeface, not the exact Cosmos font. Page-specific sans-serif treatments were also requested for product messaging. The code and stylesheet cascade determine each rendered section.

### Stage C — discovery and resilient media

The homepage collage, Explore and For You were connected to shared image pools and provider adapters. Local imagery provides reliable fallback coverage; external archive imagery supplies variety and provenance. Europeana was integrated into query-led discovery rather than merely a fixed homepage image query. Deduplication was refined so two different archival objects with identical titles are not incorrectly collapsed.

Image delivery was progressively separated into catalogue identity, preview selection, caching/proxying, visual eligibility and frontend fallback. Broken or unavailable images should produce a controlled fallback rather than a broken-image icon or false archival substitution.

### Stage D — accounts, collections and Following

Existing Supabase identities, bookmarks and reading lists were retained. Following was implemented around explicit follows and public curatorial activity. Collection cleanup and deletion handling were aligned with the Field bridge so stale offline state would not recreate deleted collections.

The new interface added responsive discovery controls, record details, save actions, public collection/profile surfaces and optional onboarding. A later loader rollout replaced plain loading copy with a CSS-drawn Sankofa mark. Following had its own nested Suspense fallback, so it needed an explicit change even after the parent route loader was updated.

### Stage E — recommendation and source quality

A native, explainable recommendation engine was developed using record metadata, deliberate user preferences and bounded interaction history. Provider candidates are filtered for access and cultural/public eligibility before delivery. Recommendations explain real shared evidence rather than inventing reasons. Gorse is an optional separate integration; its presence in the repository does not establish that a hosted service is running.

### Stage F — films and product storytelling

Short desktop/mobile motion exports and longer narrated drafts were produced from the real interface and supplied ElevenLabs narration. Later launch-film iterations use a timeline-driven Python rendering project with audio processing and frame QA. These are several distinct generations of film, not interchangeable final masters.

### Stage G — knowledge, teaching and contributions

The latest work introduced explicit knowledge graph modelling, rich collection writing, teaching-copy APIs, citation controls, moderated proposals and archive-quality reporting. These features have source and migration work in place, but the last recorded live smoke run failed after three passing checks. They must be treated as unfinished acceptance work; see section 17.

## 4. Application architecture

```text
Visitor / member browser
  ├─ Next.js pages, server components and client interactions
  ├─ public search / discovery APIs
  │    ├─ local catalogue and visual inventory
  │    └─ external archive and scholarly providers
  └─ authenticated APIs / server actions
       ├─ Supabase Auth and owner-scoped PostgreSQL data
       ├─ public curatorial projections and moderation
       └─ shared account/library bridge to Field

Administrative surfaces
  ├─ website /admin tools and reports
  ├─ archive quality and proposal moderation
  └─ Payload /cms configuration for Pages and Users
```

Next.js App Router provides routing, server rendering, streaming, route handlers and Server Actions. React client components manage interactive search, record panels, controls and account states. Shared server modules keep provider credentials and privileged data access out of browser bundles.

Important directories:

| Location | Responsibility |
|---|---|
| `app/home-next/` | Redesigned homepage, Explore, For You, Following, Fieldnotes, account-facing UI |
| `app/following/` | Shared Following shell, feed, suggestions and presentation |
| `app/api/` | Search, discovery, account, collections, recommendations, admin and knowledge endpoints |
| `app/records/` | Canonical record pages and related research presentation |
| `app/curated-collections/` | Public collection presentation; route conflict currently requires attention |
| `app/(admin)/admin/` | Administrative pages, quality reporting and moderation |
| `lib/home/` | Image pools, provider normalization and home discovery |
| `lib/search/` | Search adapters, ranking and external request helpers |
| `lib/recommendations/` | Native recommendation engine and client/server coordination |
| `lib/knowledge/`, `lib/kgo/` | Graph, collection editions, citation/structured export, quality |
| `lib/catalogue/`, `data/catalogue/` | Catalogue storage, schema, parsing, display and evidence rules |
| `src/lib/` | Shared authentication, Supabase clients and infrastructure helpers |
| `supabase/migrations/` | Versioned database schema, policies, functions and triggers |
| `tests/`, `scripts/`, `artifacts/` | Regression tests, operational tools and saved verification evidence |
| `docs/audits/`, `docs/film/` | Dated findings and film production resources |

## 5. Frameworks, libraries and tools

The complete declared dependency list is included in Appendix A. Declaration is evidence of installation intent, not proof of live usage on every page.

| Technology | Role / boundary |
|---|---|
| Next.js 16.2.6 range, React 19.2.4, TypeScript 5 range | Application framework, UI and static typing |
| Tailwind CSS 4 and custom CSS | Utilities plus bespoke editorial layouts, animation and responsive rules |
| Supabase JS and SSR | Auth, browser/server sessions, database access and RLS-backed persistence |
| Payload CMS 3.84.1 range | Configured `/cms`, PostgreSQL adapter, Pages and Users collections; separate from the member account model |
| PostgreSQL / Supabase | Canonical website account and library persistence |
| Vercel integration packages | Analytics, Speed Insights and PostgreSQL integration code; deployment enablement must be checked separately |
| Tiptap / ProseMirror, Payload Lexical | Rich-text editing infrastructure, including historical features |
| Framer Motion / Motion / GSAP | Installed motion tools; much of the newer loading and line drawing uses plain CSS/SVG |
| MapLibre, react-map-gl, deck.gl, d3-geo, topojson | Map and geographic visualisation infrastructure |
| React Flow, dagre | Node/relationship visualisation infrastructure |
| dnd-kit | Drag-and-drop and sortable interactions |
| TanStack Table, Recharts | Tabular and chart interfaces |
| GraphQL | Structured graph query surface |
| docx, PDFKit, fontkit, html-to-image | Document/image export infrastructure |
| Lucide, clsx, tailwind-merge | Icons and styling utilities |
| ESLint, TypeScript, Node test runner | Source checks and focused automated regressions |
| Python, Pillow, FFmpeg | Film composition, encoding, audio and image QA; external toolchain rather than npm runtime dependencies |
| Codex and browser inspection | Implementation assistance, repository audits, direct UI review and test orchestration |

The repository instruction in AGENTS.md requires reading the installed Next.js documentation before modifying framework-sensitive code. This matters because the installed version’s behaviour takes precedence over older examples.

## 6. External services and content providers

| Service/provider | Purpose and operating note |
|---|---|
| Supabase | Authentication, database, ownership policies and shared website identity |
| Field / APP_DA | Separate app/backend with verified Supabase subject mapping and legacy compatibility; contains a linked Neon identity layer described in auth audits |
| Payload / PostgreSQL | CMS configuration through `DATABASE_URL`; do not assume this is a separate provisioned database without checking deployment |
| Europeana | Query-led archival previews and institutional provenance; server-only key; timeout and cached requests |
| Wikimedia Commons / Wikidata | Images and structured source metadata; preserve canonical identity and rights |
| Cleveland Museum of Art | Primary institutional object links and open-access material; original institution should be the source destination |
| Metropolitan Museum of Art | Museum discovery adapter and imagery where eligible |
| Smithsonian | Institution/collection search and record resolution |
| Library of Congress / SRU | Archival and bibliographic discovery |
| African Online Digital Library | African archival collection/search integration |
| Open Library | Books and bibliographic discovery |
| Crossref | Scholarly metadata and DOI discovery |
| OpenAlex | Scholarly discovery and metadata |
| Semantic Scholar | Scholarly search with rate-limit handling |
| Unsplash | Supplementary photography; provider credit/use rules and download tracking handled separately from archive provenance |
| Brevo | Email/list integration, including Android tester configuration; actual list/delivery state is environment-dependent |
| Resend | Email integration code/configuration; an API key alone does not certify delivery |
| Google / GitHub OAuth | Configured Supabase login providers in the dated auth audit; completed callbacks still require real acceptance |
| Apple login | Reported disabled in the provider audit; do not infer support from Apple-inspired design |
| Gorse | Optional open-source recommender integration with native fallback; not evidence of a running hosted service |
| ElevenLabs | User-supplied narration used in film production; not established as a live website narration API |

Cosmos and Apple are design references, not runtime backend services. Screenshots supplied for visual guidance are not production source metadata.

## 7. Catalogue and search process

1. Load eligible local catalogue records and cached public candidates.
2. Preserve the visitor’s query and selected context; do not silently append a geographic assumption.
3. Query appropriate external providers through server adapters with bounded pagination/timeouts.
4. Normalize varied responses into the shared discovery item shape.
5. Retain title, creator, date, institution, provider, canonical source, preview and rights when supplied. Missing metadata stays missing.
6. Deduplicate using canonical identifiers, source URLs and media identity; title alone is insufficient for distinct archive objects.
7. Apply public/cultural eligibility and quality checks.
8. Rank/interleave results and render the shared image-led interface.
9. Open the redesigned detail experience; original source actions should lead to the institution rather than an obsolete internal intermediary.
10. Continue pagination without repeating already delivered records; report genuine exhaustion or unavailable sources honestly.

An HTTP 200 from a search endpoint does not prove all providers responded or every image loaded. Provider-level results and sampled image checks are recorded in the Europeana audit and artifacts.

## 8. Image delivery and failure handling

Local assets, catalogue record images, provider previews and decorative fallbacks have different purposes. The image pipeline must retain that distinction.

Shared helpers select eligible visuals, use cached/proxied URLs where permitted, and fall back when remote files fail. Europeana previews are not presented as guaranteed original-resolution downloads. Unknown rights are not converted into an open licence. Decorative homepage Europeana candidates require explicit open rights.

The visual index and resolver support repeatable image selection, with a configured scheduled resolver endpoint. Cache freshness, provider availability and licence changes remain operational concerns. Refresh inventory after ingestion changes and verify primary links and thumbnails together. Never solve a broken record thumbnail by attaching an unrelated photograph without labelling the substitution.

## 9. Accounts, library and Field continuity

The core ownership chain is:

```text
Supabase auth.users UUID
  → profiles.id
  → bookmarks.user_id
  → reading_lists.user_id
  → reading_list_items.reading_list_id
  → curatorial_follows and public activity
```

Authentication uses existing Supabase browser/server clients, SSR cookies, Server Actions and PKCE callbacks. Missing new onboarding fields do not make an existing member a new user. Personalisation is optional. Sign-in and recovery retain validated return destinations.

The auth repair process restored existing local project credentials without creating or rotating a new identity system. It removed an unconfirmed signup admin write, repaired session refresh, replaced a timeout race with bounded provider fetching, and stopped the service worker caching private navigation HTML.

Field sync reuses canonical identity and record/list identifiers. Pull failures must not appear as an empty successful library. Push failures must not return false success. Deletion ownership and tombstones prevent stale offline collection resurrection. The precise app bridge implementation is in APP_DA, so a website-only deployment is not evidence that the installed app has the matching repair.

Confirmed automated evidence includes disposable-user password login, stable identity, website saves, onboarding, Field pull/push round trip, refresh, unsave, collection deletion, recovery token reuse protection and recovered-password continuity. Human legacy account login, inbox delivery, completed OAuth and physical-device acceptance remain separate checks.

## 10. Following and recommendations

Following is based on explicit relationships and public curatorial activity. Private collections, private writing and private analytics must not leak through suggestion or activity projections. Public activity should disappear when its underlying content is no longer public.

For You uses a native metadata model with explicit interests and bounded activity evidence. The documented engine supports cold-start editorial discovery, source/type diversity, related records, feedback and defensible explanation labels. It does not establish a trained semantic/vector model or guaranteed geographic balance.

Gorse has optional Docker configuration and a guarded integration. Its suggestions name candidate event IDs; local access checks remain authoritative. If absent, slow or malformed, the native path continues. A deployment operator must separately determine whether it is enabled and hosted.

The latest knowledge layer adds shared maker, period, concept, source, place and collection relationships to recommendation evidence. Only verified public records and reviewed public assertions should contribute public graph edges.

## 11. Collections, teaching and contributions

Existing collections remain canonical `reading_lists` and `reading_list_items`. New `collection_editions` hold introduction, curatorial rationale, teaching prompts, sections, annotations and explicit relationships. Revision checks prevent an old editor state overwriting newer writing. Annotation/relationship references are restricted to collection members.

A teaching-copy operation is designed to create a private copy with canonical member records and writing, retaining derivation from the source. Publication exposes collection writing deliberately; private personal saved notes are not automatically published.

Contribution proposals cover records, sources, corrections, relationships and missing attribution. Each stores proposer, evidence, moderation state and revision snapshots. Admin review controls acceptance. An accepted relationship can enter the public graph; other accepted proposals still require editorial application to the catalogue. Acceptance is not a licence to fabricate provenance or silently overwrite historical metadata.

These newer flows are not yet fully accepted: the latest smoke evidence passed owner editing, stale-revision protection and private-writing isolation, then failed publication routing.

## 12. Citation, graph and discovery architecture

Canonical record URLs, source objects and related entity routes make records citeable and interconnected. Citation controls support APA, Chicago and MLA where metadata permits; BibTeX and RIS downloads reuse existing export infrastructure. Other existing KGO formats include CSL, CFF, EndNote and Zotero-oriented output.

Structured interfaces include graph JSON, GraphQL, RDF/Turtle and record JSON-LD. Metadata completeness determines citation quality. Unknown creators/dates must remain explicit rather than invented. Collection exports should include only authorized canonical public records.

SEO work includes public page architecture, metadata, image discovery, primary-source attribution and crawler-readable relationships. Public structured data must describe real relationships. Private account/collection material must remain excluded. Image SEO, AI-search access and model-training permission are separate policy decisions. Historical requests for IndexNow or search reporting are not proof they were implemented; check configuration and the discovery audit before claiming deployment.

## 13. Administration and quality control

The website admin experience is role-protected. Payload’s `/cms` is separately configured with Pages and Users; distinguish CMS users from the Supabase member identity chain.

The new archive-quality dashboard reviews missing/broken visuals, weak provenance, absent dates, possible duplicate titles/images, unresolved references, missing descriptions/citations, source health and records with no recorded discovery exposure. Shared image URLs are review candidates, not proof of duplicate objects. Lack of recorded exposure is not proof a record has never been viewed.

External health checks use bounded HEAD requests and public-address validation with DNS resolution pinning. Results are a last check, not a permanent availability guarantee. Exposure tracking records aggregate record visibility rather than private note bodies or credential data, and respects the relevant analytics opt-out.

Moderation has a dedicated proposal queue and revision history. Scheduled report endpoints are present; production execution requires deployment and proper cron authentication.

## 14. Motion, accessibility and responsive behaviour

The redesign combines CSS/SVG drawing, image drift, transitions, responsive image fields and interactive discovery controls. The reusable LineLoader draws a Sankofa heart with a pure-CSS loop, uses a live status label and supports a still reduced-motion representation. Parent route loading and nested Suspense loading are separate boundaries; both must use the intended component.

Dark/light display controls, keyboard focus, labelled forms, mobile navigation and reduced-motion behaviour were recurring requirements. Verify them per route; one correct page does not certify the whole site. Avoid motion obstructing search, downloads, reading or account actions. Mobile auth layouts were inspected at 375, 390 and 430 pixel widths in the dated auth audit.

## 15. Film production process

There are two principal documented production generations:

1. `artifacts/ared-films/`: 15-second silent desktop and mobile pieces, plus 54-second narrated desktop/mobile review drafts. These use real anonymous browser captures, H.264/yuv420p, 30 fps output, and AAC narration where applicable. Captures were sampled at approximately ten frames per second; 30 fps encoding does not make them native 30 fps footage. The supplied 52.506-second narration was preserved at normal speed.
2. `docs/film/project/` and `docs/film/v2/`: a timeline-driven launch-film workflow, with square, desktop and mobile exports and 60 fps masters. The documented square launch master is 57 seconds. `timeline.py`, `render.py`, `audio.py` and `qa.py` coordinate scene timing, graphics, narration/music/SFX, loudness and frame checks.

Do not publish a draft as proof of authenticated product behaviour. Earlier films show an anonymous account prompt, not a completed save. Source captures, timestamps, narration and fonts are required for reproducible renders. Some scripts refer to the original narration in Downloads, so a portable production package must relocate/licence those inputs and update paths.

## 16. Local operation, configuration and release process

### Development

Use the lockfile and the project’s existing package manager. Inspect Node compatibility and dependency installation settings before reinstalling. The package declares legacy peer dependency handling.

```sh
npm run dev
npm run lint
npx tsc --noEmit
npm run test:safety
npm run db:migrations:check
npm run db:migrations:lint
npm run build
npm run start
```

`dev` and `build` currently use webpack explicitly; `dev:turbo` is available separately. `dev:reset` kills the process on port 3000 and removes development cache, so it is a recovery command, not a routine check. Inspect scripts before running smoke commands because some create disposable fixtures or require a linked backend.

### Configuration

Appendix B lists environment variable names referenced in the inspected source; no values are included. Public Supabase URL/publishable key are browser configuration. Service-role keys, provider keys, email keys, Payload secret, cron secret and database connection strings belong on the server only. Review environment precedence: blank production overrides previously masked working local Supabase settings.

Payload currently has schema `push: true` in its PostgreSQL configuration. Review the production migration strategy before enabling automatic schema changes against a live database.

### Database changes

Read migrations in order, check duplicate versions, review RLS/ownership, and test with isolated fixtures. Applied schema and migration-history state must agree. Do not rerun non-idempotent creation migrations blindly. Preserve backups and reversible plans before destructive member-data changes.

### Deployment

A successful local production build does not establish a deployment. Configure the intended environment, OAuth/recovery redirects, provider credentials and backend connectivity on the actual host; then test a production-like build and the deployed URLs. Never copy server secrets into client bundles or documentation.

`vercel.json` declares daily reports at `0 9 * * *`, weekly reports at `0 9 * * 1`, and visual resolution at `30 3 * * *`. These are platform cron schedules, not Melbourne local-time promises. Confirm the scheduler’s timezone and deployed authorization.

### Release acceptance

Verify public browsing/search/provider failure, primary-source links, image loading, result deduplication, mobile navigation, accessibility, sign-in/out, recovery, OAuth, save/unsave, collections, publishing/privacy, Following and actual app sync. Check an existing legacy account as well as a disposable new one. Review current dependency advisories afresh; do not reuse the old vulnerability counts as a current scan.

## 17. What is complete, partial or pending

| Area | Evidence and current limit |
|---|---|
| Redesign and discovery | Implemented, with dated browser/API checks; not a fresh full-site certification |
| Europeana | Adapter, shared pool, provenance and sampled live image checks documented; upstream files can change |
| Following loader | Nested plain-text fallback replaced with animated LineLoader; focused lint had zero errors and two existing unused-variable warnings |
| Account continuity | Live disposable-account and Field service round-trip evidence; genuine inbox/OAuth/device/deployed acceptance remains pending |
| Native recommendations | Engine/API/privacy and responsive checks documented; real-world relevance and long-term outcomes not measured |
| Knowledge graph / richer collections / proposals / quality | Source and migrations present; latest integrated smoke run is incomplete |
| Public collection publication | Recorded smoke failure; config still redirects `/curated-collections/:id` to `/home-next/c/:id`. Verify target and repair routing before approval |
| Knowledge smoke cleanup | Latest artifact says two disposable fixtures removed; three checks passed, overall `passed: false` |
| Migration bookkeeping | Earlier work identified the account-deletion guard migration as needing history reconciliation; inspect linked state before further application |
| Security | Targeted guards and privacy tests exist; no comprehensive penetration-test or blanket release-ready claim |
| Films | Multiple review and master exports exist; consult each README for exact duration, capture and acceptance limits |
| Research Bench | Retired from navigation/active route access in documented work; historical files/tables retained |

The outstanding knowledge work should resume by fixing the public collection route, rerunning the live smoke suite, checking Following updates for collection writing, reconciling migrations, and completing build/type/lint/browser verification. It should not be labelled finished on the basis of source files alone.

## 18. Recommended maintenance process

For each change: identify the owning data model and UI, inspect relevant installed framework docs, implement the smallest coherent change, test failure and ownership boundaries, inspect desktop/mobile output, save evidence, and update the audit with remaining limits.

For new sources: verify API/authentication and terms, implement a bounded server adapter, normalize provenance/rights, test empty/error/rate-limited responses, deduplicate canonical identity, sample images, and check public display/source links.

For archive ingestion: validate schema and evidence, preserve stable IDs, check rights/cultural restrictions, resolve media, refresh visual inventory, inspect duplicates/orphans, and review discoverability before publication.

For member-data changes: use authenticated ownership, preserve canonical IDs, handle errors explicitly, account for offline replay/tombstones, test A/B account isolation, and verify Field parity.

For handover: supply repository/lockfile, private configuration through a secure channel, migration state, deployment ownership, provider accounts, app bridge documentation, film source assets and unresolved acceptance items. Never put credentials into this document.

## 19. Evidence index

- [Functional/security audit](../audits/2026-10-03-functional-security.md)
- [Authentication and legacy continuity](../audits/2026-10-04-auth-continuity.md)
- [Discovery and app sync](../audits/2026-10-04-discovery-and-sync.md)
- [Following architecture](../audits/2026-10-04-following-architecture.md)
- [Recommendation engine](../audits/2026-10-04-recommendation-engine.md)
- [Europeana integration](../audits/2026-10-04-europeana.md)
- [Explore/source fixes](../audits/2026-10-04-explore-source-fixes.md)
- [Visual discovery](../visual-discovery.md)
- [Earlier film exports](../../artifacts/ared-films/README.md)
- [Launch-film project](../film/project/README.md)
- [Optional Gorse setup](../../infra/gorse/README.md)
- [Knowledge live smoke result](../../artifacts/knowledge/live-smoke.json)

The appendices below are generated from repository files at documentation time, making the dependency and endpoint inventory more complete than a narrative list alone.

## Appendix A — complete declared package inventory

Versions are package.json declarations, not resolved lockfile versions.

### dependencies

| Package | Declared version |
|---|---|
| `@deck.gl/aggregation-layers` | `^9.3.2` |
| `@deck.gl/core` | `^9.3.2` |
| `@deck.gl/layers` | `^9.3.2` |
| `@deck.gl/mapbox` | `^9.3.2` |
| `@deck.gl/react` | `^9.3.2` |
| `@dnd-kit/core` | `^6.3.1` |
| `@dnd-kit/sortable` | `^10.0.0` |
| `@dnd-kit/utilities` | `^3.2.2` |
| `@payloadcms/db-postgres` | `^3.84.1` |
| `@payloadcms/next` | `^3.84.1` |
| `@payloadcms/richtext-lexical` | `^3.84.1` |
| `@supabase/ssr` | `^0.10.2` |
| `@supabase/supabase-js` | `^2.104.0` |
| `@tanstack/react-table` | `^8.21.3` |
| `@tiptap/core` | `3.23.4` |
| `@tiptap/extension-character-count` | `3.23.4` |
| `@tiptap/extension-color` | `3.23.4` |
| `@tiptap/extension-highlight` | `3.23.4` |
| `@tiptap/extension-image` | `3.23.4` |
| `@tiptap/extension-link` | `3.23.4` |
| `@tiptap/extension-list` | `^3.23.4` |
| `@tiptap/extension-placeholder` | `3.23.4` |
| `@tiptap/extension-table` | `3.23.4` |
| `@tiptap/extension-table-cell` | `3.23.4` |
| `@tiptap/extension-table-header` | `3.23.4` |
| `@tiptap/extension-table-row` | `3.23.4` |
| `@tiptap/extension-task-item` | `3.23.4` |
| `@tiptap/extension-task-list` | `3.23.4` |
| `@tiptap/extension-text-align` | `3.23.4` |
| `@tiptap/extension-text-style` | `3.23.4` |
| `@tiptap/extension-typography` | `3.23.4` |
| `@tiptap/extension-underline` | `3.23.4` |
| `@tiptap/extensions` | `^3.23.4` |
| `@tiptap/pm` | `3.23.4` |
| `@tiptap/react` | `3.23.4` |
| `@tiptap/starter-kit` | `3.23.4` |
| `@vercel/analytics` | `^2.0.1` |
| `@vercel/postgres` | `^0.10.0` |
| `@vercel/speed-insights` | `^2.0.0` |
| `@xyflow/react` | `^12.11.0` |
| `clsx` | `^2.1.1` |
| `d3-geo` | `^3.1.1` |
| `dagre` | `^0.8.5` |
| `docx` | `^9.6.1` |
| `fontkit` | `^2.0.4` |
| `framer-motion` | `^12.39.0` |
| `graphql` | `^17.0.2` |
| `gsap` | `^3.15.0` |
| `html-to-image` | `^1.11.13` |
| `lucide-react` | `^1.14.0` |
| `maplibre-gl` | `^5.24.0` |
| `motion` | `^12.38.0` |
| `next` | `^16.2.6` |
| `payload` | `^3.84.1` |
| `pdfkit` | `^0.18.0` |
| `react` | `19.2.4` |
| `react-dom` | `19.2.4` |
| `react-map-gl` | `^8.1.1` |
| `recharts` | `^3.8.1` |
| `server-only` | `^0.0.1` |
| `tailwind-merge` | `^3.6.0` |
| `topojson-client` | `^3.1.0` |
| `web-vitals` | `^6.0.1` |

### devDependencies

| Package | Declared version |
|---|---|
| `@tailwindcss/postcss` | `^4` |
| `@types/d3-geo` | `^3.1.0` |
| `@types/node` | `^20` |
| `@types/pdfkit` | `^0.17.6` |
| `@types/react` | `^19` |
| `@types/react-dom` | `^19` |
| `@types/topojson-client` | `^3.1.5` |
| `eslint` | `^9` |
| `eslint-config-next` | `16.2.6` |
| `tailwindcss` | `^4` |
| `typescript` | `^5` |

## Appendix B — environment variable inventory

Names only. A reference does not establish that a service is configured or enabled.

- `ADMIN_NOTIFICATIONS_FROM_EMAIL`
- `ANALYTICS_IP_SALT`
- `ARED_LOCAL_RECORDS`
- `ARED_OPENALEX_BASE`
- `ARED_OPENLIBRARY_BASE`
- `BREVO_ANDROID_LIST_ID`
- `BREVO_API_KEY`
- `COLLECTION_CURATOR_EMAIL`
- `CORE_API_KEY`
- `CRON_SECRET`
- `CROSSREF_MAILTO`
- `DATABASE_URL`
- `EUROPEANA_API_KEY`
- `GORSE_API_KEY`
- `GORSE_URL`
- `LOC_API_KEY`
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NODE_ENV`
- `OPENALEX_API_KEY`
- `OPENALEX_MAILTO`
- `PAYLOAD_SECRET`
- `RESEND_API_KEY`
- `SEMANTIC_SCHOLAR_API_KEY`
- `SMITHSONIAN_API_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `UNSPLASH_ACCESS_KEY`
- `VERCEL_URL`
- `WIKIDATA_USER_AGENT`

## Appendix C — API route inventory

File-system inventory. Historical/retired handlers may be blocked or redirected by the proxy; this is not a claim that every route is publicly reachable.

- `/api/account/export` — GET
- `/api/account` — GET, PATCH, DELETE
- `/api/admin/reports/daily` — POST
- `/api/admin/reports/weekly` — POST
- `/api/analytics/activity` — POST
- `/api/android-testers` — POST
- `/api/archive-collections` — GET
- `/api/archive-guide` — POST
- `/api/archive-image` — GET
- `/api/ared-events` — POST
- `/api/catalogue/record-image` — GET
- `/api/catalogue/records/[id]` — GET
- `/api/catalogue/records` — GET
- `/api/catalogue/stats` — GET
- `/api/citations/generate` — POST, GET
- `/api/collections/archive-search` — GET
- `/api/collections/suggest` — POST
- `/api/dev/curation-audit` — GET, POST
- `/api/dev/dhash` — POST, GET
- `/api/dev/film-job` — POST, GET
- `/api/dev/search-log` — GET, DELETE
- `/api/dev/visual-job` — POST, GET
- `/api/dev/visual-ranker` — GET
- `/api/diagnostics/unsplash` — GET
- `/api/discover` — GET
- `/api/explore` — POST
- `/api/following` — GET, POST
- `/api/for-you/collections/[id]` — GET, PATCH, DELETE
- `/api/for-you/collections` — GET, POST
- `/api/for-you/elements` — GET
- `/api/for-you` — POST
- `/api/for-you/save` — POST
- `/api/for-you/similar` — POST
- `/api/home-collage` — GET
- `/api/kgo/graph` — GET
- `/api/kgo/graphql` — GET, POST
- `/api/kgo/rdf` — GET
- `/api/knowledge/collections/[id]` — GET, PUT, POST
- `/api/knowledge/exposure` — POST
- `/api/knowledge/health` — POST
- `/api/knowledge/proposals` — POST
- `/api/knowledge` — GET
- `/api/news` — GET
- `/api/newsletter/subscribe` — POST
- `/api/onboarding` — GET, POST
- `/api/onboarding/username` — GET
- `/api/recommendations/events` — POST, DELETE
- `/api/recommendations/suggestions` — GET
- `/api/records/[id]/citation` — GET
- `/api/records/[id]/jsonld` — GET
- `/api/search/crossref` — GET
- `/api/search/library-of-congress` — GET
- `/api/search/loc-sru` — GET
- `/api/search/met` — GET
- `/api/search/openlibrary` — GET
- `/api/search/semantic-scholar` — GET
- `/api/search/smithsonian/record` — GET
- `/api/search/smithsonian` — GET
- `/api/search/wikidata` — GET
- `/api/search/wikimedia` — GET
- `/api/suggest` — GET
- `/api/visual/report` — POST
- `/api/visual/resolve` — GET
- `/api/workbench/intelligence/geography` — GET
- `/api/workbench/intelligence` — GET
- `/api/workbench/notes/ai-citation` — POST
- `/api/workbench/notes/scholarly-search` — POST
- `/api/workbench/notes/upload-image` — POST
- `/api/workbench/review/assignments` — GET, POST
- `/api/workbench/review/comments` — GET, POST
- `/api/workbench/review/extractions` — GET, POST
- `/api/workbench/review/fields` — GET, POST
- `/api/workbench/review/screenings` — GET, POST

## Appendix D — migrations and test inventory

Migrations listed here exist on disk; linked database application status must be checked separately.

- `0001_auth_and_research.sql`
- `0002_media.sql`
- `0003_community_contributions.sql`
- `0004_media_library_table_and_links_rls.sql`
- `0005_curator_editorial_workflow.sql`
- `0006_admin_workspace_tools.sql`
- `0007_member_profile_extension.sql`
- `0008_admin_invites.sql`
- `0009_workspace_and_curator_tools.sql`
- `0010_media_links_and_rights.sql`
- `0011_reading_list_item_snapshots.sql`
- `0012_workbench.sql`
- `0013_workbench_pm.sql`
- `0014_workbench_functional_board.sql`
- `0015_external_source_aggregator.sql`
- `0016_workbench_collaborator_status.sql`
- `0017_workbench_notes.sql`
- `0018_workbench_notes_document.sql`
- `0019_workbench_notes_innovation.sql`
- `0020_workbench_user_intelligence.sql`
- `0021_admin_invite_management.sql`
- `0022_saved_record_organisation.sql`
- `0023_workbench_review_projects.sql`
- `0024_workbench_review_extractions.sql`
- `0025_workbench_reviews_module.sql`
- `0026_workbench_project_review_linking.sql`
- `0027_workbench_review_imports.sql`
- `0028_workbench_collaborators_status.sql`
- `0029_workbench_notes_collaboration.sql`
- `0030_workbench_collaboration_realtime.sql`
- `0031_workbench_collaboration_stage3.sql`
- `0032_workbench_project_comments.sql`
- `0033_workbench_project_comments_anchor_fields.sql`
- `0034_admin_invites_management_fields.sql`
- `0035_admin_invites_revocation.sql`
- `0037_workbench_review_collaborators.sql`
- `0038_foundation_content_tables.sql`
- `20260526000756_community_reading_commons.sql`
- `20260526005858_community_post_reactions.sql`
- `20260527093221_community_post_saves_stability.sql`
- `20260530013949_admin_analytics_activity.sql`
- `20260530093000_fix_workbench_notes_comments.sql`
- `20260530200000_user_profiles_public.sql`
- `20260530210000_feedback_reports.sql`
- `20260530220000_moderation.sql`
- `20260530230000_source_requests.sql`
- `20260530240000_admin_audit_logs.sql`
- `20260530250000_notifications.sql`
- `20260530260000_profile_onboarding.sql`
- `20260530270000_admin_dashboard_preferences.sql`
- `20260530280000_admin_notifications_and_email_settings.sql`
- `20261003000000_onboarding_interests.sql`
- `20261003010000_android_testers.sql`
- `20261004000000_curatorial_following.sql`
- `20261004010000_curatorial_public_projection.sql`
- `20261004020000_curatorial_collection_clock.sql`
- `20261004030000_recommendation_events.sql`
- `20261004040000_recommendation_metrics.sql`
- `20261004050000_ared_events.sql`
- `20261004060000_visual_assets.sql`
- `20261004070000_knowledge_collections.sql`
- `20261004080000_archive_quality.sql`
- `20261004090000_account_delete_event_guard.sql`

### Test files

These are available checks, not a statement that all were rerun for this document.

- `account-safety.test.mjs`
- `auth-continuity.test.mjs`
- `cached-image.test.mjs`
- `europeana-live.mjs`
- `europeana.test.mjs`
- `feed-preferences.test.mjs`
- `following-http.mjs`
- `following-privacy.sql`
- `following-rank.test.mjs`
- `knowledge-model.test.mjs`
- `member-collection-visibility.test.mjs`
- `recommendation-engine.test.mjs`
- `recommendation-http.mjs`
- `recommendation-privacy.sql`
- `redirect-security.test.mjs`
- `unsplash.test.mjs`
- `visual-compose.test.mjs`
