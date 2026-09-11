import { useEffect, useRef, useState } from "react";
import { AnalyticsCard } from "../cards/AnalyticsCard";
import { api } from "../../services/api";
import zonesData from "../../data/generated/zone_activity.json";
import options from "../../data/generated/fare_metadata.json";

const zones = zonesData.filter(zone => zone.reference_matched)
  .map(zone => ({ id: zone.zone_id, name: `${zone.zone_name} — ${zone.area}` }))
  .sort((a,b) => a.name.localeCompare(b.name, "en"));
const nameOf = id => zones.find(zone => zone.id === id)?.name;
const zoneParts = id => nameOf(id)?.split(" — ") || ["Unknown zone", "Unknown area"];
const formatPickup = value => new Intl.DateTimeFormat("en-GB", {
  day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
}).format(new Date(value));
const initial = { provider_code: "", pickup_timestamp: "", rider_count: "1", rate_class_id: "", origin_loc_id: "", dest_loc_id: "" };

export function DurationPrediction({ compact = false }) {
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
    <section className={`duration-section ${compact ? "duration-section--compact" : ""}`} aria-label="Trip Duration Prediction">
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
              <p className="result-kicker">Estimated Trip Duration</p>
              <strong className="duration-result__value">{Math.round(result.value)} min</strong>
              <p className="fare-context">Model estimate before trip start.</p>
              <dl className="duration-result__details">
                <dt>Route</dt><dd>{zoneParts(result.payload.origin_loc_id)[0]} → {zoneParts(result.payload.dest_loc_id)[0]}</dd>
                <dt>Areas</dt><dd>{zoneParts(result.payload.origin_loc_id)[1]} → {zoneParts(result.payload.dest_loc_id)[1]}</dd>
                <dt>Pickup</dt><dd>{formatPickup(result.payload.pickup_timestamp)}</dd>
                <dt>Trip details</dt><dd>Provider {result.payload.provider_code} · Rate class {result.payload.rate_class_id} · {result.payload.rider_count} rider{result.payload.rider_count === 1 ? "" : "s"}</dd>
              </dl>
            </> : <p className="fare-context">Enter trip details to estimate duration before departure.</p>}
          </div>
        </AnalyticsCard>
      </div>
      {!compact && null}
    </section>
  );
}
