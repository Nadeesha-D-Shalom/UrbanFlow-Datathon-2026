import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { answerQuestion, parseCsv } from '../src/assistant/engine.js';

const root = new URL('../../', import.meta.url);
const read = path => fs.readFile(new URL(path, root), 'utf8');
const json = async path => JSON.parse(await read(path));
const generated = name => json(`dashboard/src/data/generated/${name}.json`);
const data = {
  hotspots: await generated('hotspots'), od: await generated('od_flows'), clusters: await generated('zone_clusters'),
  daily: await generated('overview_daily'), zones: await generated('zone_activity'), metadata: await generated('fare_metadata'),
  eta: await json('integration/eta/eta_model_metadata.json'),
  fare: parseCsv(await read('results/fare_results_nadeesha.csv')), demand: parseCsv(await read('results/metrics/demand_test_metrics.csv')),
  assignments: parseCsv(await read('results/zone_cluster_assignments.csv')),
};
const base = process.env.ASSISTANT_API_URL || 'http://127.0.0.1:8000';
const call = async (path, payload) => {
  const response = await fetch(base + path, { ...(payload ? { method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' } } : {}), signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`API ${response.status}`);
  return response.json();
};
const api = { demandForecast: h => call(`/api/demand/forecast?horizon=${h}`), farePrediction: p => call('/api/fare/predict', p), durationPrediction: p => call('/api/duration/predict', p) };
const now = new Date('2026-09-11T12:00:00Z');
const cases = [
  ['What areas could be peak tomorrow around 8 AM?', 'demand_forecast', 'ok', { date: '2026-09-12', hour: 8, period: 'Morning' }, 'historical totals'],
  ['Where will demand be high tomorrow morning?', 'demand_forecast', 'ok', { date: '2026-09-12', period: 'Morning' }, 'historical totals'],
  ['Best zones for drivers around 8?', 'demand_forecast', 'clarification', {}, 'AM or PM'],
  ['Which zones are busiest at night?', 'historical_hotspots', 'ok', { period: 'Night' }, '689,318'],
  ['Where should drivers position in the morning?', 'demand_forecast', 'ok', { period: 'Morning' }, '298,128'],
  ['What are the strongest evening movements?', 'od_flows', 'ok', { period: 'Evening' }, '82,840'],
  ['Show morning OD corridors from zone 236', 'od_flows', 'ok', { origin: 236, period: 'Morning' }, 'Upper East Side North'],
  ['Top pickup zones', 'historical_hotspots', 'ok', {}, '1,985,100'],
  ['Show similar zone groups', 'zone_clusters', 'ok', {}, '41 zones'],
  ['Which cluster is JFK Airport in?', 'zone_clusters', 'ok', { zone: 132 }, 'JFK Airport'],
  ['How much will the fare cost?', 'fare_prediction', 'clarification', {}, 'origin zone'],
  ['Fare from zone 161 to zone 132 tomorrow at 8 AM provider 1', 'fare_prediction', 'ok', { origin: 161, destination: 132, provider: 1 }, '/api/fare/predict'],
  ['How long will a trip take?', 'eta_prediction', 'clarification', {}, 'pickup date'],
  ['ETA from Midtown Center to JFK Airport tomorrow at 8 AM provider 1', 'eta_prediction', 'ok', { origin: 161, destination: 132, hour: 8 }, '/api/duration/predict'],
  ['How accurate is our ETA model?', 'model_performance', 'ok', { model: 'eta' }, '4.53 min'],
  ['Fare model performance', 'model_performance', 'ok', { model: 'fare' }, '4.56 USD'],
  ['Show demand RMSE', 'model_performance', 'ok', { model: 'demand' }, '97.92 pickups'],
  ['Data quality summary', 'data_quality', 'ok', {}, 'not a raw-data audit'],
  ['Any missing values or duplicates?', 'data_quality', 'ok', {}, 'Duplicate dates: 0'],
  ['Give me a revenue overview', 'overview', 'ok', {}, 'Base fare revenue'],
  ['Total trips on 2025-04-01', 'overview', 'ok', { date: '2025-04-01' }, '120,016'],
  ['Revenue on 2024-01-01', 'overview', 'empty', { date: '2024-01-01' }, 'No daily records'],
  ['Tell me a joke', 'unsupported', 'unsupported', {}, 'Choose an UrbanFlow'],
  ['Demand next week', 'demand_forecast', 'clarification', {}, 'calendar date'],
  ['Forecast demand on 2026-04-01 at 8 AM', 'demand_forecast', 'ok', { hour: 8 }, 'Model forecast'],
  ['Fare from zone 9999 to zone 132 tomorrow at 8 AM provider 1', 'fare_prediction', 'clarification', {}, 'recognized origin'],
  ['Strongest night flows from zone 12', 'od_flows', 'empty', { origin: 12 }, 'does not mean zero'],
  ['Forecast next 96 hours', 'demand_forecast', 'ok', { horizon: 96 }, 'at most 72 hours'],
  ['Busiest zones at 25:00', 'historical_hotspots', 'clarification', {}, 'valid time'],
  ['Fare and ETA prediction', 'ambiguous', 'clarification', {}, 'one topic'],
];
const reports = [];
for (const [question, intent, status, parameters, contains] of cases) {
  const answer = await answerQuestion(question, data, api, now);
  let failure = '';
  try {
    assert.equal(answer.intent, intent); assert.equal(answer.status, status);
    for (const [key, value] of Object.entries(parameters)) assert.equal(answer.parameters[key], value);
    assert.ok(JSON.stringify(answer).includes(contains), `Missing ${contains}`);
    assert.ok(answer.items.length <= 5); assert.ok(answer.source);
    assert.ok(!JSON.stringify(answer).includes('NaN'));
  } catch (e) { failure = e.message; }
  reports.push({ question, detectedIntent: answer.intent, extractedParameters: answer.parameters, source: answer.source, answer: { heading: answer.heading, items: answer.items, insight: answer.insight, status: answer.status }, result: failure ? 'FAIL' : 'PASS', ...(failure ? { failure } : {}) });
}
// Boundary and failure tests use injected adapters; numerical outputs above use real services.
const checks = [];
async function check(name, fn) { try { await fn(); checks.push({ name, result: 'PASS' }); } catch(e) { checks.push({ name, result: 'FAIL', failure: e.message }); } }
await check('Forecast outage returns explicit historical evidence', async () => {
  const a = await answerQuestion('Peak tomorrow morning', data, { demandForecast: async () => { throw Error(); } }, now);
  assert.match(a.heading, /service unavailable/); assert.match(a.source, /not a future forecast/);
});
await check('Prediction outage returns error without invented values', async () => {
  const a = await answerQuestion(cases[11][0], data, { farePrediction: async () => { throw Error(); } }, now);
  assert.equal(a.status, 'error'); assert.deepEqual(a.items, []);
});
await check('Invalid prediction response cannot produce a number', async () => {
  const a = await answerQuestion(cases[11][0], data, { farePrediction: async () => ({ predicted_base_fare: null }) }, now);
  assert.equal(a.status, 'error');
});
await check('Forecast hour aggregation equals saved CSV values', async () => {
  const rows = parseCsv(await read('results/forecasts/demand_forecast_72h.csv')).filter(r => r.timestamp === '2026-04-01 08:00:00').sort((a,b) => b.predicted_pickups - a.predicted_pickups);
  const a = await answerQuestion(cases[24][0], data, api, now);
  assert.equal(a.items[0], `${rows[0].zone_name}: ${Number(Number(rows[0].predicted_pickups).toFixed(2)).toLocaleString('en-US', { maximumFractionDigits: 2 })} pickups`);
});
await check('NYC midnight date resolution is independent of browser timezone', async () => {
  const a = await answerQuestion('Peak tomorrow morning', data, api, new Date('2026-09-12T01:00:00Z'));
  assert.equal(a.parameters.date, '2026-09-12');
});
await check('Missing forecast hour never yields partial-window total', async () => {
  const response = await api.demandForecast(72);
  const a = await answerQuestion('Forecast demand on 2026-04-01 morning', data, { demandForecast: async () => ({ rows: response.rows.filter(r => !r.timestamp.includes('08:00:00')) }) }, now);
  assert.match(a.heading, /requested forecast unavailable/);
});
await fs.mkdir(new URL('docs/validation/', root), { recursive: true });
await fs.writeFile(new URL('docs/validation/mobility-assistant-validation.json', root), JSON.stringify({ clock: now.toISOString(), api: base, cases: reports, checks }, null, 2) + '\n');
console.log(JSON.stringify({ questions: reports.length, passed: reports.filter(r => r.result === 'PASS').length, checks, failures: reports.filter(r => r.result === 'FAIL') }, null, 2));
if ([...reports, ...checks].some(r => r.result === 'FAIL')) process.exitCode = 1;
