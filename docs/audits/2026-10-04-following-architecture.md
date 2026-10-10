# Following: architecture audit and implementation plan

Audit completed before implementation on 4 October 2026.

## Existing architecture
- Discovery: `/home-next/for-you` uses interests, bookmarks and collection signals; `/home-next/explore` searches the wider public catalogue/providers. Navigation currently exposes For You, Explore and Fieldnotes. Neither is an explicit relationship feed.
- Authentication: shared Supabase SSR cookie session, profiles linked to auth.users; existing sign-in/signup support safe return URLs. Preserve free browsing; require authentication for mutations.
- Profiles: existing profiles include public biography/avatar/website and private email/contact/address. profile_visibility defaults private. `/community/users/[userId]` projects selected public fields; redesigned own profile/settings primarily use auth metadata. Public queries must never select the complete profile.
- Collections: personal curations are reading_lists/reading_list_items, with owner RLS and is_public default false. Existing `/home-next/collections/[id]` is owner-only. Static editorial gateways and foundation JSON collections are separate objects, not user-curated reading lists. Reuse reading lists rather than inventing another collection store.
- Library/save: bookmarks are private; save optionally inserts reading_list_items with record snapshots. Shared ForYouTile, Detail and CollectionPicker implement source/save/related interactions. Personal saves must not create public activity.
- Records: CSV catalogue has publicVisibility, rights, communityAuthorityRequired, linkedRecordIds and provenance. Foundation records also exist as JSON. Catalogue relationships exist, but no public connection-editing workflow; do not fabricate connection events. External saved snapshots alone are insufficient evidence of current cultural access.
- Images: central server resolver and cached archive-image proxy exist; do not call remote image search per activity. Fail closed for restricted records; metadata-only records need no image.
- Relationships: no existing follow table. Organisation is affiliation text, not an independently managed public organisation account. First release supports actual profiles and public reading lists only.
- Activity: admin user_activity_events/search/session tables are private telemetry. Workbench activity belongs to retired/private research features. Neither is publication consent and neither will be used.
- Public profile RLS permits public rows: new APIs must enforce explicit safe field projections. Existing broad table policies need a separate privacy review; no claims that all legacy exposure has been eliminated.
- Motion: GSAP and Motion already installed. Native scroll-snap and small CSS transitions suffice; no new animation dependency.
- Database: linked shared app project is reachable with CLI. Local/remote migration history diverges (remote-only migrations); never push the entire migration directory blindly. Docker is unavailable, so CLI schema dump cannot run directly.

## Chosen implementation
1. Add explicit owner-controlled follow rows and public curatorial event rows. Database triggers publish only public-list changes; group additions per actor/list in 30-minute windows. Read policies recheck current public collection state, and profile visibility for person follows. No private bookmark events or retrospective private activity.
2. Add `/following`, public profile and public collection routes, a shared contextual Follow control, chronological cursor API and a narrow native-swipe activity stream. Reuse record cards/detail/save/picker; public profile masonry contains that profile's verified public collection records only.
3. Extend existing collection edit/publication and profile settings workflows explicitly. Batch hydration; only verified currently public catalogue records appear. Offer real public profiles/collections, labelled editorial unless genuine interest overlap exists. Empty database states stay honest.
4. Validate SQL/RLS aggregation and visibility, API authentication, responsive widths, native carousels, auth-return follow intent, and running browser layouts. Document any unavailable signed-in journeys rather than claiming they passed.

## Boundaries
Organisation follows, contribution/source-publication events and live connection events are deferred until those owned publication models exist. No likes, popularity scores or private research activity. Public collection record snapshots from unverified external providers are omitted until current access can be verified.

## Implementation and verification report

Status: implemented; real signed-in browser journeys **PENDING at the user's request** (4 October). Mobile navigation improvement completed before handoff.

1. Architecture: Following uses explicit relationships; For You and Explore retain their existing discovery behavior and free guest browsing.
2. Schema: `curatorial_follows` and `curatorial_activity` reuse profiles and reading lists. Three isolated `20261004` migrations were applied to the linked shared backend and recorded in migration history; unrelated divergent migrations were not pushed.
3. Routes: `/following`, `/people/[id]`, `/curated-collections/[id]`; a development-only visual fixture is unavailable in production.
4. Events: public publication, meaningful public collection updates, and grouped additions. No private bookmarks, research notes, analytics or invented social events.
5. Relationships: shared optimistic profile/collection Follow button, owner-authorised mutations, contextual guest dialog and expiring return intent. Actual authenticated return completion remains pending.
6. Privacy: safe public-profile projection replaces broad community-profile reads; private collection item notes and snapshots are owner-only. A public record RPC exposes IDs/order only. Unpublishing immediately hides activity. These specific database assertions pass; this is not a claim that every unrelated legacy policy has been audited.
7. Public records: only currently public verified catalogue records, with cultural-authority restrictions respected. Unverified external saved snapshots are omitted.
8. Presentation: quiet 620px stream, small metadata, native horizontal swipe/arrow carousel with next item peeking, natural single-image proportions, public collection/profile masonry.
9. Reuse: existing ForYouTile, Detail, CollectionPicker, pending-save and signup prompt; private Library remains private. Existing community public-list URLs redirect to the safe public collection view.
10. API: authenticated owner follow/unfollow, body validation, same-origin mutation guard, chronological tuple cursor, deduplication and current visibility rechecks. Guest read, unauthenticated mutation, cross-origin rejection, invalid request and unavailable public entities pass HTTP checks.
11. Performance: batch actors/collections/records; 12-event pages and 600px prefetch; no per-card remote search. Stable event timestamps prevent reordering during grouped additions. Empty filtered pages can continue pagination.
12. Images: fixed guessed Cleveland object-ID URLs using verified accession/CC0 responses. Seventeen official image URL/aspect-ratio cache entries refreshed; existing image proxy caches bytes. Restricted records cannot acquire images through editorial overrides.
13. Accessibility: labelled navigation and search toggle, expanded state, visible focus, native dialog/escape, live follow status, keyboard carousel controls, reduced-motion CSS. Full assistive-technology audit remains outside the completed checks.
14. Mobile navigation: two rows keep logo/account controls separate from For You, Following, Explore and Fieldnotes. Search expands into a third row. All four destinations visible at 375/390/430 and 768/1024/1280/1440; no horizontal page overflow observed. Tablet visibility was rechecked after its final adjustment.
15. Verification: TypeScript and focused ESLint pass. Transactional SQL privacy/aggregation tests pass and roll back fixtures. Native carousel advances; shared detail opens and browser Back preserves the observed carousel state. Guest Follow dialog verified. There are currently no published member profiles/collections, so the live page honestly shows an empty state and real editorial gateways, not simulated curators.
16. Screenshots: `artifacts/following/mobile-menu.png` is the actual guest page; `mobile-menu-search.png` shows expanded search; `activity-mobile.png`, `activity-desktop.png` and `guest-follow.png` use clearly labelled development visual fixtures with real catalogue material. Fixtures do not create public database rows.
17. Pending/limits: user requested signed-in follow/unfollow, publish/unpublish, save/collection and app-session journeys be marked pending. Full authenticated pagination and nonzero-scroll restoration across full record-route navigation need that session. Organisation follows and public connection/contribution events await real owned publication models. Production build compiles and completes TypeScript but prerendering `/community/topics` fails because `.env.production.local` has blank Supabase URL/key, overriding configured local values; no production configuration was silently changed. Earlier dependency-security findings remain separate from this feature's privacy checks.

### Files changed for this feature

- New: `app/following/*`, `app/people/[id]/page.tsx`, `app/curated-collections/[id]/page.tsx`, `app/api/following/route.ts`, `lib/following/server.ts`.
- Integration: HomeNav, NavSearch, AuthLinks, home/For You CSS; profile settings/actions; owner collection API/UI; save API error handling; legacy community public-profile/list routes.
- Images: central record image resolver, home cached-image helper, `scripts/cache-curatorial-images.py`, accession cache JSON.
- Database/tests: three curatorial migrations, `tests/following-privacy.sql`, `tests/following-http.mjs`; this audit and screenshot artifacts.

Other pre-existing workspace changes were preserved.
