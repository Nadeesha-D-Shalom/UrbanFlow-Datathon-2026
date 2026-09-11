import { AnalyticsCard } from "../cards/AnalyticsCard";
import { ChartContainer } from "../charts/ChartContainer";
export function ModelComparisonChart({
  models,
  metric = "mae",
  label = "MAE",
}) {
  const data = models.map((model) => ({
    label: model.name,
    value: model[metric],
  }));
  return (
    <AnalyticsCard
      title="Model comparison"
      description={`${label} across the same evaluation set`}
    >
      <ChartContainer
        data={data}
        max={Math.max(1, ...data.map((d) => d.value)) * 1.1}
        label={label}
        unit=""
        type="bar"
      />
    </AnalyticsCard>
  );
}
export function FeatureImportance({ features }) {
  const max = Math.max(1, ...features.map((f) => f.value));
  return (
    <AnalyticsCard
      title="Feature importance"
      description="Relative influence on model predictions"
    >
      <div className="feature-bars">
        {[...features]
          .sort((a, b) => b.value - a.value)
          .map((f) => (
            <div key={f.name}>
              <span>{f.name}</span>
              <meter
                min="0"
                max={max}
                value={f.value}
                aria-label={`${f.name} importance`}
              />
              <strong>{f.value.toFixed(3)}</strong>
            </div>
          ))}
      </div>
    </AnalyticsCard>
  );
}
export function ActualVsPredicted({ points, unit = "" }) {
  const max =
    Math.max(1, ...points.flatMap((p) => [p.actual, p.predicted])) * 1.1;
  return (
    <AnalyticsCard
      title="Actual vs Predicted"
      description={`Closer to the dashed line means a smaller error. ${unit}`}
    >
      <svg
        className="scatter-chart"
        viewBox="0 0 400 270"
        role="img"
        aria-label="Actual versus predicted values. Each point has a focusable value label."
      >
        <path d="M45 20V225H375" fill="none" stroke="#cbd5e1" />
        <path d="M45 225L375 20" stroke="#94a3b8" strokeDasharray="5 5" />
        {[0, 0.25, 0.5, 0.75, 1].map((v) => (
          <g key={v}>
            <text x={45 + v * 330} y="244" textAnchor="middle">
              {(v * max).toFixed(1)}
            </text>
            <text x="36" y={229 - v * 205} textAnchor="end">
              {(v * max).toFixed(1)}
            </text>
          </g>
        ))}
        {points.map((p, i) => (
          <circle
            key={p.id ?? i}
            cx={45 + (p.actual / max) * 330}
            cy={225 - (p.predicted / max) * 205}
            r="4"
            fill="#2563eb"
            opacity=".65"
            tabIndex="0"
            aria-label={`Actual ${p.actual}, predicted ${p.predicted} ${unit}`}
          >
            <title>{`Actual: ${p.actual}; Predicted: ${p.predicted} ${unit}`}</title>
          </circle>
        ))}
        <text x="210" y="264" textAnchor="middle">
          Actual
        </text>
        <text transform="translate(12 125) rotate(-90)" textAnchor="middle">
          Predicted
        </text>
      </svg>
    </AnalyticsCard>
  );
}
