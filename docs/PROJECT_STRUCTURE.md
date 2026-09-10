# Project structure and quick start

```text
UrbanFlow-Datathon-2026/
|-- configs/paths.json         # Paths relative to this project root
|-- data/                     # Private raw/interim/processed data and splits
|-- docs/
|   |-- challenge/            # Original brief and data dictionary
|   |-- architecture/         # Pipeline diagrams
|   |-- TEAM_WORKFLOW.md      # Ownership and shared decisions
|-- notebooks/                # Numbered starter notebooks
|-- src/urbanflow/
|   |-- preprocessing/        # Loading, schema, anomaly handling
|   |-- features/             # Shared feature transformations
|   |-- models/               # Fare and duration training/inference code
|   |-- forecasting/          # Hourly aggregation and forecasting
|   |-- spatial/              # Hotspots, clustering, origin-destination flows
|   |-- utils/                # Shared utilities
|-- scripts/                  # Runnable pipeline entry points
|-- models/                   # Trained artifacts, excluded from Git
|-- results/                  # Figures, metrics, forecasts, maps
|-- dashboard/                # Management dashboard implementation
|-- ai_assistant/             # Optional bonus implementation
|-- reports/                  # Report source and final report
|-- submission/               # Private final submission package
|-- TeamName_FinalNotebook.ipynb
|-- requirements.txt
|-- .gitignore
|-- README.md
```

Taxi CSVs temporarily remain in the original root-level dataset directory because
of file locks. See `data/README.md`; configured loading already points there.

## Start from this directory in PowerShell

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe scripts/check_layout.py
.\.venv\Scripts\python.exe -m jupyterlab
```

The notebooks contain task outlines, not completed analysis or trained models.
Keep reusable implementation in `src/urbanflow`; notebooks explain and call it.
Dependency versions are intentionally unpinned until the team verifies a common
environment. Record the validated versions before the final submission.
