import { useId, useState } from "react";
import { EmptyState } from "../common/EmptyState";
import { ErrorState } from "../common/ErrorState";
export function ChartContainer({
  data = [],
  comparison = [],
  type = "line",
  label = "Trips",
  unit = "M",
  max = 2,
  forecastStart,
  uncertainty = [],
  summary,
}) {
  const [hover, setHover] = useState(null),
    id = useId().replaceAll(":", "");
  if (!data.length) return <EmptyState />;
  if (!Number.isFinite(max) || max <= 0 || data.some((point) => !Number.isFinite(point.value) || point.value < 0 || point.value > max)) {
    return <ErrorState description="Chart values are outside the supported range." />;
  }
  const width = 600,
    height = 220,
    left = 42,
    right = 584,
    top = 18,
    bottom = 180;
  const x = (i) => left + (i * (right - left)) / Math.max(data.length - 1, 1),
    y = (value) => bottom - (value / max) * (bottom - top);
  const path = (values) =>
    values.map((d, i) => `${i ? "L" : "M"}${x(i)},${y(d.value)}`).join(" ");
  const selected = hover === null ? null : data[hover];
  return (
    <div className="chart-container">
      <div className="chart-legend">
        <span>
          <i /> {label}
        </span>
        {comparison.length > 0 && (
          <span>
            <i className="comparison" /> Previous period
          </span>
        )}
        <span className="chart-unit">
          {unit === "M"
            ? label.includes("$")
              ? "USD, millions"
              : "Million trips"
            : unit}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        aria-label={
          summary ||
          `${label}, illustrative sample. Focus each point for values.`
        }
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2563eb" stopOpacity=".16" />
            <stop offset="100%" stopColor="#2563eb" stopOpacity=".01" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3, 4].map((i) => (
          <g key={i}>
            <line
              x1={left}
              x2={right}
              y1={y((max * i) / 4)}
              y2={y((max * i) / 4)}
              stroke="#e8edf4"
              strokeDasharray="3 4"
            />
            <text x={left - 10} y={y((max * i) / 4) + 4} textAnchor="end">
              {((max * i) / 4).toFixed(1)}
            </text>
          </g>
        ))}
        {uncertainty.length === data.length && (
          <path
            d={
              uncertainty
                .map((d, i) => `${i ? "L" : "M"}${x(i)},${y(d.upper)}`)
                .join(" ") +
              [...uncertainty]
                .reverse()
                .map((d, i) => `L${x(data.length - 1 - i)},${y(d.lower)}`)
                .join(" ") +
              "Z"
            }
            fill="#dbeafe"
          />
        )}
        {comparison.length > 0 && (
          <path
            d={path(comparison)}
            fill="none"
            stroke="#94a3b8"
            strokeWidth="2"
            strokeDasharray="5 5"
          />
        )}
        {type === "line" && (
          <>
            <path
              d={`${path(data)} L${x(data.length - 1)},${bottom} L${left},${bottom} Z`}
              fill={`url(#${id})`}
            />
            <path
              d={path(
                forecastStart == null ? data : data.slice(0, forecastStart + 1),
              )}
              fill="none"
              stroke="#2563eb"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            {forecastStart != null && (
              <path
                d={data
                  .map((d, i) =>
                    i < forecastStart
                      ? ""
                      : `${i === forecastStart ? "M" : "L"}${x(i)},${y(d.value)}`,
                  )
                  .join(" ")}
                stroke="#2563eb"
                fill="none"
                strokeWidth="2.5"
                strokeDasharray="6 4"
              />
            )}
          </>
        )}
        {data.map((d, i) => (
          <g key={d.label}>
            {type === "bar" && (
              <rect
                x={x(i) - 8}
                y={y(d.value)}
                width="16"
                height={bottom - y(d.value)}
                rx="3"
                fill={hover === i ? "#1d4ed8" : "#2563eb"}
                opacity={hover === null || hover === i ? 1 : 0.5}
              />
            )}
            {i % Math.max(1, Math.floor(data.length / 6)) === 0 && (
              <text x={x(i)} y="208" textAnchor="middle">
                {d.label}
              </text>
            )}
            <circle
              cx={x(i)}
              cy={y(d.value)}
              r={hover === i ? 5 : 3}
              fill={hover === i ? "#2563eb" : "transparent"}
              stroke={hover === i ? "white" : "transparent"}
            />
            <rect
              className="chart-hit"
              x={x(i) - 9}
              y={top}
              width="18"
              height={bottom - top}
              fill="transparent"
              tabIndex="0"
              role="img"
              aria-label={`${d.label}: ${d.value.toFixed(2)} ${unit} ${label}`}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              onMouseEnter={() => setHover(i)}
            />
          </g>
        ))}
      </svg>
      {selected && (
        <div
          className="chart-tooltip"
          role="status"
          style={{
            left: `${Math.min(70, Math.max(6, (hover / Math.max(data.length - 1, 1)) * 85))}%`,
          }}
        >
          <strong>{selected.label}</strong>
          <span>
            {label}{" "}
            <b>
              {selected.value.toFixed(2)}
              {unit}
            </b>
          </span>
          {comparison[hover] && (
            <span>
              Previous{" "}
              <b>
                {comparison[hover].value.toFixed(2)}
                {unit}
              </b>
            </span>
          )}
          <small>Illustrative sample</small>
        </div>
      )}
    </div>
  );
}
