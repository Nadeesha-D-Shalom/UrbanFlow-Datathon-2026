import { StatusBadge } from "../common/StatusBadge";
export function ModelPerformanceCard({
  name,
  mae,
  rmse,
  r2,
  unit = "",
  status = "Trained",
  best = false,
  context,
  children,
}) {
  const format = (value) =>
    typeof value === "number"
      ? value.toLocaleString(undefined, { maximumFractionDigits: 3 })
      : "Pending";
  return (
    <article className="model-card">
      <header>
        <h3>{name}</h3>
        <StatusBadge
          variant={
            best
              ? "success"
              : status === "Failed"
                ? "critical"
                : status === "Training"
                  ? "warning"
                  : "neutral"
          }
          label={best ? "Best model" : status}
        />
      </header>
      {best && <p>Training status: {status}</p>}
      <dl className="model-metrics">
        <div>
          <dt title="Mean absolute error; lower is better">
            MAE {unit && `(${unit})`}
          </dt>
          <dd>{format(mae)}</dd>
        </div>
        <div>
          <dt title="Root mean squared error; lower is better">
            RMSE {unit && `(${unit})`}
          </dt>
          <dd>{format(rmse)}</dd>
        </div>
        <div>
          <dt title="Coefficient of determination; closer to 1 is better">
            R-squared
          </dt>
          <dd>{format(r2)}</dd>
        </div>
      </dl>
      <p>
        {context || "Compare models using the same held-out evaluation period."}
      </p>
      {children}
    </article>
  );
}
