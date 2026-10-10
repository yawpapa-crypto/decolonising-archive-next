# Gorse for Following

Classical recommender only: collaborative filtering, neighbours and popularity. No LLM, no paid AI, no embeddings service.

1. `docker compose -f infra/gorse/docker-compose.yml up -d`
2. Add to `.env.local`: `GORSE_URL=http://localhost:8087` and `GORSE_API_KEY=ared-local-key` (change the key in `config.toml` for any shared host).
3. Restart the dev server. Following sends public event ids and follow feedback, then nudges close calls with Gorse's suggestions (weight `external` in `lib/following/rank.ts`).

Safety: Gorse only names event ids. The feed keeps ids it already proved the viewer can see, and the access filter runs last. A direct follow can never be outranked by a suggestion. If Gorse is absent, slow (600 ms), erroring or malformed, the native ranker runs alone, and a 30 second circuit breaker stops repeat calls. Tests: `tests/following-rank.test.mjs`.
