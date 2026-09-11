import { useEffect, useState } from "react";
import { PageContainer } from "../components/layout/PageContainer";
import { AnalyticsCard } from "../components/cards/AnalyticsCard";
import { ChartContainer } from "../components/charts/ChartContainer";
import { api } from "../services/api";

const horizons = [24, 48, 72];
const formatPickups = (value) => Math.round(value).toLocaleString("en-US");

function summarize(rows) {
  const byZone = new Map();
  rows.forEach((row) => byZone.set(row.zone_id, {
    zone_id: row.zone_id, zone_name: row.zone_name,
    total: (byZone.get(row.zone_id)?.total || 0) + row.predicted_pickups,
  }));
  return [...byZone.values()].sort((a, b) => b.total - a.total);
}

export function DemandAnalytics({ onBack }) {
  const [horizon, setHorizon] = useState(24);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    setError("");
    api.demandForecast(horizon)
      .then((data) => { if (mounted) setRows(data.rows.map((row) => ({ ...row, predicted_pickups: Number(row.predicted_pickups) }))); })
      .catch(() => { if (mounted) setError("Demand forecast service is unavailable."); });
    return () => { mounted = false; };
  }, [horizon]);

  const ranked = summarize(rows);
  const timestamps = [...new Set(rows.map((row) => row.timestamp))];
  const series = ranked.map((zone) => ({
    zone,
    data: timestamps.map((timestamp) => ({
      label: timestamp.slice(5, 13).replace("T", " "),
      value: rows.find((row) => row.zone_id === zone.zone_id && row.timestamp === timestamp)?.predicted_pickups || 0,
    })),
  }));
  const leader = ranked[0];

  return (
    <PageContainer className="demand-page">
      <div className="page-heading">
        <div><h1>Demand Analytics</h1><p>Recursive hourly pickup forecasts for the highest-volume taxi zones.</p></div>
        <button className="secondary-button" type="button" onClick={onBack}>Back to Overview →</button>
        <div className="segmented" aria-label="Forecast horizon">
          {horizons.map((value) => <button key={value} aria-pressed={horizon === value} onClick={() => setHorizon(value)}>{value}h</button>)}
        </div>
      </div>
      {error ? <p className="fare-error" role="alert">{error}</p> : <>
        <section className="demand-summary" aria-label="Forecast summary">
          <span>Forecast window</span><strong>{horizon} hours</strong>
          <span>Starts</span><strong>{rows[0]?.timestamp?.replace("T", " ") || "Loading"}</strong>
          <span>Model</span><strong>LightGBM · recursive</strong>
        </section>
        <section className="demand-chart-grid" data-tour="demand-chart" aria-label="Demand forecast charts">
          {series.map(({ zone, data }) => <AnalyticsCard key={zone.zone_id} title={zone.zone_name} description="Predicted pickups by hour">
            <ChartContainer data={data} label="Pickups" unit="trips" valueFormatter={formatPickups} suppliedMax={undefined} provenance="UrbanFlow demand forecast" summary={`${zone.zone_name} predicted hourly pickups`} />
          </AnalyticsCard>)}
        </section>
        <section className="demand-bottom-grid">
          <AnalyticsCard title="Ranked expected demand" description={`Total predicted pickups across the next ${horizon} hours`}>
            <ol className="demand-ranking">{ranked.map((zone) => <li key={zone.zone_id}><span>{zone.zone_name}</span><strong>{formatPickups(zone.total)}</strong></li>)}</ol>
          </AnalyticsCard>
          <AnalyticsCard title="Operational insight" description="Based on forecast totals">
            <p className="demand-insight">{leader ? `${leader.zone_name} is expected to lead the next ${horizon} hours with approximately ${formatPickups(leader.total)} pickups. Prioritize driver availability there during the forecast window.` : "Loading forecast values..."}</p>
          </AnalyticsCard>
        </section>
      </>}
    </PageContainer>
  );
}