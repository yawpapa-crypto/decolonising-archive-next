"""ARED Recommendation Lab. Trains three families of RecBole models on ARED events, compares them,
and writes candidates for the ARED social ranker.

  collaborative filtering  BPR
  sequential               SASRec
  graph                    LightGCN
  baseline                 Pop (comparison only)

Output: data/recommendation-lab/results.json and candidates.json (server-only, read by lib/following/lab.ts).
The lab only suggests. Diversity, serendipity and access rules are applied afterwards by the ARED ranker.
"""
import argparse, json, os, sys, time
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
MODELS = {"collaborative": "BPR", "sequential": "SASRec", "graph": "LightGCN", "baseline": "Pop"}

def _numpy2_shim():
    """RecBole 1.2 still references aliases that NumPy 2 removed. Restore them so it runs on current Python."""
    import numpy as np
    for old, new in {"float_": np.float64, "complex_": np.complex128, "int_": np.int64, "bool8": np.bool_, "unicode_": np.str_, "object0": np.object_}.items():
        if not hasattr(np, old):
            setattr(np, old, new)
    from scipy.sparse import dok_matrix  # LightGCN builds its adjacency with a private method newer SciPy dropped
    if not hasattr(dok_matrix, "_update"):
        dok_matrix._update = lambda self, data: self._dict.update(data)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", default=os.path.join(HERE, "dataset"))
    ap.add_argument("--out", default=os.path.join(ROOT, "data", "recommendation-lab"))
    ap.add_argument("--epochs", type=int, default=30)
    ap.add_argument("--k", type=int, default=20)
    a = ap.parse_args()
    _numpy2_shim()
    from recbole.config import Config
    from recbole.data import create_dataset, data_preparation
    from recbole.utils import init_seed, get_model, get_trainer
    from recbole.utils.case_study import full_sort_topk
    import torch

    neg = json.load(open(os.path.join(a.data, "ared", "negatives.json")))
    results, ranked = {}, {}
    for family, name in MODELS.items():
        cfg = dict(data_path=a.data, dataset="ared", load_col={"inter": ["user_id", "item_id", "rating", "timestamp"]},
                   epochs=a.epochs, stopping_step=5, train_batch_size=256, eval_batch_size=512, metrics=["Recall", "NDCG", "Hit", "MRR"], topk=[10],
                   valid_metric="NDCG@10", show_progress=False, seed=2026, reproducibility=True, checkpoint_dir=os.path.join(HERE, "saved"),
                   user_inter_num_interval="[1,inf)", item_inter_num_interval="[1,inf)", MAX_ITEM_LIST_LENGTH=20, log_wandb=False, use_gpu=False)
        if name == "SASRec":
            cfg.update(eval_args={"split": {"LS": "valid_and_test"}, "order": "TO", "mode": "full"}, loss_type="CE", train_neg_sample_args=None, n_layers=2, n_heads=2, hidden_size=64, inner_size=128)
        else:
            cfg.update(eval_args={"split": {"RS": [0.8, 0.1, 0.1]}, "order": "RO", "mode": "full"})
        if name == "LightGCN":
            cfg.update(embedding_size=64, n_layers=2)
        t0 = time.time()
        try:
            config = Config(model=name, dataset="ared", config_dict=cfg)
            init_seed(config["seed"], config["reproducibility"])
            dataset = create_dataset(config)
            train, valid, test = data_preparation(config, dataset)
            model = get_model(config["model"])(config, train._dataset).to(config["device"])
            trainer = get_trainer(config["MODEL_TYPE"], config["model"])(config, model)
            trainer.fit(train, valid, saved=False, show_progress=False)
            res = trainer.evaluate(test, load_best_model=False, show_progress=False)
            results[family] = {"model": name, "seconds": round(time.time() - t0, 1), **{k: round(float(v), 4) for k, v in res.items()}}
            if family == "baseline":
                continue
            users = [u for u in dataset.field2id_token[dataset.uid_field][1:]]
            uids = dataset.token2id(dataset.uid_field, users)
            _, top = full_sort_topk(uids, model, test, k=a.k, device=config["device"])
            for u, row in zip(users, top.cpu().tolist()):
                ranked.setdefault(u, {})[family] = [t for t in dataset.id2token(dataset.iid_field, row) if t and t != "[PAD]"]
        except Exception as e:  # one failing family must not stop the lab
            results[family] = {"model": name, "error": f"{type(e).__name__}: {e}"[:200]}

    # Compare: a family earns a blend weight only if it beats the popularity baseline on NDCG@10.
    base = results.get("baseline", {}).get("ndcg@10", 0.0)
    w = {f: max(r.get("ndcg@10", 0.0) - base, 0.0) for f, r in results.items() if f != "baseline" and "error" not in r}
    total = sum(w.values())
    weights = {f: (v / total if total else 0.0) for f, v in w.items()}
    users = {}
    for u, per in ranked.items():
        score = {}
        for f, items in per.items():
            for r, item in enumerate(items):
                if item in neg.get(u, []): continue
                s = score.setdefault(item, [0.0, []])
                s[0] += weights.get(f, 0.0) / (60 + r + 1)
                s[1].append(f)
        users[u] = [{"item": i, "score": round(v[0], 6), "from": v[1]} for i, v in sorted(score.items(), key=lambda kv: -kv[1][0]) if v[0] > 0][:a.k]
    os.makedirs(a.out, exist_ok=True)
    meta = {"generatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "weights": weights, "results": results}
    json.dump(meta, open(os.path.join(a.out, "results.json"), "w"), indent=2)
    json.dump({**meta, "users": users}, open(os.path.join(a.out, "candidates.json"), "w"))
    print(json.dumps(meta, indent=2))

if __name__ == "__main__":
    sys.exit(main())
