// Extraction contract is independent of data access and answer generation.
export const normalize = value => value.normalize('NFKC').toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9:./-]+/g, ' ').trim();
export const periodForHour = h => h >= 6 && h < 10 ? 'Morning' : h >= 10 && h < 16 ? 'Midday' : h >= 16 && h < 20 ? 'Evening' : 'Night';
const rules = {
  demand_forecast: [/\b(demand|forecast|peak)\b/, /\b(drivers?|position|positioning)\b/],
  historical_hotspots: [/\b(hotspots?|busiest|busy|pickups?|popular)\b/, /\btop\s+(pickup\s+)?zones\b/],
  od_flows: [/\b(od|flows?|movements?|corridors?|pairs)\b/],
  zone_clusters: [/\b(clusters?|clustering|groups?|similar)\b/],
  fare_prediction: [/\b(fare|cost|price|charge)\b/],
  eta_prediction: [/\b(eta|duration)\b/, /\bhow long\b/],
  model_performance: [/\b(accurate|accuracy|performance|metrics?|mae|rmse|r2|evaluation)\b/],
  data_quality: [/\b(quality|missing|duplicates?|cleaning|completeness)\b/],
  overview: [/\b(revenue|overview|summary|earnings|total trips)\b/],
};
export function extractIntent(question, zones, now = new Date()) {
  const text = normalize(question);
  const scores = Object.fromEntries(Object.entries(rules).map(([key, patterns]) => [key, patterns.reduce((n, re) => n + (re.test(text) ? 3 : 0), 0)]));
  if (/\b(tomorrow|future|next|will)\b/.test(text) && (scores.historical_hotspots || scores.demand_forecast)) scores.demand_forecast += 4;
  if (scores.model_performance) scores.model_performance += 10;
  if (scores.data_quality) scores.data_quality += 5;
  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  let intent = ranked[0][1] ? ranked[0][0] : 'unsupported';
  const p = { timezone: 'America/New_York' };
  const issues = [];
  const periods = [...text.matchAll(/\b(morning|midday|afternoon|evening|night|overnight)\b/g)].map(m => ({ morning: 'Morning', midday: 'Midday', afternoon: 'Midday', evening: 'Evening', night: 'Night', overnight: 'Night' })[m[1]]);
  if (new Set(periods).size > 1) issues.push('Ask for one time period at a time.');
  p.period = periods[0] || null;
  const clock = text.match(/\b(?:at|around)\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/) || text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/);
  if (clock) {
    let h = Number(clock[1]);
    if (h > 23 || Number(clock[2] || 0) > 59 || (clock[3] && (h < 1 || h > 12))) issues.push('Use a valid time, such as 8 AM or 20:00.');
    else if (!clock[3] && !clock[2] && h >= 1 && h <= 12 && !p.period) issues.push(`Does ${h} mean AM or PM?`);
    else {
      if (clock[3]) h = h % 12 + (clock[3] === 'pm' ? 12 : 0);
      else if (p.period === 'Evening' && h < 12) h += 12;
      p.hour = h; p.minute = Number(clock[2] || 0);
      if (p.period && p.period !== periodForHour(h)) issues.push('The time and named period disagree. Please choose one.');
      p.period = periodForHour(h);
    }
  }
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: p.timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  const date = text.match(/\b\d{4}-\d{2}-\d{2}\b/);
  if (date) {
    const parsed = new Date(`${date[0]}T00:00:00Z`);
    if (Number.isNaN(+parsed) || parsed.toISOString().slice(0, 10) !== date[0]) issues.push('Use a valid calendar date in YYYY-MM-DD format.');
    else p.date = date[0];
  } else if (/\b(today|tomorrow|yesterday)\b/.test(text)) {
    const d = new Date(`${today}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + (/tomorrow/.test(text) ? 1 : /yesterday/.test(text) ? -1 : 0));
    p.date = d.toISOString().slice(0, 10);
  }
  if (/\b(next week|next month|last week|last month|weekend|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/.test(text)) issues.push('Please specify a calendar date (YYYY-MM-DD); weekday and week/month ranges are not supported yet.');
  const horizon = text.match(/\bnext\s+(\d+)\s*(hours?|h|days?)\b/);
  if (horizon) p.horizon = Number(horizon[1]) * (horizon[2].startsWith('d') ? 24 : 1);
  p.future = Boolean(p.date && p.date > today || horizon || /\b(future|tomorrow|will|forecast)\b/.test(text));
  p.model = /\b(eta|duration)\b/.test(text) ? 'eta' : /\bfare\b/.test(text) ? 'fare' : /\bdemand\b/.test(text) ? 'demand' : /\bcluster/.test(text) ? 'cluster' : null;
  p.direction = /\b(dropoff|drop-off|drop off)\b/.test(text) ? 'dropoff' : 'pickup';
  function resolve(value) {
    const id = value.match(/^(?:zone\s+)?(\d+)\b/);
    if (id) return zones.find(z => z.zone_id === Number(id[1]));
    const matches = zones.filter(z => value.startsWith(normalize(z.zone_name)));
    return matches.sort((a, b) => b.zone_name.length - a.zone_name.length)[0];
  }
  for (const [key, re] of [['origin', /\bfrom\s+(.+)/], ['destination', /\bto\s+(.+)/], ['zone', /\b(?:in|for)\s+zone\s+(\d+)/]]) {
    const m = text.match(re);
    if (m) { const z = resolve(m[1]); if (z) p[key] = z.zone_id; else issues.push(`Specify a recognized ${key} zone name or zone ID.`); }
  }
  if (!p.origin && !p.destination && !p.zone) {
    const mentioned = zones.filter(z => text.includes(normalize(z.zone_name)));
    if (mentioned.length === 1) p.zone = mentioned[0].zone_id;
    else if (mentioned.length > 1) issues.push('Use “from [zone] to [zone]” to identify the route.');
  }
  for (const [key, re] of [['provider', /\bprovider\s+(\d+)\b/], ['riders', /\b(\d+)\s+(?:riders?|passengers?)\b/], ['rate', /\brate(?: class)?\s+(\d+)\b/]]) {
    const m = text.match(re); if (m) p[key] = Number(m[1]);
  }
  if (ranked[0][1] && ranked[0][1] === ranked[1][1]) { intent = 'ambiguous'; issues.push('Please ask about one topic: demand, hotspots, OD flows, clusters, fare, ETA, metrics, quality, or overview.'); }
  return { intent, parameters: p, scores, issues };
}
