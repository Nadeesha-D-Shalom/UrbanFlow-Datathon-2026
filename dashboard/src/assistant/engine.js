import { extractIntent, periodForHour } from './nlp.js';

export function parseCsv(text) {
  const rows = text.trim().split(/\r?\n/).map(line => (line.match(/("(?:[^"]|"")*"|[^,]*)(,|$)/g) || []).filter(Boolean).map(v => v.replace(/,$/, '').replace(/^"|"$/g, '').replace(/""/g, '"')));
  return rows.slice(1).map(row => Object.fromEntries(rows[0].map((key, i) => [key, row[i]])));
}
const fmt = n => Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 });
const result = (status, heading, items = [], insight = '', source = '') => ({ status, heading, items: items.slice(0, 5), insight, source });
const clarify = message => result('clarification', 'A little more detail', [], message, 'Deterministic intent and parameter extraction');
const finite = value => value !== null && value !== '' && Number.isFinite(Number(value));
export async function answerQuestion(question, data, api, now = new Date(), extractor = extractIntent) {
  const extraction = extractor(question, data.zones, now);
  try { return { ...await route(extraction, data, api, now), ...extraction }; }
  catch { return { ...result('error', 'Source unavailable', [], 'The UrbanFlow service or artifact could not be read. Retry when the service is available.', 'UrbanFlow source request failed; no values generated'), ...extraction }; }
}
async function route({ intent, parameters: p, issues }, d, api, now) {
  if (issues.length) return clarify(issues.join(' '));
  if (intent === 'unsupported') return result('unsupported', 'Choose an UrbanFlow analytics topic', [], 'Ask about demand, hotspots, OD flows, clusters, fare, ETA, model performance, data quality, or revenue.', 'No matching analytics intent');
  if (p.horizon && intent !== 'demand_forecast') return clarify('Hour horizons are supported for demand forecasts only.');
  if (['fare_prediction', 'eta_prediction'].includes(intent)) {
    const missing = [['origin', 'origin zone'], ['destination', 'destination zone'], ['date', 'pickup date'], ['hour', 'pickup time with AM/PM'], ['provider', 'provider code']].filter(([k]) => p[k] == null).map(([, label]) => label);
    if (missing.length) return clarify(`Provide ${missing.join(', ')}. Example: ${intent === 'fare_prediction' ? 'Fare' : 'ETA'} from zone 161 to zone 132 tomorrow at 8 AM provider 1.`);
    if (!d.metadata.provider_codes.includes(p.provider) || (p.rate != null && !d.metadata.rate_class_ids.includes(p.rate)) || (p.riders != null && (p.riders < 1 || p.riders > 9))) return clarify('Use a supported provider/rate class and 1–9 riders. Provider codes: ' + d.metadata.provider_codes.join(', ') + '.');
    const payload = { origin_loc_id: p.origin, dest_loc_id: p.destination, pickup_timestamp: `${p.date}T${String(p.hour).padStart(2, '0')}:${String(p.minute || 0).padStart(2, '0')}:00`, provider_code: p.provider };
    if (p.riders != null) payload.rider_count = p.riders;
    if (p.rate != null) payload.rate_class_id = p.rate;
    const fare = intent === 'fare_prediction';
    const response = await (fare ? api.farePrediction(payload) : api.durationPrediction(payload));
    const value = response[fare ? 'predicted_base_fare' : 'predicted_trip_duration_minutes'];
    if (!finite(value) || Number(value) < 0) throw new Error('Invalid prediction');
    return result('ok', fare ? 'Predicted base fare' : 'Predicted trip duration', [`${fare ? '$' : ''}${fmt(value)}${fare ? '' : ' minutes'}`], fare ? 'Use this base-fare estimate for planning; tips and tolls are excluded.' : 'Allow a time buffer; this is a model estimate, not live traffic.', `POST /api/${fare ? 'fare' : 'duration'}/predict · ${payload.pickup_timestamp} NYC local time · omitted rider/rate values use existing service defaults${fare ? '' : ' · service may fall back to the saved duration model'}`);
  }
  if (intent === 'model_performance') {
    if (!p.model) return clarify('Which model: fare, ETA, demand, or clustering?');
    if (p.date || p.period || p.zone || p.origin || p.destination) return clarify('Saved model metrics are aggregate evaluations; date, period, and zone slices are unavailable.');
    let values, source, heading;
    if (p.model === 'eta') { values = [d.eta.mean_rolling_mae, d.eta.mean_rolling_rmse, d.eta.mean_rolling_r2]; source = 'integration/eta/eta_model_metadata.json · mean rolling validation · bundled ETA model, not runtime fallback'; heading = 'ETA model performance'; }
    if (p.model === 'fare') { const r = d.fare.find(r => r.Model === 'Decision Tree'); values = r && [r.MAE, r.RMSE, r.R2]; source = 'results/fare_results_nadeesha.csv · Decision Tree best run · split not specified'; heading = 'Fare model performance'; }
    if (p.model === 'demand') { const r = d.demand[0]; values = r && [r.mae, r.rmse, r.r2]; source = 'results/metrics/demand_test_metrics.csv · recursive test evaluation'; heading = 'Demand model performance'; }
    if (p.model === 'cluster') { const r = d.clusters.metrics.find(r => r.k === d.clusters.selected_k); return result('ok', 'Clustering performance', [`Selected k: ${d.clusters.selected_k}`, `Silhouette: ${fmt(r.silhouette_score)}`], 'Clusters describe similarity; they do not predict future demand.', 'zone_clusters.json · saved clustering evaluation'); }
    if (!values?.every(finite)) return result('empty', 'Metrics unavailable', [], 'No complete verified metric row is available.', source);
    const unit = p.model === 'fare' ? ' USD' : p.model === 'eta' ? ' min' : ' pickups';
    return result('ok', heading, [`MAE: ${fmt(values[0])}${unit}`, `RMSE: ${fmt(values[1])}${unit}`, `R²: ${fmt(values[2])}`], 'Use these evaluation errors as planning context, not a guarantee for an individual prediction.', source);
  }
  if (intent === 'demand_forecast') {
    if (!p.date && !p.horizon && p.future) return clarify('Specify a forecast date or a horizon, such as next 24 hours.');
    if (!p.date && !p.horizon) return historical(p, d, 'Driver positioning · historical pattern', 'No future date specified.');
    if (p.horizon && (p.horizon < 1 || p.horizon > 72)) return historical(p, d, 'Historical pattern · forecast unavailable', 'The saved forecast supports at most 72 hours.');
    let response;
    try { response = await api.demandForecast(72); }
    catch { return historical(p, d, 'Historical pattern · forecast service unavailable', 'The forecast service could not be reached.'); }
    if (!Array.isArray(response.rows) || response.rows.some(r => !finite(r.predicted_pickups) || Number(r.predicted_pickups) < 0 || !/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}$/.test(r.timestamp))) throw new Error('Invalid forecast');
    const rows = response.rows.map(r => ({ ...r, timestamp: r.timestamp.replace(' ', 'T') }));
    // Compare NYC wall-clock labels; saved timestamps carry no UTC offset.
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: p.timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' }).formatToParts(now).map(x => [x.type, x.value]));
    const start = p.date ? `${p.date}T00:00:00` : `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:00:00`;
    const endDate = new Date(`${start}Z`); endDate.setUTCHours(endDate.getUTCHours() + (p.horizon || 24));
    const end = endDate.toISOString().slice(0, 19);
    const wanted = [];
    for (let t = new Date(`${start}Z`); t < endDate; t.setUTCHours(t.getUTCHours() + 1)) {
      if ((p.hour == null || t.getUTCHours() === p.hour) && (!p.period || periodForHour(t.getUTCHours()) === p.period)) wanted.push(t.toISOString().slice(0, 19));
    }
    const available = new Set(rows.map(r => r.timestamp));
    if (!wanted.length || !wanted.every(t => available.has(t))) return historical(p, d, 'Historical pattern · requested forecast unavailable', '72h ML forecast window covers April 1–3, 2026. Showing verified historical trends:');
    if (p.origin || p.destination || p.direction === 'dropoff') return clarify('Demand forecasts predict pickups by zone. Use “in zone [ID]” to filter a pickup zone.');
    const selected = rows.filter(r => wanted.includes(r.timestamp) && (!p.zone || Number(r.zone_id) === p.zone));
    const totals = new Map();
    for (const r of selected) totals.set(r.zone_id, { name: r.zone_name, value: (totals.get(r.zone_id)?.value || 0) + Number(r.predicted_pickups) });
    const ranked = [...totals.values()].sort((a, b) => b.value - a.value);
    if (!ranked.length) return result('empty', 'Zone outside forecast coverage', [], 'The saved model forecasts only selected high-volume zones.', '/api/demand/forecast?horizon=72');
    return result('ok', 'Model forecast · expected pickups', ranked.map(r => `${r.name}: ${fmt(r.value)} pickups`), `Prioritize availability near ${ranked[0].name}; predicted pickups do not measure unmet demand.`, `/api/demand/forecast?horizon=72 · saved recursive forecast · ${wanted[0]} to ${wanted.at(-1)} NYC · selected zones only${p.minute ? ' · hourly bucket, not minute-level forecast' : ''}`);
  }
  if (intent === 'historical_hotspots') return historical(p, d);
  if (intent === 'od_flows') {
    if (p.date || p.future) return clarify('OD exports contain historical period aggregates. Ask for morning, midday, evening, or night flows.');
    if (!p.period) return clarify('Which OD period: morning, midday, evening, or night?');
    const rows = d.od.filter(r => r.period === p.period && (!p.origin || r.origin_zone_id === p.origin) && (!p.destination || r.destination_zone_id === p.destination) && (!p.zone || r.origin_zone_id === p.zone || r.destination_zone_id === p.zone)).sort((a, b) => b.trip_count - a.trip_count);
    return result(rows.length ? 'ok' : 'empty', `${p.period} · historical OD flows`, rows.map(r => `${r.origin_zone_name} → ${r.destination_zone_name}: ${fmt(r.trip_count)} trips`), rows.length ? 'Review vehicle availability at the origins of the strongest recorded corridors.' : 'No matching pair appears in the exported top ten; this does not mean zero trips.', `od_flows.json · top ten per period · ${historyRange(d)}${p.hour != null ? ' · period aggregate, not exact hour' : ''}`);
  }
  if (intent === 'zone_clusters') {
    if (p.date || p.period || p.origin || p.destination) return clarify('Clusters are saved all-period zone assignments. Ask for a zone or the cluster summary.');
    const rows = p.zone ? d.assignments.filter(r => Number(r.zone_id) === p.zone).map(r => `${r.zone_name}: ${r.cluster_label} (cluster ${r.cluster_id})`) : d.clusters.clusters.map(r => `${r.cluster_label}: ${r.zone_count} zones`);
    return result(rows.length ? 'ok' : 'empty', 'Zone activity clusters', rows, 'Use similar activity profiles to compare positioning strategies.', 'zone_clusters.json + results/zone_cluster_assignments.csv · saved assignments');
  }
  if (intent === 'overview' || intent === 'data_quality') {
    if (p.period || p.zone || p.origin || p.destination || p.future) return clarify('This export supports daily historical totals only; remove zone/time-of-day filters or request a historical YYYY-MM-DD date.');
    const rows = d.daily.filter(r => !p.date || r.date === p.date);
    if (!rows.length) return result('empty', 'No daily records for that date', [], `Available history: ${historyRange(d)}.`, 'overview_daily.json');
    if (intent === 'data_quality') {
      const invalid = rows.filter(r => !finite(r.trip_count) || !finite(r.base_fare_revenue) || Number(r.trip_count) < 0).length;
      const duplicates = rows.length - new Set(rows.map(r => r.date)).size;
      return result('ok', 'Data quality · export checks', [`Daily records checked: ${fmt(rows.length)}`, `Invalid count/revenue records: ${invalid}`, `Duplicate dates: ${duplicates}`], 'Raw-trip missingness and duplicate-trip rates are not available in these exports; this is not a raw-data audit.', 'overview_daily.json · computed aggregate integrity checks');
    }
    return result('ok', 'Historical mobility overview', [`Trips: ${fmt(rows.reduce((n, r) => n + r.trip_count, 0))}`, `Base fare revenue: $${fmt(rows.reduce((n, r) => n + r.base_fare_revenue, 0))}`, `Period: ${rows[0].date} to ${rows.at(-1).date}`], 'Use recorded activity for capacity planning; base fares exclude tips and tolls.', 'overview_daily.json · sum of daily cleaned-data aggregates');
  }
  return clarify('Please ask about one analytics topic at a time.');
}
const historyRange = d => `${d.daily[0]?.date || 'unknown'} to ${d.daily.at(-1)?.date || 'unknown'}`;
function historical(p, d, heading, caveat = '') {
  if (p.origin || p.destination) return clarify('Use “in zone [ID]” for hotspots, or ask for OD flows with from/to zones.');
  if (p.date && !heading) return clarify('Hotspot exports are period aggregates, not date-specific. Ask for a period or a demand forecast.');
  if (p.direction === 'dropoff' && !p.period) return clarify('Choose a period for drop-off hotspots: morning, midday, evening, or night.');
  const key = p.direction === 'dropoff' ? 'dropoff_count' : 'pickup_count';
  const rows = (p.period ? d.hotspots[p.direction].filter(r => r.period === p.period) : d.zones).filter(r => !p.zone || r.zone_id === p.zone).sort((a, b) => b[key] - a[key]);
  return result(rows.length ? 'ok' : 'empty', heading || `${p.period || 'All periods'} · historical hotspots`, rows.map(r => `${r.zone_name}: ${fmt(r[key])} ${p.direction === 'dropoff' ? 'drop-offs' : 'pickups'}`), `${caveat} ${rows.length ? `Consider ${rows[0].zone_name} for ${p.period?.toLowerCase() || 'historical'} positioning based on historical totals.` : 'Zone absent from this top-five export; absence does not mean zero activity.'}`.trim(), `${p.period ? 'hotspots.json · top five per period' : 'zone_activity.json'} · ${historyRange(d)} · historical totals${p.hour != null ? ` · ${p.period} bucket, not exact ${p.hour}:00` : ''} · not a future forecast`);
}
