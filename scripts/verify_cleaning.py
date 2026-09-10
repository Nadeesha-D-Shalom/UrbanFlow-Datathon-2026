from pathlib import Path
import polars as pl

PROJECT_ROOT = Path(__file__).resolve().parents[1]

CLEAN_FILE = (
    PROJECT_ROOT
    / "data"
    / "processed"
    / "trips_clean.parquet"
)

print("Checking cleaned dataset...\n")

if not CLEAN_FILE.exists():
    raise FileNotFoundError(
        f"Cleaned dataset not found: {CLEAN_FILE}"
    )

print(f"File found: {CLEAN_FILE}")

df = pl.scan_parquet(CLEAN_FILE)

schema = df.collect_schema()

print(f"Columns: {len(schema)}")

row_count = df.select(
    pl.len().alias("rows")
).collect().item()

print(f"Rows: {row_count:,}")

duration = (
    (
        pl.col("dropoff_timestamp")
        - pl.col("pickup_timestamp")
    )
    .dt.total_seconds()
    / 60
)

speed = (
    pl.col("distance_miles")
    /
    (duration / 60)
)

checks = df.select(
    [
        (pl.col("base_fare") < 0)
        .sum()
        .alias("negative_fare"),

        (
            (pl.col("distance_miles") == 0)
            &
            (pl.col("base_fare") != 0)
        )
        .sum()
        .alias("zero_distance_nonzero_fare"),

        (pl.col("rider_count") == 0)
        .fill_null(False)
        .sum()
        .alias("zero_rider_count"),

        (
            pl.col("dropoff_timestamp")
            <
            pl.col("pickup_timestamp")
        )
        .sum()
        .alias("dropoff_before_pickup"),

        (duration <= 0)
        .sum()
        .alias("non_positive_duration"),

        (
            (duration > 0)
            &
            (speed > 80)
        )
        .sum()
        .alias("speed_over_80"),

        (
            pl.col("pickup_timestamp")
            < pl.datetime(2025, 4, 1)
        )
        .sum()
        .alias("before_expected_period"),

        (
            pl.col("pickup_timestamp")
            >= pl.datetime(2026, 4, 1)
        )
        .sum()
        .alias("after_expected_period"),
    ]
).collect()

print("\nCleaning verification:\n")

all_passed = True

for column in checks.columns:
    count = checks[column][0]

    status = "PASS" if count == 0 else "FAIL"

    if count != 0:
        all_passed = False

    print(
        f"{column}: "
        f"{count:,} -> {status}"
    )

if row_count != 44_286_676:
    all_passed = False
    print(
        "\nRow count: FAIL "
        f"(expected 44,286,676, found {row_count:,})"
    )
else:
    print("\nRow count: PASS")

if all_passed:
    print("\nFINAL RESULT: CLEANING VERIFICATION PASSED")
else:
    print("\nFINAL RESULT: CLEANING VERIFICATION FAILED")