# UrbanFlow Datathon

Project scaffold for data quality analysis, upfront fare prediction, ETA prediction,
24-72 hour demand forecasting, and hotspot/origin-destination analysis.
The dashboard and AI assistant are optional bonus work.

## Status

The 12 monthly taxi CSVs and zone lookup are organized. Notebooks are starter
outlines; scripts and shared modules are explicitly unimplemented scaffolds.
No preprocessing, training, evaluation, or report generation has run.
Results CSVs contain headers only. Generated Parquet, pickle, and PDF files are
intentionally absent until real outputs exist.

## Structure

```text
.venv/
ai_assistant/assistant.py
configs/                 # fare_config.yaml, eta_config.yaml, demand_config.yaml, paths.json
dashboard/app.py
data/
  raw/taxi/              # 12 monthly CSVs
  raw/zones/             # zone lookup
  interim/
  processed/
  splits/                # task_train/validation/test.parquet outputs
  archives/
  README.md
docs/                    # architecture/, research/, challenge/ and team notes
models/                  # fare/, eta/, demand/
notebooks/
  01_eda.ipynb
  02_preprocessing.ipynb
  03_fare_prediction.ipynb
  04_eta_prediction.ipynb
  05_demand_forecasting.ipynb
  06_spatial_analysis.ipynb
reports/                 # figures/, final_report/
results/                 # fare_results.csv, eta_results.csv, demand_results.csv
scripts/                 # preprocess.py, create_splits.py, train_fare.py,
                         # train_eta.py, train_demand.py, check_layout.py
src/                     # data_cleaning.py, feature_engineering.py, metrics.py, utils.py
submission/TeamName_FinalNotebook.ipynb
.gitignore
README.md
requirements.txt
```

## Setup and input check

Run from this project directory:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe scripts/check_layout.py
.\.venv\Scripts\python.exe -m jupyterlab
```

Review docs/challenge/ before implementing analysis. Record each anomaly's count,
percentage, treatment, and justification. Use booking-time inputs for fare/ETA,
chronological splits, and training-only fitted preprocessing. Compare baselines
and justify evaluation metrics. See data/README.md for expected generated files.

## Submission

Populate submission/ with the completed final notebook, trained_model.pkl (or
multiple task-specific trained artifacts), and technical_report.pdf. Include code,
separate data splits, architecture, and a 3-5 minute demo link in the final package.
Report limit: 20 pages; preprocessing and features: one page.
Replace TeamName and produce TeamName_CodefestDatathon2026.zip.
Keep supplied data and derivatives confidential.
