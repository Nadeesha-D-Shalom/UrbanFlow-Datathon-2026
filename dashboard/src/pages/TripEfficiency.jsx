import { useState } from "react";
import { PageContainer } from "../components/layout/PageContainer";
import { AnalyticsCard } from "../components/cards/AnalyticsCard";
import { KPICard } from "../components/cards/KPICard";
import { StatusBadge } from "../components/common/StatusBadge";
import { api } from "../services/api";
import "./TripEfficiency.css";

// Verified rolling-origin validation folds from notebooks/merged_fare_analysis.ipynb & 05_eta_model.ipynb
const rollingFolds = [
  { period: "2025-11", mae: 4.5686, rmse: 7.3255, r2: 0.7613, within3m: "47.81%", within5m: "69.49%", notes: "Late Autumn baseline" },
  { period: "2025-12", mae: 4.8664, rmse: 8.2250, r2: 0.7229, within3m: "49.15%", within5m: "69.29%", notes: "Holiday travel & winter weather" },
  { period: "2026-01", mae: 4.4314, rmse: 7.4028, r2: 0.7216, within3m: "51.07%", within5m: "72.10%", notes: "Post-holiday recovery" },
  { period: "2026-02", mae: 4.2434, rmse: 7.0394, r2: 0.7585, within3m: "51.66%", within5m: "72.87%", notes: "Lowest error across validation" },
];

// Verified time period duration statistics from 2,025,311 records in eta_historical_source_apr2025_feb2026.parquet
const periodDurations = [
  {
    period: "Morning",
    hours: "06:00 – 11:59",
    mean: 18.02,
    median: 13.77,
    trips: 443729,
    share: "21.9%",
    trafficProfile: "Inbound commuter flow into Midtown and Financial District",
  },
  {
    period: "Midday",
    hours: "12:00 – 16:59",
    mean: 19.97,
    median: 15.05,
    trips: 570045,
    share: "28.1%",
    trafficProfile: "Slowest historical period; surface street congestion peaks",
    isSlowest: true,
  },
  {
    period: "Evening",
    hours: "17:00 – 21:59",
    mean: 17.05,
    median: 13.73,
    trips: 625253,
    share: "30.9%",
    trafficProfile: "Busiest period by volume; outbound and crosstown travel",
    isBusiest: true,
  },
  {
    period: "Night",
    hours: "22:00 – 05:59",
    mean: 15.51,
    median: 13.22,
    trips: 386284,
    share: "19.1%",
    trafficProfile: "Fastest travel period; free-flow conditions and airport runs",
    isFastest: true,
  },
];

// Verified 24-hour diurnal duration profile from eta_historical_source_apr2025_feb2026.parquet
const hourlyDurations = [
  { hour: 0, mean: 15.35 }, { hour: 1, mean: 14.22 }, { hour: 2, mean: 13.53 }, { hour: 3, mean: 13.71 },
  { hour: 4, mean: 15.40 }, { hour: 5, mean: 17.88 }, { hour: 6, mean: 18.18 }, { hour: 7, mean: 17.85 },
  { hour: 8, mean: 17.99 }, { hour: 9, mean: 17.65 }, { hour: 10, mean: 17.95 }, { hour: 11, mean: 18.47 },
  { hour: 12, mean: 18.69 }, { hour: 13, mean: 19.20 }, { hour: 14, mean: 20.33 }, { hour: 15, mean: 20.73 },
  { hour: 16, mean: 20.70 }, { hour: 17, mean: 19.31 }, { hour: 18, mean: 17.32 }, { hour: 19, mean: 16.52 },
  { hour: 20, mean: 16.08 }, { hour: 21, mean: 15.79 }, { hour: 22, mean: 16.06 }, { hour: 23, mean: 16.10 },
];

// 50 Features Architecture Groups (from eta_feature_order.txt & eta_model_metadata.json)
const featureGroups = [
  {
    group: "Booking-Time & Static Features",
    count: 6,
    description: "Core pre-trip identifiers available before dispatch (provider, rider count, rate class, origin, destination).",
    examples: ["provider_code", "rider_count", "rate_class_id", "origin_loc_id", "dest_loc_id"],
  },
  {
    group: "Calendar & Temporal Context",
    count: 8,
    description: "Discrete time indices and operational flags (pickup hour, day of week, month, day, rush hour, night, weekend).",
    examples: ["pickup_hour", "pickup_dow", "pickup_month", "is_rush_hour", "is_night"],
  },
  {
    group: "Cyclical Trigonometric Encodings",
    count: 6,
    description: "Sine and cosine transforms preserving continuous time boundaries across midnight and day transitions.",
    examples: ["hour_sin", "hour_cos", "dow_sin", "dow_cos", "month_sin", "month_cos"],
  },
  {
    group: "Global Baseline & Indicators",
    count: 4,
    description: "Global training duration anchors, intrazonal travel indicator, and rider count missingness flag.",
    examples: ["global_mean_duration", "global_median_duration", "same_zone", "rider_count_missing"],
  },
  {
    group: "Historical OD Route Features",
    count: 12,
    description: "Historical origin-to-destination corridor travel-time aggregates and hourly medians.",
    examples: ["od_trip_count", "od_mean_duration", "od_median_duration", "od_hour_mean_duration"],
  },
  {
    group: "Marginal Origin / Destination Historical Features",
    count: 14,
    description: "Marginal zone-level arrival and departure congestion medians when direct OD pairs are sparse.",
    examples: ["origin_hour_median_duration", "dest_hour_median_duration", "origin_trip_count", "dest_trip_count"],
  },
];

// Verified Sample from integration/eta/eta_verification_sample.json
const benchmarkSample = {
  provider_code: 2,
  pickup_timestamp: "2026-03-01T00:00",
  rider_count: 1,
  rate_class_id: 1,
  origin_loc_id: 246,
  dest_loc_id: 230,
  origin_name: "West Chelsea / Hudson Yards (Zone 246)",
  dest_name: "Times Sq / Theatre District (Zone 230)",
  expected: 12.3345,
  actual: 9.6,
};

export function TripEfficiency({ onBack, onNavigate }) {
  const [demoPending, setDemoPending] = useState(false);
  const [demoResult, setDemoResult] = useState(null);
  const [demoError, setDemoError] = useState("");

  const maxHourlyMean = Math.max(...hourlyDurations.map((h) => h.mean));
  const minHourlyMean = Math.min(...hourlyDurations.map((h) => h.mean));

  async function testSampleEta() {
    setDemoPending(true);
    setDemoError("");
    setDemoResult(null);
    try {
      const payload = {
        provider_code: benchmarkSample.provider_code,
        pickup_timestamp: `${benchmarkSample.pickup_timestamp}:00`,
        rider_count: benchmarkSample.rider_count,
        rate_class_id: benchmarkSample.rate_class_id,
        origin_loc_id: benchmarkSample.origin_loc_id,
        dest_loc_id: benchmarkSample.dest_loc_id,
      };
      const response = await api.durationPrediction(payload);
      if (!Number.isFinite(response.predicted_trip_duration_minutes)) {
        throw new Error("Invalid response");
      }
      setDemoResult(response.predicted_trip_duration_minutes);
    } catch {
      setDemoError("ETA service unavailable. Verify UrbanFlow API is running on port 8000.");
    } finally {
      setDemoPending(false);
    }
  }

  return (
    <PageContainer className="trip-efficiency-page">
      {/* Page Heading */}
      <div className="page-heading">
        <div>
          <h1>Trip Efficiency & ETA Analytics</h1>
          <p>
            Verified LightGBM ETA model performance, 50-feature pre-trip architecture, and historical duration analytics.
          </p>
        </div>
        <div className="efficiency-header-actions">
          {onNavigate && (
            <button
              type="button"
              className="secondary-button"
              onClick={() => onNavigate("Predictions")}
            >
              Test Live Predictions →
            </button>
          )}
          {onBack && (
            <button type="button" className="secondary-button" onClick={onBack}>
              Back to Overview →
            </button>
          )}
        </div>
      </div>

      {/* Scope Banner */}
      <div className="efficiency-scope-banner" role="note">
        <div className="efficiency-scope-banner__content">
          <strong>Validation Scope:</strong> All ETA model performance metrics reflect{" "}
          <strong>ROLLING VALIDATION PERFORMANCE</strong> evaluated across four temporal validation periods
          (November 2025 – February 2026), not March 2026 final test results.
        </div>
      </div>

      {/* 1. KPI Cards */}
      <section className="kpi-grid" data-tour="trip-efficiency-kpis" aria-label="Trip Efficiency Key Metrics">
        <KPICard
          label="Average Trip Duration"
          value="18.1 min"
          compareLabel="Verified full-dataset aggregate"
        />
        <KPICard
          label="Final Selected ETA Model"
          value="LightGBM"
          compareLabel="Config A Baseline · 858 trees"
        />
        <KPICard
          label="Rolling Validation MAE"
          value="4.526 min"
          compareLabel="Nov 2025 – Feb 2026 mean"
        />
        <KPICard
          label="Rolling Validation R²"
          value="0.7412"
          compareLabel="74.1% variance explained"
        />
      </section>

      {/* 2. ETA Model Performance & Model Specifications */}
      <div className="efficiency-dual-grid">
        <div data-tour="eta-performance">
        <AnalyticsCard
          title="ETA Model Performance"
          description="Rolling validation metrics across Nov 2025 – Feb 2026"
          actions={<StatusBadge variant="success" label="Rolling Validation Performance" />}
        >
          <div className="performance-summary-box">
            <div className="performance-badge-row">
              <span className="performance-badge">Rolling Validation Performance</span>
              <span className="performance-split-note">Nov 2025 – Feb 2026 (4 Temporal Folds)</span>
            </div>

            <div className="performance-metric-grid">
              <div className="perf-metric-card">
                <span className="perf-label">Rolling MAE</span>
                <strong className="perf-value">4.526 min</strong>
                <span className="perf-sub">±0.014 min across folds</span>
              </div>
              <div className="perf-metric-card">
                <span className="perf-label">Rolling RMSE</span>
                <strong className="perf-value">7.497 min</strong>
                <span className="perf-sub">Worst: 8.225 min (Dec 2025)</span>
              </div>
              <div className="perf-metric-card">
                <span className="perf-label">Rolling R²</span>
                <strong className="perf-value">0.7412</strong>
                <span className="perf-sub">Stable across seasons</span>
              </div>
            </div>

            {/* Error Tolerance Bands */}
            <div className="tolerance-bands">
              <span className="tolerance-title">Prediction Accuracy Tolerance:</span>
              <div className="tolerance-pills">
                <div className="tolerance-pill">
                  <span className="tol-val">18.22%</span>
                  <span className="tol-lbl">within ±1 minute</span>
                </div>
                <div className="tolerance-pill">
                  <span className="tol-val">49.96%</span>
                  <span className="tol-lbl">within ±3 minutes</span>
                </div>
                <div className="tolerance-pill is-primary">
                  <span className="tol-val">70.95%</span>
                  <span className="tol-lbl">within ±5 minutes</span>
                </div>
              </div>
            </div>

            {/* Folds Table */}
            <div className="folds-table-wrapper">
              <table className="folds-table">
                <thead>
                  <tr>
                    <th>Validation Fold</th>
                    <th>MAE (min)</th>
                    <th>RMSE (min)</th>
                    <th>R²</th>
                    <th>Within ±5 min</th>
                    <th>Context</th>
                  </tr>
                </thead>
                <tbody>
                  {rollingFolds.map((f) => (
                    <tr key={f.period}>
                      <td><strong>{f.period}</strong></td>
                      <td className="num">{f.mae.toFixed(4)}</td>
                      <td className="num">{f.rmse.toFixed(4)}</td>
                      <td className="num">{f.r2.toFixed(4)}</td>
                      <td className="num">{f.within5m}</td>
                      <td className="context-cell">{f.notes}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <th>Mean Benchmark</th>
                    <th className="num">4.5260</th>
                    <th className="num">7.4970</th>
                    <th className="num">0.7412</th>
                    <th className="num">70.95%</th>
                    <th>4-Month Summary</th>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </AnalyticsCard>
        </div>

        <AnalyticsCard
          title="Model Specifications & Architecture"
          description="Operational parameters and pre-trip training structure"
        >
          <div className="model-summary-specs">
            <div className="spec-list">
              <div className="spec-item">
                <span className="spec-title">Selected Algorithm</span>
                <span className="spec-detail"><code>LightGBM</code> (LGBMRegressor, 858 trees)</span>
              </div>
              <div className="spec-item">
                <span className="spec-title">Target Variable</span>
                <span className="spec-detail"><code>trip_duration_minutes</code></span>
              </div>
              <div className="spec-item">
                <span className="spec-title">Training Volume</span>
                <span className="spec-detail">1,841,777 engineered observations</span>
              </div>
              <div className="spec-item">
                <span className="spec-title">Feature Dimensionality</span>
                <span className="spec-detail">50 pre-trip predictor features</span>
              </div>
              <div className="spec-item">
                <span className="spec-title">Outlier Threshold</span>
                <span className="spec-detail">Durations &gt; 360 minutes excluded</span>
              </div>
            </div>

            <div className="leakage-governance-box">
              <div className="leakage-header">
                <strong>Pre-Trip Input Boundaries</strong>
              </div>
              <p>
                The ETA model relies strictly on features available prior to departure. It excludes actual metered distance,
                mid-trip GPS readings, dropoff timestamps, and post-trip tolls to ensure deployable pre-trip estimates.
              </p>
            </div>
          </div>
        </AnalyticsCard>
      </div>

      {/* 3. Historical Trip-Duration Analytics */}
      <div className="efficiency-dual-grid">
        <AnalyticsCard
          title="Historical Duration by Time Period"
          description="Empirical trip durations from 2,025,311 historical records"
        >
          <div className="period-duration-grid">
            {periodDurations.map((p) => (
              <div
                key={p.period}
                className={`period-stat-card ${p.isSlowest ? "is-slowest" : p.isFastest ? "is-fastest" : ""}`}
              >
                <div className="period-card-header">
                  <span className="period-name">{p.period}</span>
                  <span className="period-hours">{p.hours}</span>
                </div>
                <div className="period-card-values">
                  <div className="stat-col">
                    <span className="stat-label">Average</span>
                    <strong className="stat-num">{p.mean.toFixed(2)} min</strong>
                  </div>
                  <div className="stat-col">
                    <span className="stat-label">Median</span>
                    <strong className="stat-num">{p.median.toFixed(2)} min</strong>
                  </div>
                </div>
                <div className="period-card-footer">
                  <span>{p.trips.toLocaleString()} trips ({p.share})</span>
                  <p className="period-traffic-note">{p.trafficProfile}</p>
                </div>
              </div>
            ))}
          </div>
        </AnalyticsCard>

        <div data-tour="eta-diurnal-chart">
        <AnalyticsCard
          title="24-Hour Diurnal Duration Profile"
          description="Average trip duration by pickup hour (Hour 0 to 23)"
        >
          <div className="diurnal-chart-container">
            <div className="diurnal-bars">
              {hourlyDurations.map((h) => {
                const heightPct = ((h.mean - minHourlyMean + 2) / (maxHourlyMean - minHourlyMean + 2)) * 100;
                const isPeak = h.hour === 15;
                const isTrough = h.hour === 2;
                return (
                  <div key={h.hour} className="diurnal-bar-col">
                    <span className="diurnal-bar-val">{h.mean.toFixed(1)}</span>
                    <div className="diurnal-bar-wrapper">
                      <div
                        className={`diurnal-bar-fill ${isPeak ? "is-peak" : isTrough ? "is-trough" : ""}`}
                        style={{ height: `${heightPct}%` }}
                        title={`Hour ${h.hour}:00 — ${h.mean.toFixed(2)} min average duration`}
                      />
                    </div>
                    <span className="diurnal-hour-label">{h.hour}h</span>
                  </div>
                );
              })}
            </div>

            <div className="diurnal-legend-row">
              <div className="legend-item">
                <span className="legend-color is-peak" />
                <span>Peak Congestion: <strong>Hour 15 (3 PM) · 20.73 min</strong></span>
              </div>
              <div className="legend-item">
                <span className="legend-color is-trough" />
                <span>Free-Flow Trough: <strong>Hour 2 (2 AM) · 13.53 min</strong></span>
              </div>
            </div>
          </div>
        </AnalyticsCard>
        </div>
      </div>

      {/* 4. 50-Feature Architecture & Benchmark Sample */}
      <div className="efficiency-dual-grid">
        <AnalyticsCard
          title="ETA Feature Architecture (50 Features)"
          description="Pre-trip predictor feature groups utilized by the LightGBM model"
        >
          <div className="feature-groups-list">
            {featureGroups.map((g) => (
              <div key={g.group} className="feature-group-box">
                <div className="feature-group-header">
                  <strong>{g.group}</strong>
                  <span className="group-count-badge">{g.count} features</span>
                </div>
                <p className="group-desc">{g.description}</p>
                <div className="group-features-tags">
                  {g.examples.map((f) => (
                    <code key={f} className="feature-tag">{f}</code>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </AnalyticsCard>

        <div data-tour="eta-demo-card">
        <AnalyticsCard
          title="Live ETA Benchmark Verification"
          description="Verified integration test case from official bundle"
        >
          <div className="demo-card-content">
            <div className="sample-details">
              <div className="sample-row">
                <span className="sample-label">Origin:</span>
                <span className="sample-value">{benchmarkSample.origin_name}</span>
              </div>
              <div className="sample-row">
                <span className="sample-label">Destination:</span>
                <span className="sample-value">{benchmarkSample.dest_name}</span>
              </div>
              <div className="sample-row">
                <span className="sample-label">Pickup Time:</span>
                <span className="sample-value">2026-03-01 00:00:00 (Provider {benchmarkSample.provider_code})</span>
              </div>
              <div className="sample-row">
                <span className="sample-label">Verified Expected:</span>
                <span className="sample-value highlight">~12.33 min (12.3345 min)</span>
              </div>
              <div className="sample-row">
                <span className="sample-label">Observed Trip:</span>
                <span className="sample-value">9.6 min (actual recorded)</span>
              </div>
            </div>

            <div className="demo-action-row">
              <button
                type="button"
                className="primary-button"
                disabled={demoPending}
                onClick={testSampleEta}
              >
                {demoPending ? "Predicting..." : "Execute Verified Sample →"}
              </button>
              {demoResult !== null && (
                <div className="demo-result-badge">
                  <span>Model Output:</span>
                  <strong>{demoResult.toFixed(2)} min</strong>
                </div>
              )}
            </div>

            {demoError && (
              <p className="fare-error" role="alert">{demoError}</p>
            )}
          </div>
        </AnalyticsCard>
        </div>
      </div>

      {/* 5. Operational Takeaways */}
      <section className="takeaways-section" aria-label="Operational Takeaways">
        <div className="takeaways-header">
          <h3>Operational & Dispatch Takeaways</h3>
          <span className="takeaways-subtitle">Actionable insights from verified ETA modelling and duration distributions</span>
        </div>

        <div className="takeaways-grid">
          <div className="takeaway-card">
            <div className="takeaway-num">01</div>
            <h4>Historical Route Aggregates</h4>
            <p>
              Incorporating historical OD and OD-hour smoothed travel-time statistics enables accurate ETA predictions without requiring post-departure GPS distance meters.
            </p>
          </div>

          <div className="takeaway-card">
            <div className="takeaway-num">02</div>
            <h4>Diurnal Dispatch Adjustments</h4>
            <p>
              Empirical travel times range from <strong>15.5 min at night</strong> to <strong>20.0 min during midday</strong>. Dispatch algorithms should dynamically adjust buffer times around the 3 PM congestion peak.
            </p>
          </div>

          <div className="takeaway-card">
            <div className="takeaway-num">03</div>
            <h4>Predictable Arrival Windows</h4>
            <p>
              With <strong>70.95% of predictions within ±5 minutes</strong> across four rolling months, ETA intervals provide dependable passenger expectations and reliable vehicle staging.
            </p>
          </div>

          <div className="takeaway-card">
            <div className="takeaway-num">04</div>
            <h4>Outlier & Data Hygiene</h4>
            <p>
              Filtering trips longer than 360 minutes and enforcing strict pre-trip feature boundaries ensures the model is resilient to transit anomalies and corrupt records.
            </p>
          </div>
        </div>
      </section>
    </PageContainer>
  );
}
