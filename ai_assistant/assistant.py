"""UrbanFlow Natural-Language Mobility Assistant.

Deterministic NLP layer and grounded data/API routing without paid/external LLMs.
Uses real UrbanFlow models, generated datasets, and evaluation metrics.
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import sys
import unicodedata
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
import urllib.request
import urllib.error

PROJECT_ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = PROJECT_ROOT / "dashboard" / "src" / "data" / "generated"
RESULTS_DIR = PROJECT_ROOT / "results"
INTEGRATION_DIR = PROJECT_ROOT / "integration"


def normalize(text: str) -> str:
    """Normalize input string: unicode NFKC, lowercase, stripped punctuation."""
    norm = unicodedata.normalize("NFKC", text).lower()
    norm = norm.replace("’", "").replace("'", "")
    norm = re.sub(r"[^a-z0-9:./-]+", " ", norm)
    return norm.strip()


def period_for_hour(hour: int) -> str:
    """Map 24h hour to UrbanFlow named period."""
    if 6 <= hour < 10:
        return "Morning"
    if 10 <= hour < 16:
        return "Midday"
    if 16 <= hour < 20:
        return "Evening"
    return "Night"


RULES: dict[str, list[re.Pattern]] = {
    "demand_forecast": [
        re.compile(r"\b(demand|forecast|peak)\b"),
        re.compile(r"\b(drivers?|position|positioning)\b"),
    ],
    "historical_hotspots": [
        re.compile(r"\b(hotspots?|busiest|busy|pickups?|popular)\b"),
        re.compile(r"\btop\s+(pickup\s+)?zones\b"),
    ],
    "od_flows": [
        re.compile(r"\b(od|flows?|movements?|corridors?|pairs)\b"),
    ],
    "zone_clusters": [
        re.compile(r"\b(clusters?|clustering|groups?|similar)\b"),
    ],
    "fare_prediction": [
        re.compile(r"\b(fare|cost|price|charge)\b"),
    ],
    "eta_prediction": [
        re.compile(r"\b(eta|duration)\b"),
        re.compile(r"\bhow long\b"),
    ],
    "model_performance": [
        re.compile(r"\b(accurate|accuracy|performance|metrics?|mae|rmse|r2|evaluation)\b"),
    ],
    "data_quality": [
        re.compile(r"\b(quality|missing|duplicates?|cleaning|completeness)\b"),
    ],
    "overview": [
        re.compile(r"\b(revenue|overview|summary|earnings|total trips)\b"),
    ],
}


def load_json(path: Path) -> Any:
    if path.exists():
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    return {}


def load_csv(path: Path) -> list[dict[str, str]]:
    if path.exists():
        with open(path, encoding="utf-8") as f:
            reader = csv.DictReader(f)
            return list(reader)
    return []


def load_assistant_data() -> dict[str, Any]:
    return {
        "hotspots": load_json(DATA_DIR / "hotspots.json"),
        "od": load_json(DATA_DIR / "od_flows.json"),
        "clusters": load_json(DATA_DIR / "zone_clusters.json"),
        "daily": load_json(DATA_DIR / "overview_daily.json"),
        "zones": load_json(DATA_DIR / "zone_activity.json"),
        "metadata": load_json(DATA_DIR / "fare_metadata.json"),
        "eta": load_json(INTEGRATION_DIR / "eta" / "eta_model_metadata.json"),
        "fare": load_csv(RESULTS_DIR / "fare_results_nadeesha.csv"),
        "demand": load_csv(RESULTS_DIR / "metrics" / "demand_test_metrics.csv"),
        "assignments": load_csv(RESULTS_DIR / "zone_cluster_assignments.csv"),
    }


def extract_intent(question: str, zones: list[dict[str, Any]], now: datetime | None = None) -> dict[str, Any]:
    if now is None:
        now = datetime.now(timezone.utc)
    text = normalize(question)

    scores: dict[str, int] = {}
    for key, patterns in RULES.items():
        score = sum(3 for p in patterns if p.search(text))
        scores[key] = score

    if re.search(r"\b(tomorrow|future|next|will)\b", text) and (scores.get("historical_hotspots", 0) > 0 or scores.get("demand_forecast", 0) > 0):
        scores["demand_forecast"] = scores.get("demand_forecast", 0) + 4
    if scores.get("model_performance", 0) > 0:
        scores["model_performance"] += 10
    if scores.get("data_quality", 0) > 0:
        scores["data_quality"] += 5

    ranked = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    intent = ranked[0][0] if ranked[0][1] > 0 else "unsupported"

    p: dict[str, Any] = {
        "timezone": "America/New_York",
        "period": None,
        "hour": None,
        "minute": 0,
        "date": None,
        "horizon": None,
        "future": False,
        "model": None,
        "direction": "pickup",
        "origin": None,
        "destination": None,
        "zone": None,
        "provider": None,
        "riders": None,
        "rate": None,
    }
    issues: list[str] = []

    period_map = {
        "morning": "Morning",
        "midday": "Midday",
        "afternoon": "Midday",
        "evening": "Evening",
        "night": "Night",
        "overnight": "Night",
    }
    found_periods = [
        period_map[m.group(1)]
        for m in re.finditer(r"\b(morning|midday|afternoon|evening|night|overnight)\b", text)
    ]
    if len(set(found_periods)) > 1:
        issues.append("Ask for one time period at a time.")
    p["period"] = found_periods[0] if found_periods else None

    clock = re.search(r"\b(?:at|around)\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b", text) or re.search(r"\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b", text)
    if clock:
        h = int(clock.group(1))
        minute = int(clock.group(2) or 0)
        meridiem = clock.group(3)

        if h > 23 or minute > 59 or (meridiem and (h < 1 or h > 12)):
            issues.append("Use a valid time, such as 8 AM or 20:00.")
        elif not meridiem and not clock.group(2) and 1 <= h <= 12 and not p["period"]:
            issues.append(f"Does {h} mean AM or PM?")
        else:
            if meridiem:
                h = (h % 12) + (12 if meridiem == "pm" else 0)
            elif p["period"] == "Evening" and h < 12:
                h += 12
            p["hour"] = h
            p["minute"] = minute
            computed_period = period_for_hour(h)
            if p["period"] and p["period"] != computed_period:
                issues.append("The time and named period disagree. Please choose one.")
            p["period"] = computed_period

    today_str = now.strftime("%Y-%m-%d")
    date_match = re.search(r"\b\d{4}-\d{2}-\d{2}\b", text)
    if date_match:
        ds = date_match.group(0)
        try:
            parsed = datetime.strptime(ds, "%Y-%m-%d")
            p["date"] = ds
        except ValueError:
            issues.append("Use a valid calendar date in YYYY-MM-DD format.")
    elif re.search(r"\b(today|tomorrow|yesterday)\b", text):
        from datetime import timedelta
        base_d = datetime.strptime(today_str, "%Y-%m-%d")
        if "tomorrow" in text:
            p["date"] = (base_d + timedelta(days=1)).strftime("%Y-%m-%d")
        elif "yesterday" in text:
            p["date"] = (base_d - timedelta(days=1)).strftime("%Y-%m-%d")
        else:
            p["date"] = today_str

    if re.search(r"\b(next week|next month|last week|last month|weekend|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b", text):
        issues.append("Please specify a calendar date (YYYY-MM-DD); weekday and week/month ranges are not supported yet.")

    horizon_match = re.search(r"\bnext\s+(\d+)\s*(hours?|h|days?)\b", text)
    if horizon_match:
        qty = int(horizon_match.group(1))
        unit = horizon_match.group(2)
        p["horizon"] = qty * (24 if unit.startswith("d") else 1)

    p["future"] = bool((p["date"] and p["date"] > today_str) or p["horizon"] or re.search(r"\b(future|tomorrow|will|forecast)\b", text))

    if re.search(r"\b(eta|duration)\b", text):
        p["model"] = "eta"
    elif re.search(r"\bfare\b", text):
        p["model"] = "fare"
    elif re.search(r"\bdemand\b", text):
        p["model"] = "demand"
    elif re.search(r"\bcluster", text):
        p["model"] = "cluster"

    p["direction"] = "dropoff" if re.search(r"\b(dropoff|drop-off|drop off)\b", text) else "pickup"

    def resolve_zone(val: str) -> dict[str, Any] | None:
        val_norm = normalize(val)
        id_m = re.match(r"^(?:zone\s+)?(\d+)\b", val_norm)
        if id_m:
            target_id = int(id_m.group(1))
            for z in zones:
                if z.get("zone_id") == target_id:
                    return z
            return None
        matches = [z for z in zones if val_norm.startswith(normalize(z.get("zone_name", "")))]
        if matches:
            matches.sort(key=lambda z: len(z.get("zone_name", "")), reverse=True)
            return matches[0]
        return None

    for key, pattern in [("origin", r"\bfrom\s+(.+)"), ("destination", r"\bto\s+(.+)"), ("zone", r"\b(?:in|for)\s+zone\s+(\d+)")]:
        m = re.search(pattern, text)
        if m:
            z = resolve_zone(m.group(1))
            if z:
                p[key] = z.get("zone_id")
            else:
                issues.append(f"Specify a recognized {key} zone name or zone ID.")

    if not p["origin"] and not p["destination"] and not p["zone"]:
        mentioned = [z for z in zones if normalize(z.get("zone_name", "")) and normalize(z.get("zone_name", "")) in text]
        if len(mentioned) == 1:
            p["zone"] = mentioned[0].get("zone_id")
        elif len(mentioned) > 1:
            issues.append("Use “from [zone] to [zone]” to identify the route.")

    prov_m = re.search(r"\bprovider\s+(\d+)\b", text)
    if prov_m:
        p["provider"] = int(prov_m.group(1))

    riders_m = re.search(r"\b(\d+)\s+(?:riders?|passengers?)\b", text)
    if riders_m:
        p["riders"] = int(riders_m.group(1))

    rate_m = re.search(r"\brate(?: class)?\s+(\d+)\b", text)
    if rate_m:
        p["rate"] = int(rate_m.group(1))

    if ranked[0][1] > 0 and len(ranked) > 1 and ranked[0][1] == ranked[1][1]:
        intent = "ambiguous"
        issues.append("Please ask about one topic: demand, hotspots, OD flows, clusters, fare, ETA, metrics, quality, or overview.")

    return {
        "intent": intent,
        "parameters": p,
        "scores": scores,
        "issues": issues,
    }


def make_result(status: str, heading: str, items: list[str] | None = None, insight: str = "", source: str = "") -> dict[str, Any]:
    return {
        "status": status,
        "heading": heading,
        "items": (items or [])[:5],
        "insight": insight,
        "source": source,
    }


def clarify(message: str) -> dict[str, Any]:
    return make_result("clarification", "A little more detail", [], message, "Deterministic intent and parameter extraction")


def history_range(d: dict[str, Any]) -> str:
    daily = d.get("daily", [])
    start = daily[0].get("date", "unknown") if daily else "unknown"
    end = daily[-1].get("date", "unknown") if daily else "unknown"
    return f"{start} to {end}"


def format_historical(p: dict[str, Any], d: dict[str, Any], heading: str = "", caveat: str = "") -> dict[str, Any]:
    if p.get("origin") or p.get("destination"):
        return clarify("Use “in zone [ID]” for hotspots, or ask for OD flows with from/to zones.")
    if p.get("date") and not heading:
        return clarify("Hotspot exports are period aggregates, not date-specific. Ask for a period or a demand forecast.")
    if p.get("direction") == "dropoff" and not p.get("period"):
        return clarify("Choose a period for drop-off hotspots: morning, midday, evening, or night.")

    key = "dropoff_count" if p.get("direction") == "dropoff" else "pickup_count"
    period = p.get("period")
    direction = p.get("direction", "pickup")
    zone_filter = p.get("zone")

    if period:
        raw_list = d.get("hotspots", {}).get(direction, [])
        filtered = [r for r in raw_list if r.get("period") == period]
    else:
        filtered = d.get("zones", [])

    if zone_filter:
        filtered = [r for r in filtered if r.get("zone_id") == zone_filter]

    filtered.sort(key=lambda r: float(r.get(key, 0)), reverse=True)
    title = heading or f"{period or 'All periods'} · historical hotspots"

    items = [
        f"{r.get('zone_name')}: {int(float(r.get(key, 0))):,} {'drop-offs' if direction == 'dropoff' else 'pickups'}"
        for r in filtered[:5]
    ]

    unit_name = "positioning"
    if filtered:
        insight_text = f"{caveat} Consider {filtered[0].get('zone_name')} for {(period.lower() if period else 'historical')} {unit_name} based on historical totals.".strip()
    else:
        insight_text = f"{caveat} Zone absent from this top-five export; absence does not mean zero activity.".strip()

    source_text = f"{'hotspots.json · top five per period' if period else 'zone_activity.json'} · {history_range(d)} · historical totals"
    if p.get("hour") is not None:
        source_text += f" · {period} bucket, not exact {p.get('hour')}:00"
    source_text += " · not a future forecast"

    return make_result("ok" if items else "empty", title, items, insight_text, source_text)


def query_api(endpoint: str, payload: dict[str, Any] | None = None, base_url: str = "http://127.0.0.1:8000") -> Any:
    url = f"{base_url}{endpoint}"
    data_bytes = json.dumps(payload).encode("utf-8") if payload is not None else None
    headers = {"Content-Type": "application/json"} if payload is not None else {}
    req = urllib.request.Request(url, data=data_bytes, headers=headers)
    with urllib.request.urlopen(req, timeout=10) as resp:
        return json.loads(resp.read().decode("utf-8"))


def answer_question(
    question: str,
    data: dict[str, Any] | None = None,
    api_url: str = "http://127.0.0.1:8000",
    now: datetime | None = None,
) -> dict[str, Any]:
    if data is None:
        data = load_assistant_data()
    if now is None:
        now = datetime(2026, 9, 11, 12, 0, 0, tzinfo=timezone.utc)

    zones = data.get("zones", [])
    extracted = extract_intent(question, zones, now)
    intent = extracted["intent"]
    p = extracted["parameters"]
    issues = extracted["issues"]

    if issues:
        res = clarify(" ".join(issues))
        return {**res, **extracted}

    if intent == "unsupported":
        res = make_result(
            "unsupported",
            "Choose an UrbanFlow analytics topic",
            [],
            "Ask about demand, hotspots, OD flows, clusters, fare, ETA, model performance, data quality, or revenue.",
            "No matching analytics intent",
        )
        return {**res, **extracted}

    if p.get("horizon") and intent != "demand_forecast":
        res = clarify("Hour horizons are supported for demand forecasts only.")
        return {**res, **extracted}

    if intent in ("fare_prediction", "eta_prediction"):
        missing = []
        if p.get("origin") is None:
            missing.append("origin zone")
        if p.get("destination") is None:
            missing.append("destination zone")
        if p.get("date") is None:
            missing.append("pickup date")
        if p.get("hour") is None:
            missing.append("pickup time with AM/PM")
        if p.get("provider") is None:
            missing.append("provider code")

        if missing:
            res = clarify(
                f"Provide {', '.join(missing)}. Example: {'Fare' if intent == 'fare_prediction' else 'ETA'} from zone 161 to zone 132 tomorrow at 8 AM provider 1."
            )
            return {**res, **extracted}

        meta = data.get("metadata", {})
        prov_codes = meta.get("provider_codes", [1, 2])
        rate_classes = meta.get("rate_class_ids", [1, 2, 3, 4, 5, 6])
        if p.get("provider") not in prov_codes or (p.get("rate") is not None and p.get("rate") not in rate_classes) or (p.get("riders") is not None and (p["riders"] < 1 or p["riders"] > 9)):
            res = clarify(f"Use a supported provider/rate class and 1–9 riders. Provider codes: {', '.join(map(str, prov_codes))}.")
            return {**res, **extracted}

        payload = {
            "origin_loc_id": p["origin"],
            "dest_loc_id": p["destination"],
            "pickup_timestamp": f"{p['date']}T{p['hour']:02d}:{p.get('minute', 0):02d}:00",
            "provider_code": p["provider"],
        }
        if p.get("riders") is not None:
            payload["rider_count"] = p["riders"]
        if p.get("rate") is not None:
            payload["rate_class_id"] = p["rate"]

        is_fare = intent == "fare_prediction"
        endpoint = "/api/fare/predict" if is_fare else "/api/duration/predict"
        try:
            api_res = query_api(endpoint, payload, base_url=api_url)
            val_key = "predicted_base_fare" if is_fare else "predicted_trip_duration_minutes"
            val = api_res.get(val_key)
            if val is None or float(val) < 0:
                raise ValueError("Invalid prediction value")
            num = float(val)
            heading = "Predicted base fare" if is_fare else "Predicted trip duration"
            item_str = f"${num:,.2f}" if is_fare else f"{num:,.2f} minutes"
            insight = "Use this base-fare estimate for planning; tips and tolls are excluded." if is_fare else "Allow a time buffer; this is a model estimate, not live traffic."
            source = f"POST {endpoint} · {payload['pickup_timestamp']} NYC local time · omitted rider/rate values use existing service defaults"
            res = make_result("ok", heading, [item_str], insight, source)
            return {**res, **extracted}
        except Exception:
            res = make_result(
                "error",
                "Source unavailable",
                [],
                "The UrbanFlow service or artifact could not be read. Retry when the service is available.",
                "UrbanFlow source request failed; no values generated",
            )
            return {**res, **extracted}

    if intent == "model_performance":
        model_type = p.get("model")
        if not model_type:
            res = clarify("Which model: fare, ETA, demand, or clustering?")
            return {**res, **extracted}
        if p.get("date") or p.get("period") or p.get("zone") or p.get("origin") or p.get("destination"):
            res = clarify("Saved model metrics are aggregate evaluations; date, period, and zone slices are unavailable.")
            return {**res, **extracted}

        if model_type == "eta":
            eta_m = data.get("eta", {})
            mae = eta_m.get("mean_rolling_mae")
            rmse = eta_m.get("mean_rolling_rmse")
            r2 = eta_m.get("mean_rolling_r2")
            if None in (mae, rmse, r2):
                res = make_result("empty", "Metrics unavailable", [], "No complete verified metric row is available.", "integration/eta/eta_model_metadata.json")
                return {**res, **extracted}
            res = make_result(
                "ok",
                "ETA model performance",
                [f"MAE: {float(mae):.2f} min", f"RMSE: {float(rmse):.2f} min", f"R²: {float(r2):.2f}"],
                "Use these evaluation errors as planning context, not a guarantee for an individual prediction.",
                "integration/eta/eta_model_metadata.json · mean rolling validation · bundled ETA model, not runtime fallback",
            )
            return {**res, **extracted}

        if model_type == "fare":
            fare_rows = data.get("fare", [])
            row = next((r for r in fare_rows if r.get("Model") == "Decision Tree"), None)
            if not row:
                res = make_result("empty", "Metrics unavailable", [], "No complete verified metric row is available.", "results/fare_results_nadeesha.csv")
                return {**res, **extracted}
            res = make_result(
                "ok",
                "Fare model performance",
                [f"MAE: {float(row['MAE']):.2f} USD", f"RMSE: {float(row['RMSE']):.2f} USD", f"R²: {float(row['R2']):.2f}"],
                "Use these evaluation errors as planning context, not a guarantee for an individual prediction.",
                "results/fare_results_nadeesha.csv · Decision Tree best run · split not specified",
            )
            return {**res, **extracted}

        if model_type == "demand":
            demand_rows = data.get("demand", [])
            if not demand_rows:
                res = make_result("empty", "Metrics unavailable", [], "No complete verified metric row is available.", "results/metrics/demand_test_metrics.csv")
                return {**res, **extracted}
            row = demand_rows[0]
            res = make_result(
                "ok",
                "Demand model performance",
                [f"MAE: {float(row['mae']):.2f} pickups", f"RMSE: {float(row['rmse']):.2f} pickups", f"R²: {float(row['r2']):.2f}"],
                "Use these evaluation errors as planning context, not a guarantee for an individual prediction.",
                "results/metrics/demand_test_metrics.csv · recursive test evaluation",
            )
            return {**res, **extracted}

        if model_type == "cluster":
            clusters_meta = data.get("clusters", {})
            sel_k = clusters_meta.get("selected_k", 4)
            metrics_list = clusters_meta.get("metrics", [])
            m_row = next((m for m in metrics_list if m.get("k") == sel_k), None)
            sil = m_row.get("silhouette_score", 0.0) if m_row else 0.0
            res = make_result(
                "ok",
                "Clustering performance",
                [f"Selected k: {sel_k}", f"Silhouette: {sil:.2f}"],
                "Clusters describe similarity; they do not predict future demand.",
                "zone_clusters.json · saved clustering evaluation",
            )
            return {**res, **extracted}

    if intent == "demand_forecast":
        if not p.get("date") and not p.get("horizon") and p.get("future"):
            res = clarify("Specify a forecast date or a horizon, such as next 24 hours.")
            return {**res, **extracted}
        if not p.get("date") and not p.get("horizon"):
            res = format_historical(p, data, "Driver positioning · historical pattern", "No future date specified.")
            return {**res, **extracted}
        if p.get("horizon") and (p["horizon"] < 1 or p["horizon"] > 72):
            res = format_historical(p, data, "Historical pattern · forecast unavailable", "The saved forecast supports at most 72 hours.")
            return {**res, **extracted}

        forecast_rows: list[dict[str, Any]] = []
        try:
            api_resp = query_api(f"/api/demand/forecast?horizon=72", base_url=api_url)
            forecast_rows = api_resp.get("rows", [])
        except Exception:
            # Fallback to local CSV if API is unavailable
            fc_path = RESULTS_DIR / "forecasts" / "demand_forecast_72h.csv"
            if fc_path.exists():
                forecast_rows = load_csv(fc_path)
            else:
                res = format_historical(p, data, "Historical pattern · forecast service unavailable", "The forecast service could not be reached.")
                return {**res, **extracted}

        for r in forecast_rows:
            r["timestamp"] = r["timestamp"].replace(" ", "T")

        start_dt = f"{p['date']}T00:00:00" if p.get("date") else now.strftime("%Y-%m-%dT%H:00:00")
        from datetime import timedelta
        start_obj = datetime.strptime(start_dt, "%Y-%m-%dT%H:%M:%S")
        hours_span = p.get("horizon") or 24
        end_obj = start_obj + timedelta(hours=hours_span)

        wanted = []
        curr = start_obj
        while curr < end_obj:
            if (p.get("hour") is None or curr.hour == p["hour"]) and (not p.get("period") or period_for_hour(curr.hour) == p["period"]):
                wanted.append(curr.strftime("%Y-%m-%dT%H:%M:%S"))
            curr += timedelta(hours=1)

        available_ts = {r["timestamp"] for r in forecast_rows}
        if not wanted or not all(t in available_ts for t in wanted):
            res = format_historical(
                p,
                data,
                "Historical pattern · requested forecast unavailable",
                "72h ML forecast window covers April 1–3, 2026. Showing verified historical trends:",
            )
            return {**res, **extracted}

        if p.get("origin") or p.get("destination") or p.get("direction") == "dropoff":
            res = clarify("Demand forecasts predict pickups by zone. Use “in zone [ID]” to filter a pickup zone.")
            return {**res, **extracted}

        selected = [
            r for r in forecast_rows
            if r["timestamp"] in wanted and (not p.get("zone") or int(r["zone_id"]) == p["zone"])
        ]
        totals: dict[int, dict[str, Any]] = {}
        for r in selected:
            zid = int(r["zone_id"])
            pred = float(r["predicted_pickups"])
            if zid not in totals:
                totals[zid] = {"name": r["zone_name"], "value": 0.0}
            totals[zid]["value"] += pred

        ranked_zones = sorted(totals.values(), key=lambda x: x["value"], reverse=True)
        if not ranked_zones:
            res = make_result("empty", "Zone outside forecast coverage", [], "The saved model forecasts only selected high-volume zones.", "/api/demand/forecast?horizon=72")
            return {**res, **extracted}

        items = [f"{rz['name']}: {rz['value']:,.2f} pickups" for rz in ranked_zones[:5]]
        top_name = ranked_zones[0]["name"]
        minute_note = " · hourly bucket, not minute-level forecast" if p.get("minute") else ""
        source = f"/api/demand/forecast?horizon=72 · saved recursive forecast · {wanted[0]} to {wanted[-1]} NYC · selected zones only{minute_note}"
        res = make_result(
            "ok",
            "Model forecast · expected pickups",
            items,
            f"Prioritize availability near {top_name}; predicted pickups do not measure unmet demand.",
            source,
        )
        return {**res, **extracted}

    if intent == "historical_hotspots":
        res = format_historical(p, data)
        return {**res, **extracted}

    if intent == "od_flows":
        if p.get("date") or p.get("future"):
            res = clarify("OD exports contain historical period aggregates. Ask for morning, midday, evening, or night flows.")
            return {**res, **extracted}
        period = p.get("period")
        if not period:
            res = clarify("Which OD period: morning, midday, evening, or night?")
            return {**res, **extracted}

        od_list = data.get("od", [])
        matched = [
            r for r in od_list
            if r.get("period") == period
            and (not p.get("origin") or r.get("origin_zone_id") == p["origin"])
            and (not p.get("destination") or r.get("destination_zone_id") == p["destination"])
            and (not p.get("zone") or r.get("origin_zone_id") == p["zone"] or r.get("destination_zone_id") == p["zone"])
        ]
        matched.sort(key=lambda r: int(r.get("trip_count", 0)), reverse=True)
        items = [
            f"{r['origin_zone_name']} → {r['destination_zone_name']}: {int(r['trip_count']):,} trips"
            for r in matched[:5]
        ]
        insight = "Review vehicle availability at the origins of the strongest recorded corridors." if items else "No matching pair appears in the exported top ten; this does not mean zero trips."
        hr = history_range(data)
        hour_note = " · period aggregate, not exact hour" if p.get("hour") is not None else ""
        source = f"od_flows.json · top ten per period · {hr}{hour_note}"
        res = make_result("ok" if items else "empty", f"{period} · historical OD flows", items, insight, source)
        return {**res, **extracted}

    if intent == "zone_clusters":
        if p.get("date") or p.get("period") or p.get("origin") or p.get("destination"):
            res = clarify("Clusters are saved all-period zone assignments. Ask for a zone or the cluster summary.")
            return {**res, **extracted}

        if p.get("zone"):
            ass_rows = data.get("assignments", [])
            matches = [
                f"{r['zone_name']}: {r['cluster_label']} (cluster {r['cluster_id']})"
                for r in ass_rows if int(r.get("zone_id", -1)) == p["zone"]
            ]
            res = make_result(
                "ok" if matches else "empty",
                "Zone activity clusters",
                matches[:5],
                "Use similar activity profiles to compare positioning strategies.",
                "zone_clusters.json + results/zone_cluster_assignments.csv · saved assignments",
            )
            return {**res, **extracted}

        clusters_info = data.get("clusters", {}).get("clusters", [])
        items = [f"{c['cluster_label']}: {c['zone_count']} zones" for c in clusters_info[:5]]
        res = make_result(
            "ok" if items else "empty",
            "Zone activity clusters",
            items,
            "Use similar activity profiles to compare positioning strategies.",
            "zone_clusters.json + results/zone_cluster_assignments.csv · saved assignments",
        )
        return {**res, **extracted}

    if intent in ("overview", "data_quality"):
        if p.get("period") or p.get("zone") or p.get("origin") or p.get("destination") or p.get("future"):
            res = clarify("This export supports daily historical totals only; remove zone/time-of-day filters or request a historical YYYY-MM-DD date.")
            return {**res, **extracted}

        daily_rows = data.get("daily", [])
        target_date = p.get("date")
        if target_date:
            daily_rows = [r for r in daily_rows if r.get("date") == target_date]

        if not daily_rows:
            res = make_result("empty", "No daily records for that date", [], f"Available history: {history_range(data)}.", "overview_daily.json")
            return {**res, **extracted}

        if intent == "data_quality":
            invalid = sum(
                1 for r in daily_rows
                if r.get("trip_count") is None or r.get("base_fare_revenue") is None or float(r.get("trip_count", 0)) < 0
            )
            unique_dates = len({r["date"] for r in daily_rows})
            duplicates = len(daily_rows) - unique_dates
            items = [
                f"Daily records checked: {len(daily_rows):,}",
                f"Invalid count/revenue records: {invalid:,}",
                f"Duplicate dates: {duplicates:,}",
            ]
            res = make_result(
                "ok",
                "Data quality · export checks",
                items,
                "Raw-trip missingness and duplicate-trip rates are not available in these exports; this is not a raw-data audit.",
                "overview_daily.json · computed aggregate integrity checks",
            )
            return {**res, **extracted}

        total_trips = sum(int(r.get("trip_count", 0)) for r in daily_rows)
        total_rev = sum(float(r.get("base_fare_revenue", 0.0)) for r in daily_rows)
        p_start = daily_rows[0].get("date", "")
        p_end = daily_rows[-1].get("date", "")
        items = [
            f"Trips: {total_trips:,}",
            f"Base fare revenue: ${total_rev:,.2f}",
            f"Period: {p_start} to {p_end}",
        ]
        res = make_result(
            "ok",
            "Historical mobility overview",
            items,
            "Use recorded activity for capacity planning; base fares exclude tips and tolls.",
            "overview_daily.json · sum of daily cleaned-data aggregates",
        )
        return {**res, **extracted}

    res = clarify("Please ask about one analytics topic at a time.")
    return {**res, **extracted}


def format_cli_output(ans: dict[str, Any]) -> str:
    lines = [
        f"==> UrbanFlow [{ans.get('status', 'ok').upper()}] {ans.get('heading', '')}",
    ]
    for item in ans.get("items", []):
        lines.append(f"  • {item}")
    if ans.get("insight"):
        lines.append(f"Insight: {ans['insight']}")
    if ans.get("source"):
        lines.append(f"Source: {ans['source']}")
    return "\n".join(lines)


def main() -> None:
    if hasattr(sys.stdout, "reconfigure"):
        try:
            sys.stdout.reconfigure(encoding="utf-8")
        except Exception:
            pass

    parser = argparse.ArgumentParser(description="UrbanFlow AI Mobility Assistant (CLI)")
    parser.add_argument("question", nargs="*", help="Natural-language question to ask")
    parser.add_argument("--api-url", default="http://127.0.0.1:8000", help="Base URL of UrbanFlow API")
    args = parser.parse_args()

    data = load_assistant_data()
    fixed_clock = datetime(2026, 9, 11, 12, 0, 0, tzinfo=timezone.utc)

    if args.question:
        q = " ".join(args.question)
        ans = answer_question(q, data=data, api_url=args.api_url, now=fixed_clock)
        print(format_cli_output(ans))
        return

    print("=" * 65)
    print("UrbanFlow AI Mobility Assistant (Local / No-LLM Analytics)")
    print("Type your question, or 'exit' / 'quit' to exit.")
    print("=" * 65)

    while True:
        try:
            q = input("\nurbanflow> ").strip()
            if not q:
                continue
            if q.lower() in ("exit", "quit", "q"):
                print("Goodbye.")
                break
            ans = answer_question(q, data=data, api_url=args.api_url, now=fixed_clock)
            print(format_cli_output(ans))
        except (KeyboardInterrupt, EOFError):
            print("\nExiting.")
            break


if __name__ == "__main__":
    main()

