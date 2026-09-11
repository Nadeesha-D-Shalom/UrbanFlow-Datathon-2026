from datetime import datetime
from functools import lru_cache
from pathlib import Path

import joblib
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from src.urbanflow.models.eta import predict_records as predict_eta_records
from src.urbanflow.models.duration import predict_records

router = APIRouter()
ARTIFACT = Path(__file__).resolve().parents[4] / "models/duration_model.pkl"

class DurationRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)
    provider_code: int
    pickup_timestamp: datetime
    rider_count: float | None = Field(default=None, ge=1, le=9)
    rate_class_id: float | None = None
    offline_record_flag: str = "N"
    origin_loc_id: int
    dest_loc_id: int

class DurationResponse(BaseModel):
    predicted_trip_duration_minutes: float

@lru_cache(maxsize=1)
def load_duration_model():
    if not ARTIFACT.exists():
        raise HTTPException(status_code=503, detail="Duration model is unavailable.")
    return joblib.load(ARTIFACT)

@router.post("/api/duration/predict", response_model=DurationResponse)
def predict_duration(request: DurationRequest):
    # Same allowlisted feature builder and saved training medians as evaluation.
    record = request.model_dump()
    record["pickup_timestamp"] = record["pickup_timestamp"].replace(tzinfo=None)
    try:
        value = predict_eta_records([record])
    except (FileNotFoundError, ImportError, OSError):
        value = float(predict_records(load_duration_model(), [record])[0])
    return DurationResponse(predicted_trip_duration_minutes=round(value, 4))
