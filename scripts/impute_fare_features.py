from pathlib import Path
import polars as pl

PROJECT_ROOT = Path(__file__).resolve().parents[1]

INPUT_FILE = (
    PROJECT_ROOT
    / "data"
    / "processed"
    / "fare_features.parquet"
)

OUTPUT_FILE = (
    PROJECT_ROOT
    / "data"
    / "processed"
    / "fare_features_imputed.parquet"
)

data = pl.scan_parquet(INPUT_FILE)

imputed = data.with_columns(
    [
        pl.col("rider_count")
        .fill_null(-1)
        .alias("rider_count"),

        pl.col("rate_class_id")
        .fill_null(-1)
        .alias("rate_class_id"),
    ]
)

imputed.sink_parquet(
    OUTPUT_FILE,
    compression="zstd"
)

print("Imputed fare feature dataset saved to:")
print(OUTPUT_FILE)