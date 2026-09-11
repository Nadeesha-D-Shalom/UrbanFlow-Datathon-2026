"""Train and forecast recursive hourly pickup demand for the top taxi zones."""
import json
import math
import sys
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import polars as pl
from lightgbm import LGBMRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

ROOT = Path(__file__).resolve().parents[1]
TRIPS = ROOT / "data/processed/trips_clean.parquet"
ZONE_ACTIVITY = ROOT / "dashboard/src/data/generated/zone_activity.json"
REFERENCE = ROOT / "data/raw/zones/Urban_Flow_Analytics_Zone_Dataset.csv"
SPLITS = {name: ROOT / f"data/splits/{name}/trips_{name}.parquet" for name in ["train", "validation", "test"]}
FEATURES = [
    "zone_id", "hour", "day_of_week", "month", "is_weekend",
    "lag_1", "lag_2", "lag_3", "lag_24", "lag_168",
    "rolling_mean_24", "rolling_mean_168",
]
HORIZONS = [24, 48, 72]


def top_zones():
    rows = json.loads(ZONE_ACTIVITY.read_text(encoding="utf-8"))
    return [{"zone_id": int(row["zone_id"]), "zone_name": row["zone_name"]}
            for row in rows if row["reference_matched"]][:5]


def hourly_counts(path, zone_ids):
    return (pl.scan_parquet(path)
            .filter(pl.col("origin_loc_id").is_in(zone_ids))
            .select(pl.col("pickup_timestamp").dt.truncate("1h").alias("timestamp"),
                    pl.col("origin_loc_id").cast(pl.Int64).alias("zone_id"))
            .group_by(["timestamp", "zone_id"])
            .agg(pl.len().alias("pickups"))
            .collect(engine="streaming").to_pandas())


def complete_history(zone_ids):
    parts = [hourly_counts(path, zone_ids) for path in SPLITS.values()]
    observed = pd.concat(parts, ignore_index=True).groupby(["timestamp", "zone_id"], as_index=False)["pickups"].sum()
    start, end = observed["timestamp"].min(), observed["timestamp"].max()
    timestamps = pd.date_range(start, end, freq="h")
    grid = pd.MultiIndex.from_product([timestamps, zone_ids], names=["timestamp", "zone_id"]).to_frame(index=False)
    return (grid.merge(observed, on=["timestamp", "zone_id"], how="left")
            .fillna({"pickups": 0}).sort_values(["zone_id", "timestamp"]).reset_index(drop=True))


def feature_row(history, timestamp, zone_id):
    series = history.loc[history["zone_id"] == zone_id].set_index("timestamp")["pickups"]
    values = {"zone_id": zone_id, "hour": timestamp.hour, "day_of_week": timestamp.dayofweek,
              "month": timestamp.month, "is_weekend": int(timestamp.dayofweek >= 5)}
    for lag in [1, 2, 3, 24, 168]:
        values[f"lag_{lag}"] = float(series.get(timestamp - pd.Timedelta(hours=lag), 0))
    prior = series[series.index < timestamp]
    values["rolling_mean_24"] = float(prior.tail(24).mean())
    values["rolling_mean_168"] = float(prior.tail(168).mean())
    return values


def training_frame(history, start, end):
    rows = []
    for zone_id in history["zone_id"].unique():
        series = history[history["zone_id"] == zone_id].set_index("timestamp")["pickups"]
        for timestamp in series.loc[start:end].index:
            rows.append(feature_row(history, timestamp, zone_id) | {"target": float(series[timestamp])})
    frame = pd.DataFrame(rows)
    return frame.dropna().reset_index(drop=True)


def recursive_forecast(model, history, timestamps, zone_ids):
    working = history.copy()
    rows = []
    for timestamp in timestamps:
        for zone_id in zone_ids:
            features = feature_row(working, timestamp, zone_id)
            prediction = max(0.0, float(model.predict(pd.DataFrame([features])[FEATURES])[0]))
            rows.append({"timestamp": timestamp, "zone_id": zone_id, "predicted_pickups": prediction})
            working = pd.concat([working, pd.DataFrame([{"timestamp": timestamp, "zone_id": zone_id, "pickups": prediction}])], ignore_index=True)
    return pd.DataFrame(rows)


def metrics(predictions):
    y_true, y_pred = predictions["actual"], predictions["predicted_pickups"]
    return {"rows": len(predictions), "mae": mean_absolute_error(y_true, y_pred),
            "rmse": math.sqrt(mean_squared_error(y_true, y_pred)), "r2": r2_score(y_true, y_pred)}


def evaluate(model, history, target, zone_ids):
    forecast = recursive_forecast(model, history[history["timestamp"] < target["timestamp"].min()],
                                  sorted(target["timestamp"].unique()), zone_ids)
    actual = target.rename(columns={"pickups": "actual"})
    return metrics(forecast.merge(actual, on=["timestamp", "zone_id"])), forecast


def main():
    zones = top_zones()
    zone_ids = [row["zone_id"] for row in zones]
    history = complete_history(zone_ids)
    train_end = hourly_counts(SPLITS["train"], zone_ids)["timestamp"].max()
    validation = hourly_counts(SPLITS["validation"], zone_ids)
    test = hourly_counts(SPLITS["test"], zone_ids)
    train = history[history["timestamp"] <= train_end]
    train_frame = training_frame(train, train["timestamp"].min() + pd.Timedelta(hours=168), train_end)
    model = LGBMRegressor(n_estimators=350, learning_rate=0.06, num_leaves=63,
                          min_child_samples=30, random_state=42, n_jobs=4,
                          deterministic=True, force_col_wise=True, verbosity=-1)
    model.fit(train_frame[FEATURES], train_frame["target"], categorical_feature=["zone_id"])
    validation_metrics, _ = evaluate(model, train, validation, zone_ids)
    validation_metrics.update(model="LGBMRegressor", train_rows=len(train_frame), evaluation="recursive")
    test_history = pd.concat([train, validation], ignore_index=True)
    test_metrics, _ = evaluate(model, test_history, test, zone_ids)
    test_metrics.update(model="LGBMRegressor", train_rows=len(train_frame), evaluation="recursive")
    metrics_dir = ROOT / "results/metrics"
    metrics_dir.mkdir(parents=True, exist_ok=True)
    pl.DataFrame([validation_metrics]).write_csv(metrics_dir / "demand_model_comparison.csv")
    pl.DataFrame([test_metrics]).write_csv(metrics_dir / "demand_test_metrics.csv")
    model_path = ROOT / "models/demand_model.pkl"
    joblib.dump({"model": model, "model_name": "LGBMRegressor", "features": FEATURES,
                 "zones": zones, "validation": validation_metrics, "test": test_metrics,
                 "forecast_type": "recursive", "frequency": "hourly", "random_state": 42}, model_path, compress=3)
    forecast_dir = ROOT / "results/forecasts"
    forecast_dir.mkdir(parents=True, exist_ok=True)
    last_timestamp = history["timestamp"].max()
    for horizon in HORIZONS:
        future = pd.date_range(last_timestamp + pd.Timedelta(hours=1), periods=horizon, freq="h")
        forecast = recursive_forecast(model, history, future, zone_ids)
        forecast = forecast.merge(pd.DataFrame(zones), on="zone_id", how="left")
        forecast[["timestamp", "zone_id", "zone_name", "predicted_pickups"]].to_csv(
            forecast_dir / f"demand_forecast_{horizon}h.csv", index=False)
    print(json.dumps({"zones": zones, "validation": validation_metrics, "test": test_metrics,
                      "features": FEATURES, "model": str(model_path)}, default=str))


if __name__ == "__main__":
    main()


if __name__ == "__main__":
    main()
