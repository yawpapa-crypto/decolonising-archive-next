"""Export ARED events to RecBole atomic files.

Sources (pick one):
  --supabase   read user_activity_events with SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (server side only)
  --csv FILE   columns: user_id,event_type,target_id,created_at   (ISO timestamps)
  --synthetic  deterministic fixtures for development. Never use their output in production.

Writes  dataset/ared/ared.inter  and  negatives.json  (less_like_this is never learned as taste).
"""
import argparse, csv, json, os, sys, urllib.request, random
from datetime import datetime, timezone

WEIGHT = {"follow": 5, "save": 4, "collection_add": 4, "record_open": 2, "source_open": 1.5, "profile_open": 1.5, "search": 1}
ALIAS = {"rec_record_open": "record_open", "rec_related_record_open": "record_open", "rec_source_open": "source_open", "rec_search": "search", "rec_less": "less_like_this"}

def norm(t):
    t = ALIAS.get(t, t)
    return t[5:] if t.startswith("ared_") else t

def ts(s):
    return datetime.fromisoformat(s.replace("Z", "+00:00")).astimezone(timezone.utc).timestamp()

def from_supabase():
    url, key = os.environ.get("SUPABASE_URL"), os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        sys.exit("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY")
    rows, start = [], 0
    while True:
        req = urllib.request.Request(f"{url}/rest/v1/user_activity_events?area=eq.recommendation&select=user_id,event_type,target_id,created_at&order=created_at.asc",
                                     headers={"apikey": key, "Authorization": f"Bearer {key}", "Range": f"{start}-{start + 999}"})
        with urllib.request.urlopen(req, timeout=30) as r:
            page = json.loads(r.read())
        rows += page
        if len(page) < 1000:
            return rows
        start += 1000

def synthetic():
    """Three taste clusters plus a few cross-over users, with session order, so sequential and graph models have signal."""
    rnd = random.Random(7)
    clusters = [[f"collection:c{c}{i}" for i in range(12)] for c in range(3)]
    rows, t0 = [], datetime(2026, 8, 1, tzinfo=timezone.utc).timestamp()
    for u in range(90):
        c = u % 3
        pool = clusters[c] + (clusters[(c + 1) % 3][:3] if u % 10 == 0 else [])
        seq = rnd.sample(pool, k=min(len(pool), rnd.randint(7, 11)))
        for k, item in enumerate(seq):
            ev = rnd.choices(["record_open", "save", "follow", "collection_add", "source_open"], [5, 2, 1, 1, 1])[0]
            rows.append({"user_id": f"u{u:03d}", "event_type": ev, "target_id": item, "created_at": datetime.fromtimestamp(t0 + u * 3600 + k * 600, timezone.utc).isoformat()})
        if u % 7 == 0:
            rows.append({"user_id": f"u{u:03d}", "event_type": "less_like_this", "target_id": clusters[(c + 2) % 3][0], "created_at": datetime.fromtimestamp(t0 + u * 3600 + 9999, timezone.utc).isoformat()})
    return rows

def main():
    ap = argparse.ArgumentParser()
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--supabase", action="store_true"); g.add_argument("--csv"); g.add_argument("--synthetic", action="store_true")
    ap.add_argument("--out", default=os.path.join(os.path.dirname(__file__), "dataset", "ared"))
    a = ap.parse_args()
    rows = from_supabase() if a.supabase else synthetic() if a.synthetic else list(csv.DictReader(open(a.csv)))
    os.makedirs(a.out, exist_ok=True)
    best, neg = {}, {}
    for r in rows:
        ev = norm(r["event_type"])
        key = (r["user_id"], r["target_id"])
        if ev == "less_like_this":
            neg.setdefault(r["user_id"], []).append(r["target_id"]); continue
        if ev not in WEIGHT: continue
        t = ts(r["created_at"])
        w, lt = best.get(key, (0.0, 0.0))
        best[key] = (max(w, WEIGHT[ev]), max(lt, t))
    with open(os.path.join(a.out, "ared.inter"), "w") as f:
        f.write("user_id:token\titem_id:token\trating:float\ttimestamp:float\n")
        for (u, i), (w, t) in sorted(best.items(), key=lambda kv: kv[1][1]):
            if i in neg.get(u, []): continue
            f.write(f"{u}\t{i}\t{w}\t{t}\n")
    json.dump(neg, open(os.path.join(a.out, "negatives.json"), "w"))
    print(f"{len(best)} interactions, {sum(len(v) for v in neg.values())} negatives -> {a.out}")

if __name__ == "__main__":
    main()
