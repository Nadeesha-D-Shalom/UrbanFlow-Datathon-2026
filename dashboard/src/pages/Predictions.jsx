import { useEffect, useRef, useState } from "react";
import { PageContainer } from "../components/layout/PageContainer";
import { AnalyticsCard } from "../components/cards/AnalyticsCard";
import { api } from "../services/api";
import { DurationPrediction } from "../components/models/DurationPrediction";
import metadata from "../data/generated/fare_metadata.json";
import zoneActivity from "../data/generated/zone_activity.json";
import durationModelInfo from "../data/generated/duration_model_info.json";

const zones = zoneActivity.filter((zone) => zone.reference_matched)
  .map((zone) => ({ id: zone.zone_id, label: `${zone.zone_name} — ${zone.area}` }))
  .sort((a, b) => a.label.localeCompare(b.label, "en"));
const zoneLabel = (id) => zones.find((zone) => zone.id === Number(id))?.label;
const initialForm = { provider_code: "", pickup_timestamp: "", rider_count: "1",
  rate_class_id: "", origin_loc_id: "", dest_loc_id: "" };
const unavailable = "Fare prediction service is unavailable. Confirm the UrbanFlow API is running on port 8000.";
const formatPickup = value => new Intl.DateTimeFormat("en-GB", {
  day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
}).format(new Date(value));

export function Predictions() {
  const [activeTool, setActiveTool] = useState("fare");
  const [form, setForm] = useState(initialForm);
  const [health, setHealth] = useState("Checking");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const request = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    let mounted = true;
    api.health({ signal: controller.signal })
      .then((data) => { if (mounted) setHealth(data.status === "ok" ? "Connected" : "Unavailable"); })
      .catch(() => { if (mounted) setHealth("Unavailable"); })
      .finally(() => clearTimeout(timeout));
    return () => { mounted = false; clearTimeout(timeout); controller.abort(); request.current?.abort(); };
  }, []);

  function update(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
    setResult(null);
    setError("");
  }

  async function predict(event) {
    event.preventDefault();
    if (pending || !event.currentTarget.reportValidity()) return;
    const payload = {
      provider_code: Number(form.provider_code),
      // Preserve the selected local wall-clock time; the API engineers time features.
      pickup_timestamp: form.pickup_timestamp.length === 16 ? `${form.pickup_timestamp}:00` : form.pickup_timestamp,
      rider_count: Number(form.rider_count),
      rate_class_id: Number(form.rate_class_id),
      origin_loc_id: Number(form.origin_loc_id),
      dest_loc_id: Number(form.dest_loc_id),
    };
    setPending(true); setError(""); setResult(null);
    const controller = new AbortController();
    request.current = controller;
    const timeout = setTimeout(() => controller.abort(), 30000);
    try {
      const data = await api.farePrediction(payload, { signal: controller.signal });
      if (!Number.isFinite(data.predicted_base_fare)) throw new Error("Invalid response");
      setResult({ fare: data.predicted_base_fare, payload });
    } catch (failure) {
      setError(failure.status === 422
        ? "The service could not accept these trip details. Review the inputs and try again."
        : unavailable);
    } finally {
      clearTimeout(timeout); request.current = null; setPending(false);
    }
  }

  return (
    <PageContainer className="predictions-page">
      <div className="page-heading">
        <div><h1>Predictions</h1><p>Estimate a trip’s base fare using the trained fare model.</p></div>
        <span className="fare-api-status" role="status">API status: {health}</span>
      </div>
      <div className="prediction-tabs" role="tablist" aria-label="Prediction tool">
        <button type="button" role="tab" aria-selected={activeTool === "fare"} className={activeTool === "fare" ? "is-active" : ""} onClick={() => setActiveTool("fare")}>Fare Prediction</button>
        <button type="button" role="tab" aria-selected={activeTool === "duration"} className={activeTool === "duration" ? "is-active" : ""} onClick={() => setActiveTool("duration")}>Trip Duration</button>
      </div>
      <div data-tour="prediction-form" className={`prediction-tools prediction-tools--${activeTool}`}>
        {activeTool === "fare" ? <>
        <AnalyticsCard title="Fare Prediction" description="Enter trip details. All fields are required.">
          <form className="fare-form" onSubmit={predict}>
            <fieldset disabled={pending}>
              <legend className="sr-only">Trip details</legend>
              <label>Provider
                <select name="provider_code" value={form.provider_code} onChange={update} required>
                  <option value="">Select provider</option>
                  {metadata.provider_codes.map((code) => <option key={code} value={code}>Provider {code}</option>)}
                </select>
              </label>
              <label>Pickup date and time
                <input type="datetime-local" name="pickup_timestamp" value={form.pickup_timestamp}
                  onChange={update} step="60" required aria-describedby="fare-time-note" />
              </label>
              <label>Rider count
                <input type="number" name="rider_count" value={form.rider_count} onChange={update}
                  min="1" max={metadata.rider_count_max} step="1" required />
              </label>
              <label>Rate class
                <select name="rate_class_id" value={form.rate_class_id} onChange={update} required>
                  <option value="">Select rate class</option>
                  {metadata.rate_class_ids.map((code) => <option key={code} value={code}>Rate class {code}</option>)}
                </select>
              </label>
              {[["origin_loc_id", "Pickup zone"], ["dest_loc_id", "Destination zone"]].map(([name, label]) => (
                <label key={name}>{label}
                  <select name={name} value={form[name]} onChange={update} required>
                    <option value="">Select zone</option>
                    {zones.map((zone) => <option key={zone.id} value={zone.id}>{zone.label}</option>)}
                  </select>
                </label>
              ))}
            </fieldset>
            <p id="fare-time-note" className="fare-context">Use local pickup time at the trip origin.</p>
            <button type="submit" className="primary-button" disabled={pending}>
              {pending ? "Predicting…" : "Predict fare"}
            </button>
          </form>
        </AnalyticsCard>
        <AnalyticsCard title="Estimated Base Fare">
          <div className="fare-result" aria-live="polite" aria-busy={pending}>
            {pending ? <p role="status">Calculating the model estimate…</p> : error ? (
              <p className="fare-error" role="alert">{error}</p>
            ) : result ? <>
              <p className="fare-context">Model estimate</p>
              <strong className="fare-result__value">{result.fare.toLocaleString("en-US", { style: "currency", currency: "USD" })}</strong>
              <dl className="fare-result__details">
                <div><dt>Pickup zone</dt><dd>{zoneLabel(result.payload.origin_loc_id)}</dd></div>
                <div><dt>Destination zone</dt><dd>{zoneLabel(result.payload.dest_loc_id)}</dd></div>
                <div><dt>Pickup</dt><dd>{formatPickup(result.payload.pickup_timestamp)}</dd></div>
                <div><dt>Rider count</dt><dd>{result.payload.rider_count}</dd></div>
                <div><dt>Rate class</dt><dd>{result.payload.rate_class_id}</dd></div>
                <div><dt>Provider</dt><dd>{result.payload.provider_code}</dd></div>
              </dl>
              <p className="fare-context">Estimated base fare; tips, tolls and additional charges are excluded.</p>
            </> : <p className="fare-context">Enter trip details and select Predict fare to request a model estimate.</p>}
          </div>
        </AnalyticsCard>
        </> : <DurationPrediction compact />}
      </div>
      <AnalyticsCard title={`${activeTool === "fare" ? "Fare" : "Duration"} model performance`} description="Compact held-out test metrics.">
        <div className="prediction-metrics">
          {activeTool === "fare" ? <div><strong>Decision Tree</strong><span>MAE 4.3861 · RMSE 8.7595 · R² 0.7579</span></div> : <div><strong>{durationModelInfo.model === "LGBMRegressor" ? "LightGBM" : "Decision Tree"}</strong><span>MAE {durationModelInfo.test.mae.toFixed(4)} min · RMSE {durationModelInfo.test.rmse.toFixed(4)} · R² {durationModelInfo.test.r2.toFixed(4)}</span></div>}
        </div>
      </AnalyticsCard>
    </PageContainer>
  );
}
