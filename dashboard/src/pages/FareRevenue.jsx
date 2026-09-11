import { useMemo, useState } from "react";
import { PageContainer } from "../components/layout/PageContainer";
import { AnalyticsCard } from "../components/cards/AnalyticsCard";
import { KPICard } from "../components/cards/KPICard";
import { StatusBadge } from "../components/common/StatusBadge";
import dailyMetrics from "../data/generated/overview_daily.json";
import "./FareRevenue.css";

// Verified Feature Importances from 03_fare_model_comparison_nadeesha.ipynb (cell 72)
const featureImportances = [
  { feature: "rate_class_id", label: "Rate Class ID", value: 0.473332, formatted: "0.473", pct: "47.3%" },
  { feature: "origin_loc_id", label: "Origin Zone ID", value: 0.256157, formatted: "0.256", pct: "25.6%" },
  { feature: "dest_loc_id", label: "Destination Zone ID", value: 0.230458, formatted: "0.230", pct: "23.0%" },
  { feature: "pickup_hour", label: "Pickup Hour", value: 0.016869, formatted: "0.016869", pct: "1.7%" },
  { feature: "pickup_month", label: "Pickup Month", value: 0.010362, formatted: "0.010", pct: "1.0%" },
  { feature: "pickup_day_of_week", label: "Pickup Day of Week", value: 0.006661, formatted: "0.007", pct: "0.7%" },
  { feature: "provider_code", label: "Provider Code", value: 0.003137, formatted: "0.003", pct: "0.3%" },
  { feature: "rider_count", label: "Rider Count", value: 0.001880, formatted: "0.002", pct: "0.2%" },
  { feature: "is_weekend", label: "Weekend Flag", value: 0.001143, formatted: "0.001", pct: "0.1%" },
];

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const monthFormat = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric", timeZone: "UTC" });

export function FareRevenue({ onBack, onNavigate }) {
  const [revenueView, setRevenueView] = useState("monthly");

  // Verified dataset totals computed strictly from overview_daily.json
  const { totalRevenue, totalTrips, averageFare, monthlyData, dowData } = useMemo(() => {
    let revSum = 0;
    let tripSum = 0;
    const monthlyMap = new Map();
    const dowMap = new Map();

    for (let i = 0; i < 7; i++) {
      dowMap.set(i, { dayIndex: i, name: dayNames[i], totalRev: 0, totalTrips: 0, daysCount: 0 });
    }

    dailyMetrics.forEach((day) => {
      revSum += day.base_fare_revenue;
      tripSum += day.trip_count;

      const mKey = day.date.slice(0, 7);
      if (!monthlyMap.has(mKey)) {
        monthlyMap.set(mKey, {
          monthKey: mKey,
          label: monthFormat.format(new Date(day.date + "T00:00:00Z")),
          revenue: 0,
          trips: 0,
          days: 0,
        });
      }
      const mEntry = monthlyMap.get(mKey);
      mEntry.revenue += day.base_fare_revenue;
      mEntry.trips += day.trip_count;
      mEntry.days += 1;

      const dow = new Date(day.date + "T00:00:00Z").getUTCDay();
      const dEntry = dowMap.get(dow);
      dEntry.totalRev += day.base_fare_revenue;
      dEntry.totalTrips += day.trip_count;
      dEntry.daysCount += 1;
    });

    const monthly = Array.from(monthlyMap.values()).map((m) => ({
      ...m,
      avgFare: m.revenue / m.trips,
      revMillions: m.revenue / 1_000_000,
      tripsMillions: m.trips / 1_000_000,
    }));

    const dow = Array.from(dowMap.values()).map((d) => ({
      ...d,
      avgFare: d.totalRev / d.totalTrips,
      avgDailyRev: d.totalRev / d.daysCount,
      revMillions: d.totalRev / 1_000_000,
    }));

    return {
      totalRevenue: revSum,
      totalTrips: tripSum,
      averageFare: revSum / tripSum,
      monthlyData: monthly,
      dowData: dow,
    };
  }, []);

  const maxMonthRev = useMemo(
    () => Math.max(...monthlyData.map((m) => m.revMillions)),
    [monthlyData]
  );

  const maxDowDailyRev = useMemo(
    () => Math.max(...dowData.map((d) => d.avgDailyRev / 1_000_000)),
    [dowData]
  );

  return (
    <PageContainer className="fare-revenue-page">
      {/* Header */}
      <div className="page-heading">
        <div>
          <h1>Fare & Revenue Analytics</h1>
          <p>
            Verified fare model performance, pre-trip feature importance, and historical base-fare revenue.
          </p>
        </div>
        <div className="fare-revenue-header-actions">
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

      {/* Dataset Scope Notice */}
      <div className="fare-scope-banner" role="note">
        <div className="fare-scope-banner__content">
          <strong>Dataset Scope:</strong> All revenue and fare metrics reflect{" "}
          <strong>BASE FARE ONLY</strong> across 44,286,676 trips (Apr 2025 – Mar 2026).
          Tips, tolls, and surcharges are excluded from base calculations.
        </div>
      </div>

      {/* 1. KPI Cards */}
      <section className="kpi-grid" data-tour="fare-kpis" aria-label="Fare and Revenue Key Metrics">
        <KPICard
          label="Total Base-Fare Revenue"
          value={`$${(totalRevenue / 1_000_000).toFixed(1)}M`}
          compareLabel="Excludes tips, tolls & charges"
        />
        <KPICard
          label="Average Base Fare"
          value={`$${averageFare.toFixed(2)}`}
          compareLabel="Per completed trip (base fare)"
        />
        <KPICard
          label="Final Decision Tree Test MAE"
          value="4.3861"
          compareLabel="Final unseen test set (March 2026)"
        />
        <KPICard
          label="Final Decision Tree Test R²"
          value="0.7579"
          compareLabel="75.8% variance explained"
        />
      </section>

      {/* 2. Final Decision Tree Performance & Model Architecture */}
      <div className="fare-dual-grid">
        <AnalyticsCard
          title="Decision Tree Model Performance"
          description="Final evaluated metrics on untouched holdout test data"
          actions={<StatusBadge variant="success" label="Final Unseen Test Set" />}
        >
          <div className="test-metrics-card">
            <div className="test-badge-container">
              <span className="test-badge">FINAL UNSEEN TEST SET (March 2026 Split)</span>
            </div>

            <div className="test-metric-row">
              <div className="test-metric-box">
                <span className="metric-label" title="Mean Absolute Error">Test MAE</span>
                <strong className="metric-value">4.3861</strong>
                <span className="metric-sub">vs 4.5585 validation MAE</span>
              </div>
              <div className="test-metric-box">
                <span className="metric-label" title="Root Mean Squared Error">Test RMSE</span>
                <strong className="metric-value">8.7595</strong>
                <span className="metric-sub">vs 9.0183 validation RMSE</span>
              </div>
              <div className="test-metric-box">
                <span className="metric-label" title="Coefficient of Determination">Test R²</span>
                <strong className="metric-value">0.7579</strong>
                <span className="metric-sub">vs 0.7359 validation R²</span>
              </div>
            </div>

            <div className="test-context-box">
              <p>
                <strong>Evaluation Protocol:</strong> Evaluated on the untouched March 2026 test partition.
                The model achieved 4.3861 MAE and 0.7579 R², confirming robust generalization on unseen out-of-sample data.
              </p>
            </div>
          </div>
        </AnalyticsCard>

        <AnalyticsCard
          title="Model Architecture & Governance"
          description="Operational specification and pre-trip feature boundaries"
        >
          <div className="governance-card">
            <div className="spec-list">
              <div className="spec-item">
                <span className="spec-title">Selected Algorithm</span>
                <span className="spec-detail"><code>DecisionTreeRegressor</code></span>
              </div>
              <div className="spec-item">
                <span className="spec-title">Target Variable</span>
                <span className="spec-detail"><code>base_fare</code> (Continuous USD)</span>
              </div>
              <div className="spec-item">
                <span className="spec-title">Input Features (Pre-Trip)</span>
                <span className="spec-detail">
                  9 booking-time features (rate class, OD zone pair, temporal flags)
                </span>
              </div>
              <div className="spec-item">
                <span className="spec-title">Test Holdout Dataset</span>
                <span className="spec-detail">Untouched March 2026 partition</span>
              </div>
            </div>

            <div className="leakage-governance-box">
              <div className="leakage-header">
                <strong>Pre-Trip Input Boundaries</strong>
              </div>
              <p>
                The fare model strictly consumes booking-time inputs available prior to vehicle dispatch.
                Excludes post-trip metered distance, dropoff timestamp, driver tips, tolls, and congestion surcharges.
              </p>
            </div>
          </div>
        </AnalyticsCard>
      </div>

      {/* 3. Feature Importance */}
      <div data-tour="fare-feature-importance">
        <AnalyticsCard
          title="Fare Model Feature Importance"
          description="Impurity-based feature importances (DecisionTreeRegressor)"
        >
          <div className="feature-importance-container">
            <div className="feature-bars-chart" aria-label="Feature importance horizontal bar chart">
              {featureImportances.map((f) => {
                const maxVal = featureImportances[0].value;
                const widthPct = (f.value / maxVal) * 100;
                return (
                  <div key={f.feature} className="feature-bar-row">
                    <div className="feature-meta">
                      <span className="feature-name"><code>{f.feature}</code></span>
                      <span className="feature-label-text">{f.label}</span>
                    </div>
                    <div className="feature-track">
                      <div
                        className="feature-fill"
                        style={{ width: `${Math.max(widthPct, 2)}%` }}
                        aria-valuenow={f.value}
                        aria-valuemin="0"
                        aria-valuemax="1"
                      />
                    </div>
                    <div className="feature-values">
                      <strong className="feature-val">{f.formatted}</strong>
                      <span className="feature-pct">({f.pct})</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="feature-clarification-note">
              <span className="note-icon">ℹ</span>
              <p>
                <strong>Methodological Note:</strong> Impurity-based feature importances reflect tree-based variance reduction;
                they should not be interpreted as causal effects. Rate class (47.3%) and origin–destination zone pairs (48.7% combined)
                account for <strong>96.0%</strong> of predictive influence.
              </p>
            </div>
          </div>
        </AnalyticsCard>
      </div>

      {/* 4. Revenue Analytics Section */}
      <div data-tour="fare-revenue-chart">
      <AnalyticsCard
        title="Historical Base-Fare Revenue Analytics"
        description="Aggregated 365-day performance from verified UrbanFlow trip records"
        actions={
          <div className="segmented" aria-label="Revenue view selector">
            <button
              type="button"
              aria-pressed={revenueView === "monthly"}
              onClick={() => setRevenueView("monthly")}
            >
              Monthly Totals
            </button>
            <button
              type="button"
              aria-pressed={revenueView === "dow"}
              onClick={() => setRevenueView("dow")}
            >
              Day of Week Profile
            </button>
          </div>
        }
      >
        {revenueView === "monthly" ? (
          <div className="revenue-monthly-container">
            <div className="revenue-chart-bars">
              {monthlyData.map((m) => {
                const heightPct = (m.revMillions / maxMonthRev) * 100;
                return (
                  <div key={m.monthKey} className="rev-bar-column">
                    <span className="rev-bar-val">${m.revMillions.toFixed(1)}M</span>
                    <div className="rev-bar-wrapper">
                      <div
                        className="rev-bar-fill"
                        style={{ height: `${heightPct}%` }}
                        title={`${m.label}: $${m.revMillions.toFixed(1)}M across ${m.trips.toLocaleString()} trips ($${m.avgFare.toFixed(2)} avg)`}
                      />
                    </div>
                    <span className="rev-bar-month">{m.label.split(" ")[0]}</span>
                    <span className="rev-bar-year">{m.label.split(" ")[1]}</span>
                  </div>
                );
              })}
            </div>

            <div className="revenue-table-wrapper">
              <table className="revenue-summary-table">
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>Days</th>
                    <th>Total Trips</th>
                    <th>Base-Fare Revenue</th>
                    <th>Avg Base Fare</th>
                    <th>Daily Run Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyData.map((m) => (
                    <tr key={m.monthKey}>
                      <td><strong>{m.label}</strong></td>
                      <td>{m.days}</td>
                      <td>{m.trips.toLocaleString()}</td>
                      <td className="num"><strong>${m.revMillions.toFixed(2)}M</strong></td>
                      <td className="num">${m.avgFare.toFixed(2)}</td>
                      <td className="num">${(m.revMillions / m.days).toFixed(2)}M / day</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <th>Full Year Aggregate</th>
                    <th>365</th>
                    <th>{totalTrips.toLocaleString()}</th>
                    <th className="num">${(totalRevenue / 1_000_000).toFixed(2)}M</th>
                    <th className="num">${averageFare.toFixed(2)}</th>
                    <th className="num">${(totalRevenue / 365 / 1_000_000).toFixed(2)}M / day</th>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        ) : (
          <div className="revenue-dow-container">
            <div className="revenue-dow-chart">
              {dowData.map((d) => {
                const dailyRevM = d.avgDailyRev / 1_000_000;
                const heightPct = (dailyRevM / maxDowDailyRev) * 100;
                return (
                  <div key={d.dayIndex} className="rev-dow-column">
                    <span className="rev-dow-val">${dailyRevM.toFixed(2)}M</span>
                    <div className="rev-dow-wrapper">
                      <div
                        className="rev-dow-fill"
                        style={{ height: `${heightPct}%` }}
                        title={`${d.name}: $${dailyRevM.toFixed(2)}M daily average ($${d.avgFare.toFixed(2)} avg fare)`}
                      />
                    </div>
                    <span className="rev-dow-name">{d.name.slice(0, 3)}</span>
                    <span className="rev-dow-fare">${d.avgFare.toFixed(2)} fare</span>
                  </div>
                );
              })}
            </div>

            <div className="dow-insights-box">
              <h4>Day-of-Week Revenue Characteristics:</h4>
              <ul>
                <li>
                  <strong>Peak Base Revenue Day:</strong> Thursday leads average daily revenue at{" "}
                  <strong>$2.74M/day</strong> ($142.6M total across 52 Thursdays), reflecting high midweek business travel.
                </li>
                <li>
                  <strong>Highest Average Fare:</strong> Sunday exhibits the highest average base fare at{" "}
                  <strong>$21.45</strong>, driven by longer airport runs and cross-borough weekend trips.
                </li>
                <li>
                  <strong>Lowest Run Rate:</strong> Monday records the lowest base revenue run rate at{" "}
                  <strong>$2.17M/day</strong> ($113.1M total).
                </li>
              </ul>
            </div>
          </div>
        )}
      </AnalyticsCard>
      </div>

      {/* 5. Compact Business Takeaways */}
      <section className="takeaways-section" aria-label="Business and Operational Takeaways">
        <div className="takeaways-header">
          <h3>Operational & Strategic Takeaways</h3>
          <span className="takeaways-subtitle">Grounded strictly in verified UrbanFlow dataset results</span>
        </div>

        <div className="takeaways-grid">
          <div className="takeaway-card">
            <div className="takeaway-num">01</div>
            <h4>Pre-Trip Pricing Feasibility</h4>
            <p>
              Over 96% of fare variance is dictated by Rate Class (47.3%) and pickup–dropoff spatial pairs (48.7%).
              UrbanFlow can reliably quote upfront base fares before dispatch without requiring post-trip meters.
            </p>
          </div>

          <div className="takeaway-card">
            <div className="takeaway-num">02</div>
            <h4>Unseen Test Set Generalization</h4>
            <p>
              The Decision Tree champion model generalized to the untouched March 2026 test set with a test MAE of{" "}
              <strong>4.3861</strong> and test R² of <strong>0.7579</strong>, confirming strong out-of-sample accuracy across seasonal shifts.
            </p>
          </div>

          <div className="takeaway-card">
            <div className="takeaway-num">03</div>
            <h4>Predictable Base-Fare Economics</h4>
            <p>
              Across 44.3M trips, base revenue reached <strong>$918.3M</strong> with an average base fare of{" "}
              <strong>$20.73</strong>. Steady monthly run rates ($64.4M in August to $91.2M in December) provide a dependable foundation for fleet planning.
            </p>
          </div>

          <div className="takeaway-card">
            <div className="takeaway-num">04</div>
            <h4>Rate-Code Sensitivity</h4>
            <p>
              Because rate class is the single largest feature driver (47.3%), tariff adjustments or airport flat-rate changes have an immediate, outsized effect on total revenue realization.
            </p>
          </div>
        </div>
      </section>
    </PageContainer>
  );
}
