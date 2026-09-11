"""Generate period-based pickup, dropoff, and OD rankings from cleaned trips."""
import json
from pathlib import Path

import polars as pl

ROOT = Path(__file__).resolve().parents[1]
TRIPS = ROOT / "data/processed/trips_clean.parquet"
REFERENCE = ROOT / "data/raw/zones/Urban_Flow_Analytics_Zone_Dataset.csv"
RESULTS = ROOT / "results"
FRONTEND = ROOT / "dashboard/src/data/generated"
PERIODS = {"Morning": (6, 10), "Midday": (10, 16), "Evening": (16, 20), "Night": (20, 30)}


def period_expr():
    hour = pl.col("pickup_timestamp").dt.hour()
    return (pl.when((hour >= 6) & (hour < 10)).then(pl.lit("Morning"))
            .when((hour >= 10) & (hour < 16)).then(pl.lit("Midday"))
            .when((hour >= 16) & (hour < 20)).then(pl.lit("Evening"))
            .otherwise(pl.lit("Night")).alias("period"))


def zone_reference():
    return pl.scan_csv(REFERENCE).select(
        pl.col("loc_id").cast(pl.Int64).alias("zone_id"),
        pl.col("zone_name"), pl.col("borough_name").alias("borough"),
        pl.col("service_zone"),
        ).collect()


def ranked(frame, count_col, zone_col):
    return (frame.sort(["period", count_col, zone_col], descending=[False, True, False])
            .with_columns((pl.col(count_col) / pl.col(count_col).sum().over("period")).alias("share"))
            .with_columns(pl.col("period").cum_count().over("period").alias("rank")))


def main():
    zones = zone_reference()
    base = (pl.scan_parquet(TRIPS)
            .select("pickup_timestamp", "origin_loc_id", "dest_loc_id")
            .with_columns(period_expr()))
    pickup = (base.group_by(["period", pl.col("origin_loc_id").cast(pl.Int64).alias("zone_id")])
              .agg(pl.len().alias("pickup_count")).collect(engine="streaming"))
    dropoff = (base.group_by(["period", pl.col("dest_loc_id").cast(pl.Int64).alias("zone_id")])
              .agg(pl.len().alias("dropoff_count")).collect(engine="streaming"))
    pickup = (pickup.join(zones, on="zone_id", how="left")
              .with_columns(pl.col("zone_name").fill_null(pl.concat_str([pl.lit("Unmatched zone "), pl.col("zone_id")])))
              .pipe(ranked, "pickup_count", "zone_id"))
    dropoff = (dropoff.join(zones, on="zone_id", how="left")
               .with_columns(pl.col("zone_name").fill_null(pl.concat_str([pl.lit("Unmatched zone "), pl.col("zone_id")])))
               .pipe(ranked, "dropoff_count", "zone_id"))
    flows = (base.group_by(["period", pl.col("origin_loc_id").cast(pl.Int64).alias("origin_zone_id"),
                           pl.col("dest_loc_id").cast(pl.Int64).alias("destination_zone_id")])
             .agg(pl.len().alias("trip_count")).collect(engine="streaming"))
    period_totals = flows.group_by("period").agg(pl.col("trip_count").sum().alias("period_total"))
    flows = (flows.join(zones.rename({"zone_id": "origin_zone_id", "zone_name": "origin_zone_name",
                                      "borough": "origin_borough"}), on="origin_zone_id", how="left")
             .join(zones.rename({"zone_id": "destination_zone_id", "zone_name": "destination_zone_name",
                                 "borough": "destination_borough"}), on="destination_zone_id", how="left")
             .join(period_totals, on="period")
             .with_columns((pl.col("trip_count") / pl.col("period_total")).alias("share"))
             .sort(["period", "trip_count", "origin_zone_id", "destination_zone_id"], descending=[False, True, False, False])
             .with_columns(pl.col("period").cum_count().over("period").alias("rank")))
    hotspot_csv = pl.concat([
        pickup.select("period", "zone_id", "zone_name", "borough", "service_zone",
                      pl.lit("pickup").alias("metric"), pl.col("pickup_count").alias("count"), "share", "rank"),
        dropoff.select("period", "zone_id", "zone_name", "borough", "service_zone",
                       pl.lit("dropoff").alias("metric"), pl.col("dropoff_count").alias("count"), "share", "rank"),
    ])
    RESULTS.mkdir(parents=True, exist_ok=True)
    FRONTEND.mkdir(parents=True, exist_ok=True)
    hotspot_csv.write_csv(RESULTS / "hotspots_by_period.csv")
    flows.write_csv(RESULTS / "od_flows_by_period.csv")
    (FRONTEND / "hotspots.json").write_text(json.dumps({
        "pickup": pickup.filter(pl.col("rank") <= 5).to_dicts(),
        "dropoff": dropoff.filter(pl.col("rank") <= 5).to_dicts(),
    }, allow_nan=False), encoding="utf-8")
    (FRONTEND / "od_flows.json").write_text(json.dumps(
        flows.filter(pl.col("rank") <= 10).to_dicts(), allow_nan=False), encoding="utf-8")
    unmatched_pickup = pickup.filter(pl.col("borough").is_null()).select("zone_id").unique().to_series().to_list()
    unmatched_dropoff = dropoff.filter(pl.col("borough").is_null()).select("zone_id").unique().to_series().to_list()
    unmatched_flows = flows.filter(pl.col("origin_borough").is_null() | pl.col("destination_borough").is_null())
    print(json.dumps({"periods": list(PERIODS), "pickup_rows": pickup.height, "dropoff_rows": dropoff.height,
                      "flow_rows": flows.height, "unmatched_pickup": unmatched_pickup,
                      "unmatched_dropoff": unmatched_dropoff, "unmatched_flow_rows": unmatched_flows.height}, default=str))


if __name__ == "__main__":
    main()