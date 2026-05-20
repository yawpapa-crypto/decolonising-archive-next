## Summary

Describe the changes in this PR and the rationale.

## Changes
- Migration: supabase/migrations/0024_workbench_review_extractions.sql
- Server helpers: lib/workbench-review-extractions.ts
- API routes: app/api/workbench/review/*
- Client components (skeletons) under src/components/workbench-review/
- Smoke test: scripts/smoke-test-review-api.mjs

## How to test
1. Run `npm run build` — project should compile.
2. Run `npm run smoke:test` — verify the smoke test passes.
3. Inspect `CHANGELOG.md` for details.

## Checklist
- [ ] Migration SQL reviewed and approved for staging.
- [ ] UI wiring verified in a local environment.
- [ ] Tests/QA for DB flows.

---
Include any additional notes or screenshots.
