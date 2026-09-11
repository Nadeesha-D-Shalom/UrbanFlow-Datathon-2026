function Sparkline({ data = [] }) {

  if (!data.length) return null;



  const width = 120;

  const height = 34;

  const max = Math.max(...data);

  const min = Math.min(...data);

  const range = max - min || 1;

  const points = data

    .map((value, index) => {

      const x = (index / Math.max(data.length - 1, 1)) * width;

      const y = height - ((value - min) / range) * height;

      return `${x},${y}`;

    })

    .join(" ");



  return (

    <svg

      className="kpi-card__sparkline"

      viewBox={`0 0 ${width} ${height}`}

      aria-hidden="true"

    >

      <polyline points={points} />

    </svg>

  );

}



export function KPICard({

  label,

  value,

  change,

  compareLabel,

  icon,

  sparkline,

  lowerIsBetter = false,

}) {

  const positive =

    typeof change === "number"

      ? change >= 0

      : String(change).trim().startsWith("+");

  const changeText =

    typeof change === "number"

      ? `${change > 0 ? "+" : ""}${change.toFixed(1)}%`

      : change;



  return (

    <article className={`kpi-card ${!icon && !sparkline ? "kpi-card--plain" : ""}`}>

      {(icon || sparkline) && <div className="kpi-card__header">

        <div className="kpi-card__icon">{icon}</div>

        {sparkline ? <Sparkline data={sparkline} /> : null}

      </div>}

      <p className="kpi-card__label">{label}</p>

      <div className="kpi-card__value-row">

        <strong className="kpi-card__value">{value}</strong>

      </div>

      {change != null && <div className="kpi-card__meta">

        <span

          className={`kpi-card__change ${(lowerIsBetter ? !positive : positive) ? "is-positive" : "is-negative"}`}

        >

          <span aria-hidden="true">{positive ? "↗" : "↘"}</span> {changeText}

        </span>

        <span className="kpi-card__compare">{compareLabel}</span>

      </div>}

    </article>

  );

}
