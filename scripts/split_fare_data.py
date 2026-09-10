from pathlib import Path
from datetime import datetime
import polars as pl

PROJECT_ROOT = Path(__file__).resolve().parents[1]

INPUT_FILE = (
    PROJECT_ROOT
    / "data"
    / "processed"
    / "fare_features_imputed.parquet"
)

SPLIT_DIR = PROJECT_ROOT / "data" / "splits"

TRAIN_FILE = SPLIT_DIR / "fare_train.parquet"
VALID_FILE = SPLIT_DIR / "fare_validation.parquet"
TEST_FILE = SPLIT_DIR / "fare_test.parquet"

EXPECTED_START = datetime(2025, 4, 1, 0, 0, 0)
EXPECTED_END = datetime(2026, 3, 31, 23, 59, 59)

data = (
    pl.scan_parquet(INPUT_FILE)
    .filter(
        (pl.col("pickup_timestamp") >= EXPECTED_START)
        & (pl.col("pickup_timestamp") <= EXPECTED_END)
    )
    .sort("pickup_timestamp")
)

row_count = data.select(
    pl.len().alias("rows")
).collect()["rows"][0]

train_end = int(row_count * 0.70)
valid_end = int(row_count * 0.85)

train = data.slice(0, train_end)

validation = data.slice(
    train_end,
    valid_end - train_end
)

test = data.slice(
    valid_end,
    row_count - valid_end
)

train.sink_parquet(TRAIN_FILE, compression="zstd")
validation.sink_parquet(VALID_FILE, compression="zstd")
test.sink_parquet(TEST_FILE, compression="zstd")

print(f"Valid rows: {row_count:,}")
print(f"Train rows: {train_end:,}")
print(f"Validation rows: {valid_end - train_end:,}")
print(f"Test rows: {row_count - valid_end:,}")

print("\nSaved:")
print(TRAIN_FILE)
print(VALID_FILE)
print(TEST_FILE)