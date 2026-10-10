# ARED visual discovery: audit and architecture

## Found (Phase 0)
- **For You**: `lib/recommendations/server.ts` + `engine.ts`. Native, token-free ranker (explicit interests, saves, collections, follows, session, behaviour; 60/25/15 close/adjacent/serendipitous; run-length diversity on region/type/source/creator/period). Local catalogue records are withdrawn unless `ARED_LOCAL_RECORDS=1`, so candidates are mostly live provider items (Commons, Open Library, Google Books, Crossref, OpenAlex, Europeana, Met, LoC, Semantic Scholar).
- **Explore**: `getExplorePage` filtered duplicates and then sorted by a hash. No diversity, exposure or rhythm.
- **Image resolution**: catalogue (`record-image-server.ts`: editorial override, Met cache, Cleveland cache, rights-gated), provider streams, `enrichCovers` for books (Google Books then Open Library, title+author agreement required; ISBN path unverified). Resolved at request time.
- **Caching**: `/api/archive-image` proxy for museum hosts; no persisted resolution, no provenance on items.
- **Failure modes**: broken URLs retried on every load; proportions hash-faked when a source gives no `ar`; Explore repetition; cover lookup in the request path.
- **Strong, kept**: dedupe keys (`dupKeys`), rights gating, literal-feature matching, the ranker and its mix, stable seed.

## Built
- `lib/visual/describe.ts`: form/orientation/cluster, quality (resolution, source and record-match confidence, crop usability), gate (bad URL, placeholder, known-broken, tiny), dHash hamming, provenance type.
- `lib/visual/compose.ts`: windowed sequencer. Knowledge leads; each candidate may move at most `lookahead` places; penalties for visual similarity, cluster/form/orientation/source/creator/region runs, tiny colour term, duplicates, over-exposure; bonus for under-exposed usable records. Explicit intent (e.g. region) switches that penalty off.
- `lib/visual/apply.ts` + `index-store.ts`: gate, fill real aspect ratios from the index, sequence, exposure accounting (decaying), per-feed tail carried across pages.
- `scripts/build-visual-index.mjs`: offline pass (sharp): size, dHash, hue/lum, sha1, failure marking. Feeds only read `data/visual-index.json`.
- `supabase/migrations/20261004060000_visual_assets.sql`: canonical Postgres store with full provenance.
- Browser error beacon `/api/visual/report`; dev trace `/api/dev/visual-ranker?mode=explore|foryou&q=`.
- For You: ranker window 37 → 160, then bounded visual composition. Explore: breadth + editorial lift + six-hour stable rotation + exposure, composed.
- Tests: `tests/visual-compose.test.mjs` (8).

## Third-party options (analysis, not benchmarked)
The corpus is small and mostly external. Typesense (CLIP) would add a service, RAM and a second source of truth for a few thousand images; pgvector inside the existing Supabase is the lighter path if embeddings are later wanted (add a `vector` column to `visual_assets`). Weaviate and Qdrant add nothing here. **Selected**: Postgres canonical + dHash/colour/aspect features now, pgvector/CLIP only if dHash proves insufficient. CLIP was not installed or run.

## Added after the first pass
- `lib/visual/select.ts`: primary + alternative visuals (curated > source primary > usability/proportion/exposure); applied in `sequence()` when an item carries `visuals`.
- `enrichCovers`: ISBN covers accepted only when Open Library's record agrees on title (and author); every cover carries provenance (`item.visual`).
- `scripts/resolve-visuals.mjs`: ingestion/repair job writing `data/visual-assets.json` and, with `--push`, `public.visual_assets`.
- Designed fallback families (book, article, paper, document, source, collection) in `ForYouTile` + `for-you.css`.

## Not done
Article first-page previews: no provider stream currently supplies a PDF URL, so there is nothing legitimate to render yet.
