import { useState, useMemo } from "react";
import { PageContainer } from "../components/layout/PageContainer";
import { AnalyticsCard } from "../components/cards/AnalyticsCard";
import { KPICard } from "../components/cards/KPICard";
import { StatusBadge } from "../components/common/StatusBadge";
import "./BusinessInsights.css";

const insightsData = [
  {
    id: "midday-congestion",
    title: "Midday Speed Deficit vs Evening Rush Volume",
    domain: "Demand & Operations",
    category: "demand",
    badgeVariant: "warning",
    problem:
      "Midday surface street congestion creates significant vehicle turnaround bottlenecks, slowing fleet velocity hours before the evening rush.",
    evidence:
      "Midday (12:00–16:59) travel time averages 19.97 min (peaking at 20.73 min at 3 PM), which is 28.8% slower than night (15.51 min) and slower than the evening peak (17.05 min), despite evening handling 9.7% more trips (625k vs 570k sample trips).",
    action:
      "Dynamically expand pre-trip dispatch buffer times by 4–5 minutes between 12:00 and 16:00, route non-urgent repositioning away from Midtown crosstown avenues, and pre-stage drivers around transit perimeters before 17:00.",
  },
  {
    id: "spatial-concentration",
    title: "Core Manhattan Spatial Concentration & Peripheral Undersupply",
    domain: "Spatial & Hotspots",
    category: "spatial",
    badgeVariant: "information",
    problem:
      "Fleet positioning heavily over-indexes on core Manhattan avenues, causing vehicle clustering during off-peak hours and undersupply in outer boroughs.",
    evidence:
      "The top 5 pickup zones (Upper East Side North, Upper East Side South, Midtown Center, Midtown East, and Penn Station) generate over 10.2M pickups (>23% of citywide demand), while outer borough zones represent under 5% aggregate pickup share.",
    action:
      "Maintain automated dispatch queues in the core 5 zones while deploying base minimum guarantees to position select vehicles around high-yield peripheral transit hubs (Long Island City, Downtown Brooklyn).",
  },
  {
    id: "upfront-pricing",
    title: "Pre-Trip Upfront Pricing Feasibility via Spatial Pairs",
    domain: "Fare Strategy",
    category: "fare",
    badgeVariant: "success",
    problem:
      "Post-trip metered pricing causes rider price uncertainty and dispute overhead, but naive upfront quotes risk margin degradation.",
    evidence:
      "Rate Class (47.3%), Origin Zone (25.6%), and Destination Zone (23.0%) explain 96.0% of base fare variance, enabling the Decision Tree model to achieve a $4.39 MAE on the unseen March 2026 test partition using pre-trip features alone.",
    action:
      "Safely deploy upfront guaranteed base-fare pricing at booking based on rate class and zone IDs, eliminating meter disputes without risking underpricing.",
  },
  {
    id: "airport-deadhead",
    title: "Airport Corridor Return-Trip Deadhead Risk",
    domain: "OD Flows & Logistics",
    category: "spatial",
    badgeVariant: "neutral",
    problem:
      "Long-haul outbound airport trips deliver high gross revenue but risk uncompensated return travel ('deadheading'), lowering driver hourly net earnings.",
    evidence:
      "Airport flat rates (Rate Class 2) make rate class the primary fare driver (47.3% feature importance; JFK base fares average >$65 vs $20.73 citywide), but inbound passenger demand concentrates in specific flight arrival waves.",
    action:
      "Implement return-dispatch matching at JFK and LaGuardia terminals, prioritizing incoming passenger assignments for drivers within 15 minutes of airport drop-off to minimize empty return trips to Manhattan.",
  },
  {
    id: "eta-confidence",
    title: "5-Minute Arrival Confidence Windows for Passenger Reliability",
    domain: "ETA & Trip Efficiency",
    category: "eta",
    badgeVariant: "success",
    problem:
      "Single-minute ETA estimates create unrealistic passenger expectations and driver idle waiting when minor traffic fluctuations occur.",
    evidence:
      "The LightGBM ETA model achieves 70.95% accuracy within ±5 minutes with a mean rolling MAE of 4.53 min (R² 0.7412) across four validation folds (Nov 2025 – Feb 2026), utilizing historical corridor medians without post-trip GPS leakage.",
    action:
      "Display a 5-minute confidence arrival window (e.g., '15–20 min') in passenger booking interfaces, while utilizing the precise point estimate for backend fleet dispatch and positioning.",
  },
  {
    id: "midweek-revenue",
    title: "Midweek Revenue Peak vs Weekend Trip Economics",
    domain: "Revenue & Fleet Planning",
    category: "fare",
    badgeVariant: "information",
    problem:
      "Uniform weekly driver scheduling fails to capture the sharp contrast between midweek business demand and weekend leisure travel patterns.",
    evidence:
      "Thursday leads daily base revenue at $2.74M/day average ($142.6M total across 52 Thursdays), while Sunday yields the highest average base fare at $21.45 (vs $20.73 overall) due to longer airport and cross-borough trips.",
    action:
      "Schedule routine fleet maintenance on lower-volume Mondays ($2.17M/day run rate), maximize active fleet capacity on Thursdays, and optimize weekend positioning around airport and leisure corridors.",
  },
];

const categoryFilters = [
  { key: "all", label: "All Insights (6)" },
  { key: "demand", label: "Demand & Operations (1)" },
  { key: "spatial", label: "Spatial & OD Flows (2)" },
  { key: "fare", label: "Fare & Revenue (2)" },
  { key: "eta", label: "ETA & Dispatch (1)" },
];

export function BusinessInsights({ onNavigate, onBack }) {
  const [selectedFilter, setSelectedFilter] = useState("all");

  const filteredInsights = useMemo(() => {
    if (selectedFilter === "all") return insightsData;
    return insightsData.filter((item) => item.category === selectedFilter);
  }, [selectedFilter]);

  return (
    <PageContainer className="business-insights-page">
      {/* Header */}
      <div className="page-heading">
        <div>
          <h1>Business & Operational Insights</h1>
          <p>
            Actionable findings synthesizing verified Demand, Hotspots, OD Flows, Fare, ETA, and Revenue analytics.
          </p>
        </div>
        <div className="insights-header-actions">
          {onBack && (
            <button type="button" className="secondary-button" onClick={onBack}>
              Back to Overview →
            </button>
          )}
        </div>
      </div>

      {/* Verified Analytics Anchor Summary */}
      <section className="kpi-grid" aria-label="Key Baseline Metrics">
        <KPICard
          label="Total Base-Fare Revenue"
          value="$918.3M"
          compareLabel="44.3M trips · Apr 2025 – Mar 2026"
        />
        <KPICard
          label="Average Base Fare"
          value="$20.73"
          compareLabel="Peak on Sunday ($21.45)"
        />
        <KPICard
          label="Average Trip Duration"
          value="18.1 min"
          compareLabel="Peak midday: 19.97 min"
        />
        <KPICard
          label="ETA Accuracy (±5 min)"
          value="70.95%"
          compareLabel="Rolling validation (Nov–Feb)"
        />
      </section>

      {/* Filter Tabs */}
      <div className="insights-filter-bar">
        <div className="filter-pill-group" role="tablist" aria-label="Filter insights by domain">
          {categoryFilters.map((f) => (
            <button
              key={f.key}
              type="button"
              role="tab"
              aria-selected={selectedFilter === f.key}
              className={`filter-pill ${selectedFilter === f.key ? "is-active" : ""}`}
              onClick={() => setSelectedFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <span className="filter-count-note">
          Showing {filteredInsights.length} of {insightsData.length} strategic recommendations
        </span>
      </div>

      {/* Insights Cards Grid */}
      <section className="insights-grid" data-tour="insights-grid" aria-label="Strategic Business Insights">
        {filteredInsights.map((insight, index) => (
          <article key={insight.id} className="insight-card" aria-labelledby={`insight-title-${insight.id}`}>
            <header className="insight-card-header">
              <div className="insight-meta">
                <span className="insight-number">0{index + 1}</span>
                <StatusBadge variant={insight.badgeVariant} label={insight.domain} />
              </div>
              <h2 id={`insight-title-${insight.id}`} className="insight-title">
                {insight.title}
              </h2>
            </header>

            <div className="insight-body">
              {/* Problem */}
              <div className="insight-block block-problem">
                <div className="block-label">
                  <span className="label-indicator problem-dot" />
                  <strong>Problem</strong>
                </div>
                <p className="block-text">{insight.problem}</p>
              </div>

              {/* Evidence */}
              <div className="insight-block block-evidence">
                <div className="block-label">
                  <span className="label-indicator evidence-dot" />
                  <strong>Verified Evidence</strong>
                </div>
                <p className="block-text">{insight.evidence}</p>
              </div>

              {/* Business Action */}
              <div className="insight-block block-action">
                <div className="block-label">
                  <span className="label-indicator action-dot" />
                  <strong>Business Action</strong>
                </div>
                <p className="block-text">{insight.action}</p>
              </div>
            </div>
          </article>
        ))}
      </section>

      {/* Quick Navigation Footer */}
      {onNavigate && (
        <section className="insights-nav-footer">
          <span className="footer-title">Explore Detailed Analytics Pages:</span>
          <div className="footer-nav-buttons">
            <button
              type="button"
              className="secondary-button"
              onClick={() => onNavigate("Fare & Revenue")}
            >
              Fare & Revenue Analytics →
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => onNavigate("Trip Efficiency")}
            >
              Trip Efficiency & ETA →
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => onNavigate("Zone & Hotspots")}
            >
              Spatial & Hotspots →
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => onNavigate("Demand Analytics")}
            >
              Demand Analytics →
            </button>
          </div>
        </section>
      )}
    </PageContainer>
  );
}
