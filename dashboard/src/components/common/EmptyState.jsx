export function EmptyState({
  title = "No data available",
  description = "No data available for the selected filters.",
}) {
  return (
    <div className="state-card state-card--empty">
      <strong>{title}</strong>
      <p>{description}</p>
    </div>
  );
}
