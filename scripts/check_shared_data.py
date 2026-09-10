from pathlib import Path
import polars as pl

PROJECT_ROOT = Path(__file__).resolve().parents[1]

FILE = (
    PROJECT_ROOT
    / "data"
    / "processed"
    / "trips_clean.parquet"
)

data = pl.scan_parquet(FILE)

print("SHARED PREPROCESSED DATASET CHECK")
print("=" * 50)

row_count = data.select(
    pl.len().alias("rows")
).collect()["rows"][0]

print(f"\nTotal rows: {row_count:,}")

print("\nColumns:")
for name, dtype in data.collect_schema().items():
    print(f"{name}: {dtype}")

required_fare = [
    "base_fare",
    "pickup_timestamp",
    "provider_code",
    "origin_loc_id",
    "dest_loc_id",
    "rider_count",
    "rate_class_id",
]

required_eta = [
    "trip_duration_minutes",
    "pickup_timestamp",
    "provider_code",
    "origin_loc_id",
    "dest_loc_id",
    "rider_count",
    "rate_class_id",
]

columns = data.collect_schema().names()

print("\nFARE TEAM CHECK:")
for column in required_fare:
    status = "FOUND" if column in columns else "MISSING"
    print(f"{column}: {status}")

print("\nETA TEAM CHECK:")
for column in required_eta:
    status = "FOUND" if column in columns else "MISSING"
    print(f"{column}: {status}")