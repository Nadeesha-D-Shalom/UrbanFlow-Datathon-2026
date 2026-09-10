# Data locations

- `raw/taxi/`: intended destination for the monthly taxi CSVs.
- `raw/zones/`: supplied zone lookup.
- `archives/`: original dataset archive.
- `interim/`: temporary transformations and development samples.
- `processed/`: cleaned, reusable Parquet partitions.
- `splits/train/`, `splits/validation/`, `splits/test/`: chronological task-specific splits.

The 12 taxi CSVs remain together in the original root-level
`Urban_Flow_Analytics_Dataset_csv/Urban_Flow_Analytics_Dataset_csv/` directory
because another process held files open during setup. `configs/paths.json`
points there. Once files are unlocked, move the monthly CSVs into `raw/taxi/`
and update `taxi_data` in that configuration. Ignore `__MACOSX` metadata.

Keep originals unchanged. Document sampling, cleaning rules, feature availability,
and split boundaries before producing derived data. Never publish competition
records or derivatives without organizer authorization. Ignore rules do not remove
files already tracked in Git or historical commits.
