"""Shared pre-trip duration feature contract for training and serving."""
import numpy as np
import polars as pl

INPUTS = ["provider_code", "rider_count", "rate_class_id", "origin_loc_id", "dest_loc_id", "pickup_timestamp"]
FEATURES = INPUTS[:5] + ["pickup_hour", "pickup_day_of_week", "pickup_month", "is_weekend"]

def feature_matrix(frame, imputation):
    # Explicit allowlist: post-trip columns can never enter the model matrix.
    return frame.select(
        *[pl.col(c).cast(pl.Float32).fill_null(imputation[c]) if c in imputation
          else pl.col(c).cast(pl.Float32) for c in INPUTS[:5]],
        pl.col("pickup_timestamp").dt.hour().cast(pl.Float32).alias("pickup_hour"),
        pl.col("pickup_timestamp").dt.weekday().cast(pl.Float32).alias("pickup_day_of_week"),
        pl.col("pickup_timestamp").dt.month().cast(pl.Float32).alias("pickup_month"),
        (pl.col("pickup_timestamp").dt.weekday() >= 6).cast(pl.Float32).alias("is_weekend"),
    ).to_numpy(order="c")

def target_minutes(frame):
    return frame.select(
        ((pl.col("dropoff_timestamp") - pl.col("pickup_timestamp")).dt.total_microseconds()
         / 60_000_000).alias("target")
    ).to_series().to_numpy()

def predict_model(model, matrix):
    if hasattr(model, "booster_"):
        return model.booster_.predict(matrix, num_threads=4)
    return model.predict(matrix)

def predict_records(bundle, records):
    matrix = feature_matrix(pl.DataFrame(records), bundle["imputation"])
    if not np.isfinite(matrix).all():
        raise ValueError("Pre-trip inputs must be finite.")
    return predict_model(bundle["model"], matrix)
