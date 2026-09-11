import csv
from pathlib import Path

from fastapi import APIRouter, HTTPException, Query

router = APIRouter()
ROOT = Path(__file__).resolve().parents[4]
FORECASTS = ROOT / "results/forecasts"


@router.get("/api/demand/forecast")
def demand_forecast(horizon: int = Query(24, description="Forecast horizon in hours")):
    if horizon not in {24, 48, 72}:
        raise HTTPException(status_code=422, detail="horizon must be one of 24, 48, or 72")
    path = FORECASTS / f"demand_forecast_{horizon}h.csv"
    if not path.exists():
        raise HTTPException(status_code=503, detail="Demand forecast is unavailable.")
    with path.open(newline="", encoding="utf-8") as handle:
        rows = [{**row, "zone_id": int(row["zone_id"]),
                 "predicted_pickups": round(float(row["predicted_pickups"]), 2)}
                for row in csv.DictReader(handle)]
    return {"horizon_hours": horizon, "rows": rows}