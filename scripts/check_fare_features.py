from pathlib import Path
import polars as pl

PROJECT_ROOT = Path(__file__).resolve().parents[1]

FARE_FILE = (
    PROJECT_ROOT
    / "data"
    / "processed"
    / "fare_features.parquet"
)

data = pl.scan_parquet(FARE_FILE)

row_count = data.select(
    pl.len().alias("rows")
).collect()["rows"][0]

print(f"Fare feature rows: {row_count:,}")

print("\nColumns:")
for name, dtype in data.collect_schema().items():
    print(f"{name}: {dtype}")

print("\nMissing values:")

missing = data.select(
    [
        pl.col(column).null_count().alias(column)
        for column in data.collect_schema().names()
    ]
).collect()

for column in missing.columns:
    print(f"{column}: {missing[column][0]:,}")