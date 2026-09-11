export function StatusBadge({ variant = "neutral", label }) {
  return (
    <span className={`status-badge status-badge--${variant}`}>{label}</span>
  );
}
