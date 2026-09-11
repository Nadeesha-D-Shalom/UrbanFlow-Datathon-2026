"""Runtime adapter for the verified teammate ETA model bundle."""
import json
from functools import lru_cache
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[3]
ETA_ROOT = ROOT / "integration/eta"
MODEL_PATH = ETA_ROOT / "UrbanFlow_AI_Final_ETA_LightGBM.pkl"
STATS_PATH = ETA_ROOT / "historical_global_stats.json"
LOOKUPS = {
    "od_lookup": "od_lookup.parquet",
    "od_hour_lookup": "od_hour_lookup.parquet",
    "origin_hour_lookup": "origin_hour_lookup.parquet",
    "dest_hour_lookup": "dest_hour_lookup.parquet",
    "origin_lookup": "origin_lookup.parquet",
    "dest_lookup": "dest_lookup.parquet",
}


def build_static_eta_features(frame):
    frame = frame.copy()
    frame["pickup_timestamp"] = pd.to_datetime(frame["pickup_timestamp"])
    timestamp = frame["pickup_timestamp"]
    frame["pickup_hour"] = timestamp.dt.hour
    frame["pickup_dow"] = timestamp.dt.dayofweek
    frame["pickup_month"] = timestamp.dt.month
    frame["pickup_day"] = timestamp.dt.day
    frame["pickup_week"] = timestamp.dt.isocalendar().week.astype(int)
    frame["is_weekend"] = (frame["pickup_dow"] >= 5).astype(int)
    frame["is_rush_hour"] = frame["pickup_hour"].isin([7, 8, 9, 16, 17, 18, 19]).astype(int)
    frame["is_night"] = ((frame["pickup_hour"] <= 5) | (frame["pickup_hour"] >= 22)).astype(int)
    frame["same_zone"] = (frame["origin_loc_id"] == frame["dest_loc_id"]).astype(int)
    frame["rider_count_missing"] = frame["rider_count"].isna().astype(int)
    frame["hour_sin"] = np.sin(2 * np.pi * frame["pickup_hour"] / 24)
    frame["hour_cos"] = np.cos(2 * np.pi * frame["pickup_hour"] / 24)
    frame["dow_sin"] = np.sin(2 * np.pi * frame["pickup_dow"] / 7)
    frame["dow_cos"] = np.cos(2 * np.pi * frame["pickup_dow"] / 7)
    frame["month_sin"] = np.sin(2 * np.pi * (frame["pickup_month"] - 1) / 12)
    frame["month_cos"] = np.cos(2 * np.pi * (frame["pickup_month"] - 1) / 12)
    return frame


def add_historical_features_for_prediction(frame, stats, lookups):
    frame = frame.copy()
    frame["global_mean_duration"] = stats["global_mean_duration"]
    frame["global_median_duration"] = stats["global_median_duration"]
    frame = frame.merge(lookups["od_lookup"], on=["origin_loc_id", "dest_loc_id"], how="left")
    frame = frame.rename(columns={"count": "od_trip_count", "mean": "od_mean_duration", "median": "od_median_duration"})
    frame = frame.merge(lookups["od_hour_lookup"], on=["origin_loc_id", "dest_loc_id", "pickup_hour"], how="left")
    frame = frame.rename(columns={"count": "od_hour_count", "mean": "od_hour_mean_duration", "median": "od_hour_median_duration"})
    frame = frame.merge(lookups["origin_hour_lookup"], on=["origin_loc_id", "pickup_hour"], how="left")
    frame = frame.rename(columns={"count": "origin_hour_count", "median": "origin_hour_median_duration"})
    frame = frame.merge(lookups["dest_hour_lookup"], on=["dest_loc_id", "pickup_hour"], how="left")
    frame = frame.rename(columns={"count": "dest_hour_count", "median": "dest_hour_median_duration"})
    frame = frame.merge(lookups["origin_lookup"], on="origin_loc_id", how="left")
    frame = frame.rename(columns={"count": "origin_trip_count", "median": "origin_median_duration"})
    frame = frame.merge(lookups["dest_lookup"], on="dest_loc_id", how="left")
    frame = frame.rename(columns={"count": "dest_trip_count", "median": "dest_median_duration"})
    frame["od_median_duration_missing"] = frame["od_median_duration"].isna().astype("int8")
    frame["od_hour_median_duration_missing"] = frame["od_hour_median_duration"].isna().astype("int8")
    frame["origin_hour_median_duration_missing"] = frame["origin_hour_median_duration"].isna().astype("int8")
    frame["dest_hour_median_duration_missing"] = frame["dest_hour_median_duration"].isna().astype("int8")
    duration_columns = ["od_mean_duration", "od_median_duration", "od_hour_mean_duration",
                        "od_hour_median_duration", "origin_hour_median_duration",
                        "dest_hour_median_duration", "origin_median_duration", "dest_median_duration"]
    for column in duration_columns:
        frame[column] = frame[column].fillna(stats["global_median_duration"])
    count_columns = ["od_trip_count", "od_hour_count", "origin_hour_count", "dest_hour_count",
                     "origin_trip_count", "dest_trip_count"]
    for column in count_columns:
        frame[column] = frame[column].fillna(0)
    frame["od_smoothed_duration"] = ((frame["od_trip_count"] * frame["od_mean_duration"]
        + stats["od_smoothing_alpha"] * stats["global_mean_duration"])
        / (frame["od_trip_count"] + stats["od_smoothing_alpha"]))
    frame["od_hour_smoothed_duration"] = ((frame["od_hour_count"] * frame["od_hour_mean_duration"]
        + stats["od_hour_smoothing_alpha"] * stats["global_mean_duration"])
        / (frame["od_hour_count"] + stats["od_hour_smoothing_alpha"]))
    for column in count_columns:
        frame[f"log_{column}"] = np.log1p(frame[column]).astype("float32")
    return frame


def prepare_for_model(frame, artifact):
    prepared = frame[artifact["features"]].copy()
    for column in artifact["categorical_columns"]:
        values = prepared[column].fillna("__MISSING__").astype(str)
        prepared[column] = values.map(artifact["category_maps"][column]).fillna(-1).astype("float32")
    for column in prepared.columns:
        if column not in artifact["categorical_columns"]:
            prepared[column] = pd.to_numeric(prepared[column], errors="coerce").fillna(
                artifact["numeric_medians"][column]).astype("float32")
    return prepared


@lru_cache(maxsize=1)
def load_eta_bundle():
    if not MODEL_PATH.exists() or not STATS_PATH.exists() or not all((ETA_ROOT / path).exists() for path in LOOKUPS.values()):
        raise FileNotFoundError("Complete teammate ETA package is unavailable.")
    artifact = joblib.load(MODEL_PATH)
    stats = json.loads(STATS_PATH.read_text(encoding="utf-8"))
    lookups = {name: pd.read_parquet(ETA_ROOT / path) for name, path in LOOKUPS.items()}
    return artifact, stats, lookups


def predict_records(records):
    artifact, stats, lookups = load_eta_bundle()
    frame = pd.DataFrame(records)
    frame["provider_code"] = pd.to_numeric(frame["provider_code"], errors="coerce")
    frame["rider_count"] = pd.to_numeric(frame["rider_count"], errors="coerce")
    frame["rate_class_id"] = pd.to_numeric(frame["rate_class_id"], errors="coerce")
    frame["origin_loc_id"] = pd.to_numeric(frame["origin_loc_id"], errors="coerce")
    frame["dest_loc_id"] = pd.to_numeric(frame["dest_loc_id"], errors="coerce")
    frame = add_historical_features_for_prediction(build_static_eta_features(frame), stats, lookups)
    prepared = prepare_for_model(frame, artifact)
    prediction = artifact["model"].predict(prepared)[0]
    return float(np.clip(prediction, 0, artifact["duration_upper_limit"]))