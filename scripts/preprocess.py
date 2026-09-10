from pathlib import Path
import polars as pl

PROJECT_ROOT = Path(__file__).resolve().parents[1]

TAXI_DIR = PROJECT_ROOT / "data" / "raw" / "taxi"
ZONE_FILE = (
    PROJECT_ROOT
    / "data"
    / "raw"
    / "zones"
    / "Urban_Flow_Analytics_Zone_Dataset.csv"
)

taxi_files = sorted(
    TAXI_DIR.glob("Urban_Flow_Analytics_Taxi_Dataset_*.csv")
)

print("Taxi files found:", len(taxi_files))

if len(taxi_files) != 12:
    raise RuntimeError(
        f"Expected 12 monthly taxi files, but found {len(taxi_files)}"
    )

if not ZONE_FILE.exists():
    raise FileNotFoundError(
        f"Zone file not found: {ZONE_FILE}"
    )

reference_schema = None

for file in taxi_files:
    schema = pl.read_csv(file, n_rows=100).schema

    if reference_schema is None:
        reference_schema = schema
    elif schema != reference_schema:
        raise RuntimeError(
            f"Schema mismatch found in: {file.name}"
        )

print("All 12 raw taxi files passed schema verification.")

taxi_df = pl.concat(
    [
        pl.scan_csv(file)
        for file in taxi_files
    ],
    how="vertical"
).with_columns(
    [
        pl.col("pickup_timestamp")
        .str.strptime(
            pl.Datetime,
            strict=False
        ),

        pl.col("dropoff_timestamp")
        .str.strptime(
            pl.Datetime,
            strict=False
        ),

        pl.col("rider_count")
        .cast(
            pl.Int64,
            strict=False
        ),

        pl.col("rate_class_id")
        .cast(
            pl.Int64,
            strict=False
        ),

        pl.col("provider_code")
        .cast(
            pl.Int64,
            strict=False
        ),

        pl.col("origin_loc_id")
        .cast(
            pl.Int64,
            strict=False
        ),

        pl.col("dest_loc_id")
        .cast(
            pl.Int64,
            strict=False
        ),

        pl.col("fare_settlement_method")
        .cast(
            pl.Int64,
            strict=False
        ),
    ]
)

taxi_df = taxi_df.with_columns(
    (
        (
            pl.col("dropoff_timestamp")
            - pl.col("pickup_timestamp")
        )
        .dt.total_seconds()
        / 60
    ).alias("trip_duration_minutes")
)

taxi_df = taxi_df.with_columns(
    pl.when(
        pl.col("trip_duration_minutes") > 0
    )
    .then(
        pl.col("distance_miles")
        /
        (pl.col("trip_duration_minutes") / 60)
    )
    .otherwise(None)
    .alias("speed_mph")
)

taxi_df = taxi_df.with_columns(
    [
        (pl.col("base_fare") < 0)
        .alias("flag_negative_fare"),

        (
            (pl.col("distance_miles") == 0)
            &
            (pl.col("base_fare") != 0)
        )
        .alias("flag_zero_distance_nonzero_fare"),

        (pl.col("rider_count") == 0)
        .fill_null(False)
        .alias("flag_zero_rider_count"),

        (
            pl.col("dropoff_timestamp")
            <
            pl.col("pickup_timestamp")
        )
        .alias("flag_dropoff_before_pickup"),

        (
            pl.col("trip_duration_minutes") <= 0
        )
        .alias("flag_non_positive_duration"),

        (
            pl.col("speed_mph") > 80
        )
        .fill_null(False)
        .alias("flag_speed_over_80"),

        (
            pl.col("pickup_timestamp")
            < pl.datetime(2025, 4, 1)
        )
        .alias("flag_before_expected_period"),

        (
            pl.col("pickup_timestamp")
            >= pl.datetime(2026, 4, 1)
        )
        .alias("flag_after_expected_period"),
    ]
)

taxi_df = taxi_df.with_columns(
    (
        pl.col("flag_negative_fare")
        |
        pl.col("flag_zero_distance_nonzero_fare")
        |
        pl.col("flag_dropoff_before_pickup")
        |
        pl.col("flag_non_positive_duration")
        |
        pl.col("flag_speed_over_80")
        |
        pl.col("flag_before_expected_period")
        |
        pl.col("flag_after_expected_period")
    ).alias("remove_row")
)

before_cleaning = taxi_df.select(
    pl.len().alias("rows")
).collect().item()

rows_to_remove = taxi_df.select(
    pl.col("remove_row").sum()
).collect().item()

zero_rider_rows = taxi_df.select(
    pl.col("flag_zero_rider_count").sum()
).collect().item()

date_anomalies = taxi_df.select(
    [
        pl.col("flag_before_expected_period")
        .sum()
        .alias("before_expected_period"),

        pl.col("flag_after_expected_period")
        .sum()
        .alias("after_expected_period"),
    ]
).collect()

cleaned_df = (
    taxi_df
    .filter(~pl.col("remove_row"))
    .with_columns(
        pl.when(
            pl.col("rider_count") == 0
        )
        .then(None)
        .otherwise(pl.col("rider_count"))
        .alias("rider_count")
    )
)

after_cleaning = cleaned_df.select(
    pl.len().alias("rows")
).collect().item()

removed_percentage = (
    rows_to_remove / before_cleaning
) * 100

retained_percentage = (
    after_cleaning / before_cleaning
) * 100

print("\nCleaning summary:\n")

print(
    f"Original rows: "
    f"{before_cleaning:,}"
)

print(
    f"Rows removed: "
    f"{rows_to_remove:,} "
    f"({removed_percentage:.4f}%)"
)

print(
    f"Rows retained: "
    f"{after_cleaning:,} "
    f"({retained_percentage:.4f}%)"
)

print(
    f"Zero rider-count values identified: "
    f"{zero_rider_rows:,}"
)

print(
    f"Rows before 2025-04-01 identified: "
    f"{date_anomalies['before_expected_period'][0]:,}"
)

print(
    f"Rows on/after 2026-04-01 identified: "
    f"{date_anomalies['after_expected_period'][0]:,}"
)

remaining_zero_riders = cleaned_df.select(
    (
        pl.col("rider_count") == 0
    )
    .sum()
    .alias("remaining_zero_riders")
).collect().item()

print(
    f"Zero rider-count values remaining after cleaning: "
    f"{remaining_zero_riders:,}"
)

print("\nChecking cleaned pickup timestamp range...")

date_check = cleaned_df.select(
    [
        pl.col("pickup_timestamp")
        .min()
        .alias("min_pickup"),

        pl.col("pickup_timestamp")
        .max()
        .alias("max_pickup"),

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

print(
    f"Minimum pickup timestamp: "
    f"{date_check['min_pickup'][0]}"
)

print(
    f"Maximum pickup timestamp: "
    f"{date_check['max_pickup'][0]}"
)

print(
    f"Rows before 2025-04-01 remaining: "
    f"{date_check['before_expected_period'][0]:,}"
)

print(
    f"Rows on/after 2026-04-01 remaining: "
    f"{date_check['after_expected_period'][0]:,}"
)

print("\nCleaning rules applied successfully.")
print("No cleaned dataset has been saved yet.")

OUTPUT_FILE = (
    PROJECT_ROOT
    / "data"
    / "processed"
    / "trips_clean.parquet"
)

final_cleaned_df = cleaned_df.drop(
    [
        "flag_negative_fare",
        "flag_zero_distance_nonzero_fare",
        "flag_zero_rider_count",
        "flag_dropoff_before_pickup",
        "flag_non_positive_duration",
        "flag_speed_over_80",
        "flag_before_expected_period",
        "flag_after_expected_period",
        "remove_row",
    ]
)

print("\nSaving cleaned dataset...")
print(f"Output file: {OUTPUT_FILE}")

final_cleaned_df.sink_parquet(
    OUTPUT_FILE,
    compression="zstd"
)

print("\nCleaned dataset saved successfully.")