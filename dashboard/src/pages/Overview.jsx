import { useState } from "react";
import { PageContainer } from "../components/layout/PageContainer";
import { KPICard } from "../components/cards/KPICard";
import { AnalyticsCard } from "../components/cards/AnalyticsCard";
import { InsightCard } from "../components/cards/InsightCard";
import { GlobalFilterBar } from "../components/filters/GlobalFilterBar";
import { ChartContainer } from "../components/charts/ChartContainer";
import { MapContainer } from "../components/maps/MapContainer";
import { overviewInsight, overviewKPIs } from "../data/mockDashboard";
const values = [
  1.08, 1.18, 1.12, 1.04, 1.36, 1.49, 1.21, 1.18, 1.32, 1.28, 1.43, 1.57, 1.62,
  1.3, 1.34, 1.49, 1.39, 1.56, 1.72, 1.81, 1.51, 1.44, 1.53, 1.49, 1.67, 1.78,
  1.93, 1.67, 1.61, 1.74,
];
const daily = values.map((value, i) => ({
  label: `Jan ${String(i + 1).padStart(2, "0")}`,
  value,
}));
const weekly = [1.21, 1.39, 1.52, 1.67].map((value, i) => ({
  label: `Jan ${i * 7 + 1}`,
  value,
}));
const icons = [
  "M5 17h14M7 14V9m5 5V5m5 9v-7",
  "M12 3v18m5-15H9a3 3 0 0 0 0 6h6a3 3 0 0 1 0 6H6",
  "M4 7h16v12H4zM4 7l3-3h10l3 3M15 12h5",
  "M12 8v5l3 2M9 2h6M12 5a8 8 0 1 0 0 16 8 8 0 0 0 0-16",
];
export function Overview({
  filters,
  activeFilterCount,
  onFilterChange,
  onResetFilters,
}) {
  const [interval, setInterval] = useState("Daily");
  const series = interval === "Daily" ? daily : weekly;
  return (
    <PageContainer>
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            <span className="blue-rule" /> MOBILITY INTELLIGENCE
          </div>
          <h1>Executive Overview</h1>
          <p>Your city's movement. A clearer picture of performance.</p>
        </div>
        <span className="preview-label">
          <span /> Design preview <b>v0.1</b>
        </span>
      </div>
      <GlobalFilterBar
        {...{ filters, activeFilterCount, onFilterChange, onResetFilters }}
      />
      <div className="sample-banner" role="status">
        <span className="sample-icon">i</span>
        <span>
          <strong>Sample data workspace.</strong> Illustrative values for design
          evaluation.
          {activeFilterCount > 0
            ? " Filter selections are saved; preview values remain unchanged."
            : " Live analytics are not connected."}
        </span>
        <span className="sample-period">JAN 01 – JAN 30, 2026</span>
      </div>
      <section
        className="kpi-grid"
        aria-label="Sample key performance indicators"
      >
        {overviewKPIs.map((kpi, i) => (
          <KPICard
            key={kpi.label}
            {...kpi}
            icon={
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d={icons[i]} />
              </svg>
            }
          />
        ))}
      </section>
      <div className="section-line">
        <h2>Performance at a glance</h2>
        <span>Trends, geography & operational signals</span>
      </div>
      <section className="analytics-grid" aria-label="Sample analytics">
        <AnalyticsCard
          title="Trip Demand Trend"
          description="Daily pickup volume across the city"
          actions={
            <div className="segmented" aria-label="Chart interval">
              {["Daily", "Weekly"].map((value) => (
                <button
                  key={value}
                  aria-pressed={interval === value}
                  onClick={() => setInterval(value)}
                >
                  {value}
                </button>
              ))}
            </div>
          }
          footer={
            <span className="card-footnote">
              <span className="tiny-dot" /> Sample series ·{" "}
              {interval === "Daily"
                ? "Daily volume"
                : "Average daily volume by week"}{" "}
              <span>Hover or focus to explore</span>
            </span>
          }
        >
          <ChartContainer
            data={series}
            comparison={series.map((d, i) => ({
              ...d,
              value: d.value * 0.86 + (i % 3) * 0.025,
            }))}
            max={2}
            label="Trips"
          />
        </AnalyticsCard>
        <AnalyticsCard
          title="Revenue Trend"
          description="Fare revenue across the sample period"
          actions={<span className="card-tag">USD</span>}
          footer={
            <span className="card-footnote">
              <span className="tiny-dot" /> Sample series · Daily revenue{" "}
              <span>Excludes tips & tolls</span>
            </span>
          }
        >
          <ChartContainer
            data={daily.map((d) => ({ ...d, value: d.value * 21.4 }))}
            type="bar"
            max={48}
            unit="M"
            label="Revenue ($)"
          />
        </AnalyticsCard>
        <AnalyticsCard
          title="Zone Activity Map"
          description="Where the city moves · illustrative pickup hotspots"
          actions={<span className="card-tag">5 zones</span>}
          compact
          footer={
            <span className="card-footnote">
              Schematic preview · Not geographic boundaries{" "}
              <span>Drag to pan · Select a zone</span>
            </span>
          }
        >
          <MapContainer />
        </AnalyticsCard>
        <div className="insight-wrapper">
          <div className="insight-heading">
            <span>✧</span>
            <h2>Business Insight</h2>
            <span className="card-tag">SAMPLE</span>
          </div>
          <InsightCard {...overviewInsight} />
        </div>
      </section>
      <footer className="page-footer">
        <span>
          <strong>UrbanFlow</strong> Analytics <span> / </span> From movement to
          management.
        </span>
        <span>SLIIT Codefest Datathon 2026</span>
      </footer>
    </PageContainer>
  );
}
