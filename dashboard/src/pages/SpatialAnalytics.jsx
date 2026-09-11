import { useState } from "react";
import { PageContainer } from "../components/layout/PageContainer";
import { AnalyticsCard } from "../components/cards/AnalyticsCard";
import hotspots from "../data/generated/hotspots.json";
import odFlows from "../data/generated/od_flows.json";
import clusters from "../data/generated/zone_clusters.json";
import { TaxiZoneMap } from "../components/maps/TaxiZoneMap";

const periods = ["Morning", "Midday", "Evening", "Night"];
const periodWindows = { Morning: "06:00–10:00", Midday: "10:00–16:00", Evening: "16:00–20:00", Night: "20:00–06:00" };
const formatCount = value => Math.round(value).toLocaleString("en-US");
const formatShare = value => `${(value * 100).toFixed(2)}%`;

function PeriodSelector({ period, setPeriod }) {
  return <div className="segmented" aria-label="Time period">
    {periods.map(value => <button key={value} aria-pressed={period === value} onClick={() => setPeriod(value)}>{value}</button>)}
  </div>;
}

function Ranking({ rows, countKey, title }) {
  return <ol className="spatial-ranking" aria-label={title}>
    {rows.slice(0, 5).map(row => <li key={row.zone_id}>
      <span className="spatial-ranking__rank">{row.rank}</span>
      <div><strong>{row.zone_name}</strong><small>{row.borough || "Unmatched zone"}</small></div>
      <span className="spatial-ranking__value">{formatCount(row[countKey])}<small>{formatShare(row.share)}</small></span>
    </li>)}
  </ol>;
}

export function SpatialAnalytics({ mode }) {
  const [period, setPeriod] = useState("Morning");
  const [mapView, setMapView] = useState("hotspot");
  const pickup = hotspots.pickup.filter(row => row.period === period);
  const dropoff = hotspots.dropoff.filter(row => row.period === period);
  const flows = odFlows.filter(row => row.period === period).slice(0, 5);
  const isHotspot = mode === "hotspots";
  const leader = isHotspot ? pickup[0] : flows[0];

  return <PageContainer className="spatial-page">
    <div className="page-heading">
      <div><h1>{isHotspot ? "Zone & Hotspots" : "OD Flows"}</h1><p>{isHotspot ? "Real pickup and dropoff rankings by time period." : "Real origin-to-destination movement ranked by trip count."}</p><small className="spatial-period-definition">{period}: {periodWindows[period]}</small></div>
      <PeriodSelector period={period} setPeriod={setPeriod} />
    </div>
    {isHotspot ? <>
      <div data-tour="hotspot-map">
        <AnalyticsCard title="Geographic zone map" description={`Official NYC TLC boundaries · ${period} pickup intensity`} actions={<div className="segmented" aria-label="Map view"><button aria-pressed={mapView === "hotspot"} onClick={() => setMapView("hotspot")}>Hotspot intensity</button><button aria-pressed={mapView === "cluster"} onClick={() => setMapView("cluster")}>Cluster view</button></div>}>
          <TaxiZoneMap period={period} view={mapView} />
          <p className="spatial-method-note">Boundaries: official NYC TLC taxi zones joined by LocationID. IDs 264 and 265 have no polygon geometry and are excluded from this map.</p>
        </AnalyticsCard>
      </div>
      <section className="spatial-grid">
        <AnalyticsCard title="Top pickup zones" description={`${period} · ${periodWindows[period]}`}><Ranking rows={pickup} countKey="pickup_count" title="Top pickup zones" /></AnalyticsCard>
        <AnalyticsCard title="Top dropoff zones" description={`${period} · real destination counts`}><Ranking rows={dropoff} countKey="dropoff_count" title="Top dropoff zones" /></AnalyticsCard>
      </section>
      <AnalyticsCard title="Period insight" description="Derived from cleaned trip counts">
        <p className="spatial-insight">{leader ? `${leader.zone_name} ranks first for ${period.toLowerCase()} pickups with ${formatCount(leader.pickup_count)} trips (${formatShare(leader.share)} of all trips in this period).` : "No hotspot data available."}</p>
      </AnalyticsCard>
      <AnalyticsCard title="Movement Clusters" description={`Zone-level clustering using official zone IDs and names · KMeans k=${clusters.selected_k}`}>
        <div className="cluster-grid" aria-label="Movement cluster summaries">
          {clusters.clusters.map(cluster => <div className="cluster-summary" key={cluster.cluster_id}>
            <div className="cluster-summary__heading"><strong>{cluster.cluster_label}</strong><span>{cluster.zone_count} zones</span></div>
            <p>Avg pickups {formatCount(cluster.average_pickup_count)} · Avg dropoffs {formatCount(cluster.average_dropoff_count)}</p>
            <p>Dominant period: {cluster.dominant_period}</p>
            <small>Examples: {cluster.representative_zones.join(", ")}</small>
          </div>)}
        </div>
        <p className="spatial-method-note">This is a non-geographic movement profile. No coordinates or map geometry are inferred.</p>
      </AnalyticsCard>
    </> : <>
      <div data-tour="od-flow-routes">
        <AnalyticsCard title="Top OD routes" description={`${period} · ranked by trip count; no geographic coordinates inferred`}>
          <ol className="flow-ranking" aria-label="Top OD routes">
            {flows.map(row => <li key={`${row.origin_zone_id}-${row.destination_zone_id}`}><span className="spatial-ranking__rank">{row.rank}</span><div><strong>{row.origin_zone_name} → {row.destination_zone_name}</strong><small>{row.origin_borough} → {row.destination_borough}</small></div><span className="spatial-ranking__value">{formatCount(row.trip_count)}<small>{formatShare(row.share)}</small></span></li>)}
          </ol>
        </AnalyticsCard>
      </div>
      <AnalyticsCard title="Movement comparison" description="Top routes in the selected period">
        <div className="flow-bars">{flows.map(row => <div key={`${row.origin_zone_id}-${row.destination_zone_id}`}><div className="flow-bars__label"><span>{row.origin_zone_name} → {row.destination_zone_name}</span><strong>{formatCount(row.trip_count)}</strong></div><div className="flow-bars__track"><i style={{ width: `${(row.trip_count / flows[0].trip_count) * 100}%` }} /></div></div>)}</div>
        <p className="spatial-insight">{leader ? `${leader.origin_zone_name} → ${leader.destination_zone_name} is the highest-count observed route in the ${period.toLowerCase()} period.` : "No OD flow data available."}</p>
      </AnalyticsCard>
    </>}
  </PageContainer>;
}