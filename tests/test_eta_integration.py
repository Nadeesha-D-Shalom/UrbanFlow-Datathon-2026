import json
from pathlib import Path

import pytest

from src.urbanflow.models.eta import predict_records


ROOT = Path(__file__).resolve().parents[1]


def test_verified_eta_sample():
    sample = json.loads((ROOT / "integration/eta/eta_verification_sample.json").read_text(encoding="utf-8"))
    actual = predict_records([sample["input"]])
    assert actual == pytest.approx(sample["expected_eta_minutes"], abs=1e-4)