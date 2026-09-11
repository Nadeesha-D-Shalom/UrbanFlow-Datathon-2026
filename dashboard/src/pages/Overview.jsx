import { useState } from "react";
import { PageContainer } from "../components/layout/PageContainer";
import { KPICard } from "../components/cards/KPICard";
import { AnalyticsCard } from "../components/cards/AnalyticsCard";
import { InsightCard } from "../components/cards/InsightCard";
import { GlobalFilterBar } from "../components/filters/GlobalFilterBar";
import { ChartContainer } from "../components/charts/ChartContainer";
import { TopPickupZones } from "../components/charts/TopPickupZones";
import { overviewKPIs } from "../data/mockDashboard";
import dailyMetrics from "../data/generated/overview_daily.json";
import weeklyMetrics from "../data/generated/overview_weekly.json";
import zoneActivity from "../data/generated/zone_activity.json";
const daily = dailyMetrics.map((day) => ({
  label: day.date,
  value: day.trip_count,
}));
const weekly = weeklyMetrics.map((week) => ({
  label: week.week_start,
  value: week.trip_count,
}));
const revenue = dailyMetrics.map((day) => ({
  label: day.date,
  value: day.base_fare_revenue,
}));
const formatTrips = (value) => value.toLocaleString("en-US");
const formatRevenue = (value) => value.toLocaleString("en-US", {
  style: "currency", currency: "USD",
});
const provenance = "Cleaned UrbanFlow historical data";
const topZones = zoneActivity.slice(0, 5);
const leadingZone = topZones[0];
const topShare = topZones.reduce((sum, zone) => sum + zone.share_of_total_pickups, 0);
const periodFormatter = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
const periodLabel = `${periodFormatter.format(new Date(dailyMetrics[0].date))} – ${periodFormatter.format(new Date(dailyMetrics.at(-1).date))}`;
export function Overview() {
  const [interval, setInterval] = useState("Daily");
  const series = interval === "Daily" ? daily : weekly;
  return (
    <PageContainer className="overview-page">
      <div className="page-heading">
        <div>
          <h1>Executive Overview</h1>
          <p>Historical analytics · Cleaned trip data · {periodLabel}</p>
        </div>
      </div>
      <GlobalFilterBar disabled periodLabel={periodLabel} />
      <section className="kpi-grid" aria-label="Verified dataset KPIs">
        {overviewKPIs.map(({ label, value }) => (
          <KPICard key={label} label={label} value={value} />
        ))}
      </section>
      <section className="analytics-grid" aria-label="Historical analytics">
        <AnalyticsCard
          title="Trip Demand Trend"
          description={`${interval} pickup counts`}
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
              {interval === "Daily"
                ? "Each point represents one calendar day"
                : "Mon–Sun totals; boundary weeks partial"}
            </span>
          }
        >
          <ChartContainer
            data={series}
            label="Trips"
            displayDivisor={1_000_000}
            valueFormatter={formatTrips}
            provenance={provenance}
            summary={`${interval} pickup trip counts from cleaned UrbanFlow historical data. Weekly dates identify Monday week starts.`}
          />
        </AnalyticsCard>
        <AnalyticsCard
          title="Revenue Trend"
          description="Daily base fare revenue"
          footer={
            <span className="card-footnote">
              Excludes tips & tolls
            </span>
          }
        >
          <ChartContainer
            data={revenue}
            type="bar"
            unit="M"
            label="Revenue ($)"
            displayDivisor={1_000_000}
            valueFormatter={formatRevenue}
            provenance={provenance}
            summary="Daily base fare revenue from cleaned UrbanFlow historical data; excludes tips and tolls."
          />
        </AnalyticsCard>
        <AnalyticsCard
          title="Top Pickup Zones"
          description="Highest pickup volumes across the cleaned trip dataset"
          footer={<span className="card-footnote">Bars relative to the leading zone; shares use all pickups.</span>}
        >
          <TopPickupZones zones={topZones} />
        </AnalyticsCard>
        <div className="insight-wrapper">
          <div className="insight-heading">
            <h2>Business Insight</h2>
          </div>
          <InsightCard
            title="Pickup Demand Concentration"
            showBadge={false}
            evidence={`${leadingZone.zone_name} recorded ${formatTrips(leadingZone.pickup_count)} pickups, representing ${(leadingZone.share_of_total_pickups * 100).toFixed(2)}% of all cleaned trips. The top five zones together account for ${(topShare * 100).toFixed(2)}% of pickups.`}
            interpretation="These rankings identify where recorded pickup activity is highest and can inform location-level capacity reviews. Pickup volumes alone do not establish unmet demand or vehicle availability."
          />
        </div>
      </section>
    </PageContainer>
  );
}
