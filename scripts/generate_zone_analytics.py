"""Generate pickup rankings without modifying the cleaned trips or zone reference.

Run: python scripts/generate_zone_analytics.py (using the project virtualenv).
Shares are fractions of all cleaned trips, including unmatched origin IDs.
All reference zones are retained, including zones with zero pickups. Unmatched
IDs are retained as explicitly named groups so counts cannot silently disappear.
Ties are ordered by zone ID; rank is a deterministic one-based row number.
"""

import json
import math
from pathlib import Path

import polars as pl

ROOT = Path(__file__).resolve().parents[1]
TRIPS = ROOT / "data/processed/trips_clean.parquet"
REFERENCE = ROOT / "data/raw/zones/Urban_Flow_Analytics_Zone_Dataset.csv"
OUTPUT = ROOT / "dashboard/src/data/generated/zone_activity.json"


def main():
    # These are the inspected CSV column names, not inferred geographic fields.
    zones = pl.scan_csv(REFERENCE).select(
        pl.col("loc_id").cast(pl.Int64).alias("zone_id"),
        pl.col("zone_name"),
        pl.col("borough_name").alias("area"),
        pl.col("service_zone").alias("service_area"),
        pl.lit(True).alias("reference_matched"),
    ).collect()
    if zones["zone_id"].null_count() or zones["zone_id"].n_unique() != zones.height:
        raise ValueError("Zone reference IDs must be unique and non-null.")
    counts = (
        pl.scan_parquet(TRIPS)
        .select(pl.col("origin_loc_id").cast(pl.Int64).alias("zone_id"))
        .group_by("zone_id")
        .agg(pl.len().cast(pl.Int64).alias("pickup_count"))
        .collect(engine="streaming")
    )
    total = counts["pickup_count"].sum()
    if not total:
        raise ValueError("No cleaned trips are available.")
    ranked = (
        zones.join(counts, on="zone_id", how="full", coalesce=True)
        .with_columns(
            pl.col("pickup_count").fill_null(0),
            pl.col("reference_matched").fill_null(False),
        )
        .with_columns(
            pl.when(~pl.col("reference_matched"))
            .then(pl.concat_str([
                pl.lit("Unmatched origin ID: "),
                pl.col("zone_id").cast(pl.String).fill_null("missing"),
            ]))
            .otherwise(pl.col("zone_name")).alias("zone_name"),
            (pl.col("pickup_count") / total).alias("share_of_total_pickups"),
        )
        .sort(["pickup_count", "zone_id"], descending=[True, False], nulls_last=True)
        .with_row_index("rank", offset=1)
        .select("zone_id", "zone_name", "area", "service_area", "pickup_count",
                "share_of_total_pickups", "rank", "reference_matched")
    )
    unmatched = ranked.filter(~pl.col("reference_matched"))["pickup_count"].sum()
    if ranked["pickup_count"].sum() != total or not math.isclose(
        ranked["share_of_total_pickups"].sum(), 1.0
    ):
        raise ValueError("Zone counts and shares do not reconcile.")
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(ranked.to_dicts(), indent=2, allow_nan=False) + "\n",
                      encoding="utf-8")
    print(f"Reference zones: {zones.height}; output zone groups: {ranked.height}")
    print("Top 5 pickup zones:")
    for row in ranked.head(5).to_dicts():
        print(f"{row['rank']}. {row['zone_name']} ({row['area']}): "
              f"{row['pickup_count']:,} pickups; {row['share_of_total_pickups']:.4%}")
    print(f"Sum of pickup_count: {total:,}")
    print(f"Reconciles with 44,286,676: {total == 44_286_676}")
    print(f"Trips with unmatched origin_loc_id: {unmatched:,}")
    print(f"Written: {OUTPUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
