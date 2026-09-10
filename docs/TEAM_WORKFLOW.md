# Four-member workflow

| Owner | Primary folders | First deliverable |
|---|---|---|
| Member 1: data and EDA | `src/urbanflow/preprocessing`, `src/urbanflow/features`, notebooks 01-02 | Schema, reproducible sample, anomaly audit, cleaned partitions |
| Member 2: fare and duration | `src/urbanflow/models`, notebooks 03-04 | Baselines, chronological evaluation, saved prediction pipelines |
| Member 3: demand and spatial | `src/urbanflow/forecasting`, `src/urbanflow/spatial`, notebooks 05-06 | Hourly counts, seasonal baseline, hotspot clusters and flows |
| Member 4: integration | `dashboard`, `docs/architecture`, `reports`, notebook 07 | Dashboard skeleton, architecture, integrated demonstration |

Each member owns a branch and writes their report section. Review changes before
merging. Coordinate shared schema and feature code with Member 1. Everyone helps
with final validation and submission; the AI assistant is an optional shared task.

## Shared decisions before training

1. Canonical names, types, and zone join keys; standardize `Airport_fee` explicitly.
2. Anomaly flags, treatment justifications, and counts before filtering.
3. Booking-time feature availability; exclude actual distance, drop-off time,
   actual duration, and settlement amounts from upfront prediction inputs.
4. Chronological split boundaries checked against actual timestamps. Fit learned
   preprocessing and historical statistics using training data only.
5. Prediction output schemas and metrics; use rolling forecast backtests.

## Deliverables

- Technical report: at most 20 pages; preprocessing/features at most one page.
- `TeamName_FinalNotebook.ipynb`, supporting notebooks, and source code.
- Trained `.pkl` pipelines and separate training, validation, and testing data.
- Architecture diagram and a 3-5 minute unlisted YouTube demo.
- Final archive: `TeamName_CodefestDatathon2026.zip` in `submission/`.

Replace `TeamName` with the actual team name at submission time. Required work is
sections 1-4 of the brief; dashboard and AI assistant are bonus tracks.
