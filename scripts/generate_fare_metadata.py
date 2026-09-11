"""Export observed fare-form options; does not change data or train models."""
import json
from pathlib import Path
import polars as pl

ROOT = Path(__file__).resolve().parents[1]

def main():
    metadata = pl.scan_parquet(ROOT / "data/processed/trips_clean.parquet").select(
        pl.col("provider_code").drop_nulls().unique().sort().implode().alias("provider_codes"),
        pl.col("rate_class_id").drop_nulls().unique().sort().implode().alias("rate_class_ids"),
        pl.col("rider_count").min().alias("rider_count_min"),
        pl.col("rider_count").max().alias("rider_count_max"),
    ).collect(engine="streaming").to_dicts()[0]
    metadata["source"] = "data/processed/trips_clean.parquet"
    target = ROOT / "dashboard/src/data/generated/fare_metadata.json"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(metadata, indent=2, allow_nan=False) + "\n", encoding="utf-8")
    print(json.dumps(metadata, indent=2))

if __name__ == "__main__":
    main()
