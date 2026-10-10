# ARED authentication and legacy continuity — 4 October 2026

## Audit phase (completed before implementation)

Scope: current uncommitted redesign, tracked auth baseline, installed Next 16 guides, linked Supabase aggregate SQL, publicly readable provider settings, and Field server identity/sync code. No credentials, tokens or personal emails exported. No production configuration or account rows changed.

Actual provider: Supabase Auth, @supabase/ssr browser and server cookie clients, Next Server Actions and PKCE callback. Public /auth/v1/settings returned 200: email, Google and GitHub enabled; Apple disabled; signup enabled; email confirmation required. A configured provider is not proof of a successful real OAuth journey.

Identity map: auth.users UUID → profiles.id (same UUID PK/FK) → profiles interests/progress → bookmarks.user_id and reading_lists.user_id → reading_list_items.reading_list_id; curatorial_follows.user_id/profile_id/collection_id → curatorial_activity.actor_id. Field uses verified Supabase subject, linked Neon users.auth_user_id, with legacy Field JWT/password compatibility. Its website resolver prefers explicit UUID then legacy email lookup; review verified-email linking before changing any identity mapping. Do not merge people based on email alone.

Database audit: 70 accounts, all created before 3 October redesign; all 70 have profiles. 46 email identities and 28 Google identities (identities can overlap); 69 profiles lack usernames; 70 have empty new interests and no new onboarding completion date. Nullable username and completion; interests default {}, step default 0. The old onboarding_completed boolean is a different checklist. Profiles, bookmarks, reading_lists and curatorial_follows have RLS enabled. UUID foreign keys and save uniqueness (user_id, record_id) preserve ownership. No migration required for the confirmed issues.

| Account shape | Existing behavior | Required behavior |
|---|---|---|
| Legacy, no new preferences (70) | For You redirects to onboarding | Normal access; personalisation optional |
| Legacy, no username (69) | Sign-in itself succeeds, feed gate blocks | Never require username to sign in |
| Complete returning | Destination restored on success | Preserve identity and data |
| Partial onboarding | Stored profile and metadata resume | Optional resume without archive gate |
| New signup | Two account steps then confirmation/onboarding | Explicit signup marker; no identity recreation |
| Missing profile (0 observed) | Auth helper gives member fallback | Safe defaults; never grant privileged role |

Confirmed issues, by priority:

1. P0: For You derives a mandatory gate from nullable onboarding_completed_at. This affects every current legacy profile.
2. P0: signup's admin profile update runs even without a confirmed session; unspecified values can overwrite existing metadata. Provider response must not authorize an admin write.
3. P0: service worker caches arbitrary navigation HTML, including member pages; old cached private HTML can survive account changes.
4. P1: failed sign-in drops next and therefore contextual return intent.
5. P1: password reset is labelled admin, sends member to admin sign-in, and posts raw password to a nonexistent /api/ared-field/sync-password route. Shared Supabase credentials must remain with the provider.
6. P1: email and OAuth callback errors expose raw provider text; confirm errors use message while sign-in reads error, hiding expiry errors.
7. P1: sign-in/sign-up pending is one-way local state instead of actual action pending; failure can leave forms disabled.
8. P1: signup page sends already authenticated legacy members to onboarding; confirmation resend nests onboarding destination again.
9. P2: decorative auth image fetch awaited by server sibling; stream separately so form can render first.
10. Repaired in follow-up: authenticated development requests now refresh; bounded provider fetch replaces the timeout race. Real expiry/multitab browser acceptance still pending.
11. Pending: pending-save is implemented, but follow/create intent parity and retry on failed resumed save need integration review. Do not claim all contextual journeys pass.
12. Pending: Field fallback email identity linking, stale offline save replay, deployed bridge parity and physical-device verification.

Security baseline: existing server actions use Next's action transport and origin protection; cookie routes still need per-route origin review. safeNextPath blocks protocol-relative, backslash and control-character targets. Role read has core-column fallback rather than promoting metadata. No new auth provider or account table. Rate limiting remains provider-dependent until actual settings verified. No claim of complete production security certification.

## Release acceptance

Real legacy password/Google login, same identity/library/collections/follows, logout and exact-record save resumption; new signup with delivered confirmation, preferences, For You/Following persistence and refresh; a legacy account without new fields; expired/reused recovery links; cancelled OAuth; mobile widths 375/390/430; A/logout/B and browser-back/offline isolation are required. These remain pending until exercised with genuine user authentication. Database aggregates and mocked tests do not replace them. Prior user instruction was to mark authenticated browser journeys pending. Authentication redesign must not be declared complete on code checks alone.

## Coverage and limitations

Public browsing remains independent of account onboarding. Existing recommendation history comes from canonical bookmarks/collections and existing behavioral events; empty interests have editorial fallback. Existing auth CSS has restrained arrival/reveal and reduced-motion overrides, labels/autocomplete/password reveal. No extra animation framework needed. Existing analytics is retained; no credential telemetry added. Auth metadata/noindex, production build, form interaction, signed-out HTTP timings, screenshots and focused regressions will be recorded below after repairs. Production OAuth linking/private relay, email delivery, provider/session policies, production refresh, cookie flags, account cache isolation and deployed app sync require live acceptance. No Apple button should be added.

## Repairs and verification

Removed the automatic For You onboarding gate. Added explicit new/legacy/partial/complete classification using signup provenance plus saved progress (not a nullable flag). Authenticated legacy signup-page visitors now return normally; genuinely new/partial accounts can resume setup. Account creation stamps provenance in existing provider metadata; no new table or migration.

Removed the unconfirmed admin profile write from signup. Existing Supabase signup trigger/metadata remain responsible for profile creation. No user, role, email, username or library data was migrated or reset.

Sign-in failures, recovery and OAuth/confirmation errors retain a safe exact next URL. Provider errors are translated to non-enumerating messages. Removed repeated onboarding wrapping in signup, collection and library prompts. Resumed feed saves now report success only after the API confirms and do not accidentally unsave an already saved record; failed intent is retained for the next visit.

Password recovery now describes an ARED account, keeps the chosen destination, uses new-password autocomplete and provider-confirmed user readiness. Removed raw-password forwarding to an absent Field endpoint; Field's shared Supabase credential path remains canonical. No passwords changed during this audit.

Shared AuthSubmit uses actual useFormStatus pending, duplicate-submit prevention, live status and a small reduced-motion-aware progress ring. Existing split collage is streamed in Suspense so it cannot hold back the form. OAuth errors recover from thrown network failures. Auth pages explicitly noindex. Logout rejects cross-origin requests. Service-worker version v2 purges old caches and never stores navigation HTML, including pages with authenticated controls.

### Required 38-point report

| # | Area | Result |
|---|---|---|
| 1 | Provider | Supabase Auth, verified public settings |
| 2 | Architecture | Existing SSR cookies, server actions, PKCE; preserved |
| 3 | Legacy count | 70 pre-redesign accounts |
| 4 | Compatibility | Matrix above; missing new fields never imply new identity |
| 5 | Migration | None needed or performed |
| 6 | IDs | UUIDs unchanged; no auth or profile deletion/rekey |
| 7 | Duplicate identity risk | Provider linking preserved; email fallback in Field needs live review |
| 8 | Account states | Explicit provenance/progress classification, tested |
| 9 | Profiles | All 70 present; existing PK/trigger retained; removed unconfirmed admin write |
| 10 | Preferences | Existing columns/metadata retained; staged saves; empty interests supported |
| 11 | Library | Canonical owner-scoped bookmarks, signed-out elements 401 |
| 12 | Collections | Canonical owner-scoped reading_lists/items; anonymous empty response supported |
| 13 | Follows | Canonical curatorial_follows; own-write RLS and same-origin API guard |
| 14 | Session | Real provider refresh passes; dev refresh restored and late-cookie timeout race removed; expiry/multitab browser acceptance pending |
| 15 | Sign-in | Destination preserved on error and success; no mandatory personalisation |
| 16 | Signup | Minimal existing form; confirmation required by provider; no admin overwrite |
| 17 | Onboarding | Disposable live member saved name, username and three taxonomy interests and completed onboarding; persisted state verified |
| 18 | Legacy flow | Feed no longer redirects all 70 users; real login still pending |
| 19 | Contextual auth | Save URL and retry preserved; follow same-browser intent exists; live parity pending |
| 20 | Redirects | Same-origin validator + focused regression passes; no extra onboarding nesting |
| 21 | Loading | Shared actual action pending; disabled submit and live status |
| 22 | Animation | Existing restrained CSS arrival plus small progress mark; no dependencies added |
| 23 | Reduced motion | Existing reveal overrides retained; new ring becomes static |
| 24 | Errors | Safe credential/link/network messages; hidden confirm errors corrected |
| 25 | Reset | Live disposable recovery token and password change pass; token reuse rejected; Field accepts changed password with same UUID. Inbox delivery and expired-link UI pending |
| 26 | OAuth | Google/GitHub provider login pages reached with existing project callback; Apple absent. Completed user login/callback/linking still pending |
| 27 | Mobile | Sign-in and expanded recovery inspected at 375/390/430px; password visibility works. Native-device authenticated journeys pending |
| 28 | Accessibility | Labels/autocomplete/reveal retained; actual pending/status improved; mobile/keyboard audit incomplete |
| 29 | Security | No unconfirmed admin profile write, safe redirects, origin guard, no navigation HTML cache; full release review pending |
| 30 | Performance | Form streams independently of image fetching; cold local HTTP timings recorded, no trustworthy login before/after timing yet |
| 31 | Analytics | Existing analytics retained; no credential/form-value telemetry; full auth funnel not instrumented in this repair |
| 32 | SEO | HTTP sign-in/signup/recovery 200 and noindex verified; existing robots exclusions retained |
| 33 | Files | Listed below; unrelated working-tree edits retained |
| 34 | DB migrations | Zero. Follow-up uses isolated disposable QA auth/profile/library fixtures; cleanup confirmed; no existing member data changed |
| 35 | Automated tests | 10 focused tests pass; TypeScript and focused lint pass, zero warnings in edited auth scope |
| 36 | Manual tests | Desktop sign-in renders and contextual signup link verified; signed-out API responses checked |
| 37 | Screenshots | artifacts/auth-audit/signin-desktop.png, signin-mobile-375.png, recovery-mobile-390.png, recovery-mobile-430.png |
| 38 | Risks | Real acceptance, production configuration, device sync, cache account-switch and provider/session settings remain pending |

Initial audit build (before the follow-up repair below): ordinary npm run build failed prerendering /community/topics because production environment files override public Supabase settings to blank. At that stage no environment file had changed. A process-only build using the already existing development public Supabase settings succeeds: webpack compilation, TypeScript, and all 2,576 static pages. This proves compilation with configuration, not production readiness. Node emits its experimental localStorage warning. Final type/lint checks after small return-path refinements pass.

HTTP signed-out checks (dev timings include compilation/network and are not production performance claims): /signin 200 1496ms; /signup 200 1000ms; /auth/reset-password 200 1339ms, all contain noindex. /api/onboarding 401; /api/for-you/elements 401; /api/for-you/collections 200 (intentional anonymous contract). See artifacts/auth-audit/http-checks.json.

Tests: tests/auth-continuity.test.mjs (legacy classification, signup provenance, cache purge/no-page-store, incorrect-credential return, legacy sign-in destination without profile mutation), plus existing account-safety and redirect-security tests. Mocked flows are explicitly not real account acceptance.

Task files: lib/onboarding/account-state.ts; app/home-next/for-you/page.tsx and ForYouFeed.tsx; app/home-next/explore/SignupGate.tsx; app/home-next/LibraryGate.tsx; app/(app)/signin/{actions,page,LoginForm,OAuthButtons}; app/(app)/signup/{actions,page,SignupFlow}; app/auth/{callback,confirm,signout}/route.ts; app/auth/reset-password/{page,layout}.tsx; components/auth/AuthSubmit.tsx; app/styles/auth-pages.css; public/sw.js; tests/auth-continuity.test.mjs; this report and artifacts/auth-audit.

**Release status: NOT COMPLETE.** A real legacy member and a newly created account must complete the non-negotiable journeys above. Genuine credentials, email confirmations and password changes must be entered by the user in the site, never posted in chat. No deployment or production auth configuration change performed.


## Follow-up: remaining auth blockers — 4 October 2026

Story: existing Supabase identity → website session and canonical library → Field reads/writes → same identity and library after refresh/recovery.

### Confirmed failures repaired

- Website and Field shared the same project/public key but their configured server key returned HTTP 401. Retrieved and validated the project's **existing** service-role key via the authenticated project CLI (admin users endpoint now HTTP 200). Repaired both ignored local environment files. No key created/rotated, project replaced, account rekeyed, or remote deployment changed. Backups are private, outside the repository.
- Local website production environment supplied blank Supabase settings, overriding working local config. Restored the existing shared project's values. Ordinary `npm run build` now succeeds, including 2,576 pages. This is a local production build, not deployed acceptance.
- The development proxy skipped session refresh. It now skips only anonymous requests or an explicit diagnostic opt-out. Authenticated cookies refresh through the existing SSR client. Replaced the timeout Promise.race with a bounded fetch so a late response cannot mutate cookies after the returned response.
- Field pull treated failed table reads as an empty successful library. It now returns a safe retryable error, preserving local data. HTTP failure logs no longer contain email addresses or caught exceptions that could include bypass URLs.
- Field push ignored database errors. It now reports failure for failed bookmark/list/item/search reads and writes rather than falsely reporting sync success. Retry uses canonical IDs and existing deduplication.
- Field collection deletion now checks ownership before deleting items and keeps the website's deletion tombstone so stale offline pushes cannot recreate deleted collections.

### Evidence

Live smoke: `APP_DA/scripts/auth-website-live-smoke.ts`, result `artifacts/auth-audit/live-smoke.json`. Uses actual Supabase password sessions/SSR cookies, localhost owner-scoped APIs and Field's actual pull/push/password helper. Creates only a clearly isolated, email-confirmed disposable fixture with an invalid email domain; never sends email, accesses a legacy member's password, or prints tokens. Fixture and owned library are removed in `finally`. This intentionally bypasses signup email confirmation for automation and **does not certify delivered confirmation or a human legacy login**.

Passed: password login/stable UUID; website save/library persistence; staged onboarding, unique username and taxonomy interests; website→Field canonical IDs/memberships; idempotent Field→website round trip; provider refresh/stable UUID; website unsave; Field deletion hidden on next pull; anonymous library 401; provider logout; generated recovery token single use; password reset preserving UUID; Field accepts recovered website password with the same UUID; fixture cleanup.

Focused website tests: 10 pass. Field deletion/ownership/error regressions: 4 pass. Website TypeScript/focused lint and Field TypeScript pass. No dependency or schema migration added.

Mobile UI: 375×812 sign-in, 390×844 and 430×932 expanded recovery checked through the browser. Controls fit, password reveal toggles, recovery disclosure opens. Google and GitHub buttons reach their real credential pages; no third-party credentials or consent entered. Viewport reset after checks. A Next development-only React Performance.measure error occurred after browser-back from a provider; reload restored the working handler. It is recorded, not silently treated as an authenticated OAuth success.

### Still requires the member/device/inbox

1. The user signs in with their existing pre-redesign account, verifies their real collections/library/follows, logs out and resumes an exact-record save.
2. Complete Google/GitHub login and callback (including cancellation/linking and returning-account behavior).
3. Receive signup/recovery emails in a real inbox; complete confirmation and recovery-link browser journeys, including expired/reused links. Provider token reuse is tested separately above.
4. Actual installed Field app/device sync and account switching/offline behavior. Canonical service round-trip and shared recovered password are tested; physical-device app state is not.
5. Verify deployed environment and deployment; changes here repair local configuration and source code only.

**Release status remains pending these acceptance checks.** The earlier broad pending list is now narrowed: live password auth, session refresh, recovery primitives, mobile form layout and canonical app sync have evidence. Human login, inbox delivery, complete OAuth callbacks and installed-device acceptance cannot be honestly marked complete without those steps.
