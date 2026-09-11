from datetime import datetime
from pathlib import Path

import joblib
import numpy as np
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from src.urbanflow.api.routes.duration import router as duration_router
from src.urbanflow.api.routes.demand import router as demand_router


PROJECT_ROOT = Path(__file__).resolve().parents[3]
MODEL_PATH = PROJECT_ROOT / "models" / "fare_model.pkl"

fare_model = joblib.load(MODEL_PATH)

app = FastAPI(
    title="UrbanFlow Fare Prediction API",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(duration_router)
app.include_router(demand_router)


class FarePredictionRequest(BaseModel):
    provider_code: int
    pickup_timestamp: datetime
    rider_count: float | None = None
    rate_class_id: float | None = None
    origin_loc_id: int
    dest_loc_id: int


class FarePredictionResponse(BaseModel):
    predicted_base_fare: float


@app.get("/")
def root():
    return {"message": "UrbanFlow Fare Prediction API is running"}


@app.get("/health")
def health():
    return {
        "status": "ok",
        "model": "DecisionTreeRegressor",
        "model_path": str(MODEL_PATH)
    }


@app.post("/api/fare/predict", response_model=FarePredictionResponse)
def predict_fare(request: FarePredictionRequest):
    rider_count = request.rider_count if request.rider_count is not None else 1.0
    rate_class_id = request.rate_class_id if request.rate_class_id is not None else 1.0

    pickup_hour = request.pickup_timestamp.hour
    pickup_day_of_week = request.pickup_timestamp.isoweekday()
    pickup_month = request.pickup_timestamp.month
    is_weekend = int(pickup_day_of_week >= 6)

    features = np.array(
        [[
            request.provider_code,
            rider_count,
            rate_class_id,
            request.origin_loc_id,
            request.dest_loc_id,
            pickup_hour,
            pickup_day_of_week,
            pickup_month,
            is_weekend,
        ]],
        dtype=np.float32
    )

    prediction = fare_model.predict(features)[0]

    return FarePredictionResponse(
        predicted_base_fare=round(float(prediction), 2)
    )
