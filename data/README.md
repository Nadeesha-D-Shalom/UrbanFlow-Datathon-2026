# Data locations

- raw/taxi/: 12 original monthly taxi CSVs, April 2025 through March 2026.
- raw/zones/: original zone reference CSV.
- archives/: original dataset ZIP.
- interim/: pending combined_taxi_data.parquet and anomaly_summary.csv.
- processed/: pending trips_clean.parquet, fare_features.parquet, eta_features.parquet,
  hourly_demand.parquet, zone_statistics.parquet, and od_flows.parquet.
- splits/: pending {fare,eta,demand}_{train,validation,test}.parquet files.

Generated files are created only when their pipelines are implemented and run.
Preserve raw data. Fit learned transformations on training data only.
Keep competition data and derivatives private. Dictionaries and brief are in docs/challenge/.
