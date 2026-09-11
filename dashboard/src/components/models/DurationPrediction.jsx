import { useEffect, useRef, useState } from "react";
import { AnalyticsCard } from "../cards/AnalyticsCard";
import { api } from "../../services/api";
import zonesData from "../../data/generated/zone_activity.json";
import options from "../../data/generated/fare_metadata.json";
import modelInfo from "../../data/generated/duration_model_info.json";

const zones = zonesData.filter(zone => zone.reference_matched)
  .map(zone => ({ id: zone.zone_id, name: `${zone.zone_name} — ${zone.area}` }))
  .sort((a,b) => a.name.localeCompare(b.name, "en"));
const nameOf = id => zones.find(zone => zone.id === id)?.name;
const initial = { provider_code: "", pickup_timestamp: "", rider_count: "1", rate_class_id: "", origin_loc_id: "", dest_loc_id: "" };

export function DurationPrediction() {
  const [form, setForm] = useState(initial);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const request = useRef(null);
  useEffect(() => () => request.current?.abort(), []);
  function update(event) {
    setForm(current => ({ ...current, [event.target.name]: event.target.value }));
    setResult(null); setError("");
  }
  async function submit(event) {
    event.preventDefault();
    if (pending || !event.currentTarget.reportValidity()) return;
    const payload = Object.fromEntries(Object.entries(form).map(([key,value]) => [key,
      key === "pickup_timestamp" ? (value.length === 16 ? `${value}:00` : value) : Number(value)]));
    const controller = new AbortController();
    request.current = controller;
    const timeout = setTimeout(() => controller.abort(), 30000);
    setPending(true); setResult(null); setError("");
    try {
      const data = await api.durationPrediction(payload, { signal: controller.signal });
      if (!Number.isFinite(data.predicted_trip_duration_minutes)) throw new Error("Invalid response");
      setResult({ value: data.predicted_trip_duration_minutes, payload });
    } catch (failure) {
      setError(failure.status === 422 ? "Review the trip details and try again."
        : "Trip duration service is unavailable. Confirm the UrbanFlow API is running on port 8000.");
    } finally { clearTimeout(timeout); request.current = null; setPending(false); }
  }
  return (
    <section className="duration-section" aria-label="Trip Duration Prediction">
      <div className="fare-grid">
        <AnalyticsCard title="Trip Duration Prediction" description="Use trip details known before departure.">
          <form className="fare-form" aria-label="Duration trip details" onSubmit={submit}>
            <fieldset disabled={pending}>
              <legend className="sr-only">Duration inputs</legend>
              <label>Provider<select aria-label="Duration provider" name="provider_code" value={form.provider_code} onChange={update} required>
                <option value="">Select provider</option>
                {options.provider_codes.map(code => <option key={code} value={code}>Provider {code}</option>)}
              </select></label>
              <label>Pickup date and time<input aria-label="Duration pickup time" type="datetime-local" step="60" required name="pickup_timestamp" value={form.pickup_timestamp} onChange={update} /></label>
              <label>Rider count<input aria-label="Duration riders" type="number" min="1" max={options.rider_count_max} step="1" required name="rider_count" value={form.rider_count} onChange={update} /></label>
              <label>Rate class<select aria-label="Duration rate class" required name="rate_class_id" value={form.rate_class_id} onChange={update}>
                <option value="">Select rate class</option>
                {options.rate_class_ids.map(code => <option key={code} value={code}>Rate class {code}</option>)}
              </select></label>
              {[["origin_loc_id", "Pickup zone"], ["dest_loc_id", "Destination zone"]].map(([key,label]) => (
                <label key={key}>{label}<select aria-label={`Duration ${label.toLowerCase()}`} name={key} value={form[key]} required onChange={update}>
                  <option value="">Select zone</option>
                  {zones.map(zone => <option key={zone.id} value={zone.id}>{zone.name}</option>)}
                </select></label>
              ))}
            </fieldset>
            <p className="fare-context">Use local pickup time at the trip origin.</p>
            <button className="primary-button" type="submit" disabled={pending}>{pending ? "Estimating duration…" : "Predict duration"}</button>
          </form>
        </AnalyticsCard>
        <AnalyticsCard title="Estimated Trip Duration">
          <div className="fare-result" aria-live="polite" aria-busy={pending}>
            {pending ? <p role="status">Calculating duration…</p> : error ? <p role="alert" className="fare-error">{error}</p> : result ? <>
              <strong className="duration-result__value">{result.value.toFixed(1)} min</strong>
              <p className="fare-context">Model estimate before trip start.</p>
              <dl className="duration-result__details">
                <dt>Pickup zone</dt><dd>{nameOf(result.payload.origin_loc_id)}</dd>
                <dt>Destination zone</dt><dd>{nameOf(result.payload.dest_loc_id)}</dd>
                <dt>Pickup date/time</dt><dd>{result.payload.pickup_timestamp.slice(0,16).replace("T", " ")} (local)</dd>
              </dl>
            </> : <p className="fare-context">Enter trip details to estimate duration before departure.</p>}
          </div>
        </AnalyticsCard>
      </div>
      <AnalyticsCard title="Duration model information" description={modelInfo.model === "LGBMRegressor" ? "LightGBM Regressor" : "Decision Tree Regressor"}>
        <div className="fare-model-info">
          <dl className="model-metrics">
            <div><dt>Test MAE (min)</dt><dd>{modelInfo.test.mae.toFixed(4)}</dd></div>
            <div><dt>Test RMSE (min)</dt><dd>{modelInfo.test.rmse.toFixed(4)}</dd></div>
            <div><dt>Test R²</dt><dd>{modelInfo.test.r2.toFixed(4)}</dd></div>
          </dl>
          <p>Evaluated on all {modelInfo.test.rows.toLocaleString("en-US")} held-out March 2026 trips. Selected by validation MAE; trained on {modelInfo.train_rows.toLocaleString("en-US")} training trips{modelInfo.sampled_training ? " sampled with seed 42" : ""}.</p>
        </div>
      </AnalyticsCard>
    </section>
  );
}
