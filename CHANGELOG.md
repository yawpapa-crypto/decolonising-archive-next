# Changelog

## Unreleased

### Added
- Database migration `0024_workbench_review_extractions.sql` to support review extraction fields, extractions, assignments, and comments.
- Server helper `lib/workbench-review-extractions.ts` to manage extraction fields, extractions, assignments, and review comments.
- Server wrappers in `lib/workbench-review-actions.ts` to expose extraction/assignment/comment flows and emit activity events.
- API routes for review features:
  - `app/api/workbench/review/fields/route.ts`
  - `app/api/workbench/review/extractions/route.ts`
  - `app/api/workbench/review/assignments/route.ts`
  - `app/api/workbench/review/screenings/route.ts`
  - `app/api/workbench/review/comments/route.ts`
- Client components (skeletons) under `src/components/workbench-review/`:
  - `ReviewSetup.tsx`, `ScreeningWorkspace.tsx`, `ExtractionForm.tsx`, `AssignmentPanel.tsx`, `CommentsThread.tsx`
- Smoke test script `scripts/smoke-test-review-api.mjs` and npm script `smoke:test` to verify API route files exist.

### Changed
- Extended `lib/workbench-activity-actions.ts` with new activity event and entity types for extraction/assignment/comment events.

### Notes
- The SQL migration file has been added but not applied to any database. Review RLS policies before running in production.
- Components are wired to the new API routes with minimal client-side fetch logic; UI/UX and form handling remain to be implemented.
