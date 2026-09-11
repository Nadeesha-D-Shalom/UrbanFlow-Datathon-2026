"""Compare pre-trip duration models; select on validation, evaluate test once.

Default: identical seed-42 5M-row sample for both models due limited free RAM.
Use --full-train on a machine with sufficient memory. Reads existing splits;
never rewrites datasets. Refuses to replace an existing selected artifact.
"""
import argparse
import gc
import json
import math
import sys
from pathlib import Path

import joblib
import numpy as np
import polars as pl
import pyarrow.parquet as pq
from lightgbm import LGBMRegressor
from sklearn.tree import DecisionTreeRegressor

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from src.urbanflow.models.duration import INPUTS, FEATURES, feature_matrix, target_minutes, predict_model

BATCH = 100_000
SPLITS = {s: ROOT / f"data/splits/{s}/trips_{s}.parquet" for s in ["train", "validation", "test"]}

def batches(path):
    for batch in pq.ParquetFile(path).iter_batches(batch_size=BATCH, columns=INPUTS + ["dropoff_timestamp"], use_threads=False):
        yield pl.from_arrow(batch)

def evaluate(model, path, imputation):
    n = 0
    absolute = squared = sum_y = sum_y2 = 0.0
    for frame in batches(path):
        y = target_minutes(frame)
        if not np.isfinite(y).all() or (y <= 0).any():
            raise ValueError("Invalid duration targets; no rows silently excluded.")
        prediction = predict_model(model, feature_matrix(frame, imputation))
        if not np.isfinite(prediction).all():
            raise ValueError("Non-finite model predictions.")
        residual = prediction - y
        n += len(y)
        absolute += np.abs(residual).sum()
        squared += np.dot(residual, residual)
        sum_y += y.sum()
        sum_y2 += np.dot(y, y)
    return {"rows": n, "mae": absolute/n, "rmse": math.sqrt(squared/n),
            "r2": 1 - squared/(sum_y2 - sum_y*sum_y/n)}

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--full-train", action="store_true")
    args = parser.parse_args()
    output = ROOT / "models/duration_model.pkl"
    if output.exists():
        raise SystemExit("Selected duration artifact exists; refusing to retrain or re-test it.")
    counts = {s: pq.ParquetFile(path).metadata.num_rows for s, path in SPLITS.items()}
    boundaries = {s: pl.scan_parquet(path).select(
        pl.col("pickup_timestamp").min().alias("start"),
        pl.col("pickup_timestamp").max().alias("end"),
    ).collect().to_dicts()[0] for s, path in SPLITS.items()}
    assert boundaries["train"]["end"] < boundaries["validation"]["start"]
    assert boundaries["validation"]["end"] < boundaries["test"]["start"]
    print("Existing temporal splits:", counts, flush=True)
    imputation = pl.scan_parquet(SPLITS["train"]).select(
        pl.col("rider_count").median(), pl.col("rate_class_id").median()
    ).collect(engine="streaming").to_dicts()[0]
    if any(v is None or not math.isfinite(v) for v in imputation.values()):
        raise ValueError("Training imputation is unavailable.")
    print("Full-training-only medians:", imputation, flush=True)
    rows = counts["train"] if args.full_train else min(5_000_000, counts["train"])
    indices = None if args.full_train else np.sort(np.random.RandomState(42).choice(counts["train"], rows, replace=False))
    x = np.empty((rows, len(FEATURES)), dtype=np.float32)
    y = np.empty(rows, dtype=np.float64)
    offset = written = 0
    for frame in batches(SPLITS["train"]):
        size = frame.height
        if indices is not None:
            lo, hi = np.searchsorted(indices, [offset, offset + size])
            frame = frame[(indices[lo:hi] - offset).tolist()]
        if frame.height:
            end = written + frame.height
            x[written:end] = feature_matrix(frame, imputation)
            y[written:end] = target_minutes(frame)
            written = end
        offset += size
    assert written == rows and np.isfinite(x).all() and np.isfinite(y).all() and (y > 0).all()
    del indices
    gc.collect()
    print(f"Training rows per model: {rows:,}; sampled={rows < counts['train']}", flush=True)
    candidates = [
        ("DecisionTreeRegressor", DecisionTreeRegressor(max_depth=18, min_samples_leaf=50, random_state=42)),
        ("LGBMRegressor", LGBMRegressor(n_estimators=300, learning_rate=0.08, num_leaves=63,
            min_child_samples=100, random_state=42, n_jobs=4, deterministic=True, force_col_wise=True, verbosity=-1)),
    ]
    comparison = []
    best_model = best_row = None
    configs = {}
    for name, model in candidates:
        print(f"Fitting {name}...", flush=True)
        configs[name] = model.get_params()
        if name == "LGBMRegressor":
            model.fit(x, y, categorical_feature=[0, 2, 3, 4])
        else:
            model.fit(x, y)
        print(f"Evaluating {name} on full validation...", flush=True)
        metrics = evaluate(model, SPLITS["validation"], imputation)
        row = {"model": name, "train_rows": rows, "sampled_training": rows < counts["train"],
               "random_state": 42, **metrics}
        comparison.append(row)
        print(json.dumps(row), flush=True)
        if best_row is None or (row["mae"], row["rmse"], -row["r2"]) < (best_row["mae"], best_row["rmse"], -best_row["r2"]):
            best_model, best_row = model, row
    del x, y, candidates
    gc.collect()
    metrics_dir = ROOT / "results/metrics"
    metrics_dir.mkdir(parents=True, exist_ok=True)
    pl.DataFrame(comparison).write_csv(metrics_dir / "duration_model_comparison.csv")
    print(f"Selected {best_row['model']} by validation MAE. Evaluating test ONCE...", flush=True)
    test = {"model": best_row["model"], **evaluate(best_model, SPLITS["test"], imputation)}
    pl.DataFrame([test]).write_csv(metrics_dir / "duration_test_metrics.csv")
    bundle = {"model": best_model, "model_name": best_row["model"], "features": FEATURES,
              "imputation": imputation, "validation": best_row, "test": test,
              "training_config": configs, "categorical_feature_indices_lightgbm": [0, 2, 3, 4],
              "split_boundaries": boundaries, "random_state": 42}
    joblib.dump(bundle, output, compress=3)
    # Frontend metadata is exported only from the measured results.
    frontend = ROOT / "dashboard/src/data/generated/duration_model_info.json"
    frontend.write_text(json.dumps({"model": best_row["model"], "test": test,
        "test_period": "March 2026", "train_rows": rows, "sampled_training": best_row["sampled_training"]}, indent=2) + "\n", encoding="utf-8")
    print("Untouched test:", json.dumps(test), flush=True)
    print("Saved", output, flush=True)

if __name__ == "__main__":
    main()
