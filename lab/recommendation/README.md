# ARED Recommendation Lab (RecBole)

```
ARED events: follow, save, collection_add, record_open, source_open, profile_open, search, less_like_this
        |
  RECOMMENDATION LAB (offline, classical, local)
   collaborative (BPR)   sequential (SASRec)   graph (LightGCN)   + Pop baseline
        |
  compare on NDCG@10, blend by reciprocal rank (only models that beat Pop)
        |
  ARED social ranker (lib/following/rank.ts): direct follows dominate
        |
  diversity, serendipity, access rules (last)
        |
  Following / For You
```

No LLM, no hosted model, no paid service. Training is local on CPU.

```
python3 -m venv .venv && . .venv/bin/activate
pip install -r lab/recommendation/requirements.txt
python lab/recommendation/export_events.py --supabase        # needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (never in the browser)
python lab/recommendation/run_lab.py
```

Smoke test with fixtures: `export_events.py --synthetic` (development only; never ship its output).

`run_lab.py` writes `data/recommendation-lab/results.json` (comparison) and `candidates.json` (per member, best first). The app reads
`candidates.json` through `lib/following/lab.ts`; if the file is missing or stale (older than 14 days) it is ignored and Following is unchanged.
`less_like_this` events are never learned as taste: they are removed from that member's candidates.
Re-run on a schedule (weekly is plenty) once real events exist.

Verified in development on synthetic fixtures with RecBole 1.2.1 (BPR, SASRec, LightGCN and Pop all train and the blend is written).
`run_lab.py` restores a few aliases that NumPy 2 and recent SciPy removed, so it runs on current Python without pinning old packages.
`data/recommendation-lab/` is git-ignored: generated candidates are per-member data and must never be committed.
