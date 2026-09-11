"""Generate Overview history from cleaned trips; run from the project virtualenv.

Calendar dates use the stored pickup timestamps without timezone conversion.
Weeks run Monday 00:00 through the following Monday (exclusive). Boundary
weeks contain only the available cleaned-data dates. No fares are rounded.
"""

import json
import math
from pathlib import Path

import polars as pl

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "data/processed/trips_clean.parquet"
OUTPUT = ROOT / "dashboard/src/data/generated"


def main():
    # Project only the required columns and aggregate before materialization.
    daily = (
        pl.scan_parquet(SOURCE)
        .select(pl.col("pickup_timestamp").dt.date().alias("date"), "base_fare")
        .group_by("date")
        .agg(
            pl.len().cast(pl.Int64).alias("trip_count"),
            pl.col("base_fare").sum().alias("base_fare_revenue"),
            (pl.col("base_fare").is_null() | ~pl.col("base_fare").is_finite())
            .sum().alias("invalid_fares"),
        )
        .sort("date")
        .collect(engine="streaming")
    )
    if daily.is_empty() or daily["date"].null_count():
        raise ValueError("Cleaned trips must have valid pickup dates.")
    if daily["invalid_fares"].sum():
        raise ValueError("Cleaned trips contain missing or non-finite base fares.")
    daily = daily.drop("invalid_fares")
    # Include any calendar dates with zero trips within the observed period.
    calendar = pl.DataFrame({"date": pl.date_range(
        daily["date"].min(), daily["date"].max(), interval="1d", eager=True
    )})
    daily = calendar.join(daily, on="date", how="left").fill_null(0).sort("date")
    # Summing daily groups is equivalent to grouping the same trips by week.
    weekly = (
        daily.with_columns(pl.col("date").dt.truncate("1w").alias("week_start"))
        .group_by("week_start")
        .agg(pl.col("trip_count").sum(), pl.col("base_fare_revenue").sum())
        .sort("week_start")
    )
    trips = daily["trip_count"].sum()
    revenue = math.fsum(daily["base_fare_revenue"])
    if trips != weekly["trip_count"].sum() or not math.isclose(
        revenue, math.fsum(weekly["base_fare_revenue"]), rel_tol=1e-12, abs_tol=0.01
    ):
        raise ValueError("Daily and weekly aggregates do not reconcile.")
    OUTPUT.mkdir(parents=True, exist_ok=True)
    for name, frame, date_column in [
        ("overview_daily.json", daily, "date"),
        ("overview_weekly.json", weekly, "week_start"),
    ]:
        records = frame.with_columns(pl.col(date_column).dt.strftime("%Y-%m-%d")).to_dicts()
        (OUTPUT / name).write_text(
            json.dumps(records, indent=2, allow_nan=False) + "\n", encoding="utf-8"
        )
        print(f"{name}: {len(records)} records")
    print(f"Date range: {daily['date'].min()} to {daily['date'].max()}")
    print(f"Total trip_count: {trips:,}")
    print(f"Total base_fare_revenue: {revenue:,.6f}")
    print(f"Trip difference vs verified 44,286,676: {trips - 44_286_676:,}")
    print(f"Revenue difference vs approximate 918,280,000: {revenue - 918_280_000:,.6f}")
    print("Weekly totals reconcile with daily totals; weeks start Monday.")


if __name__ == "__main__":
    main()
