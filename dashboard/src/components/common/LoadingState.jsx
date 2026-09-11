export function LoadingState({
  title = "Loading analytics",
  description = "Preparing data visualization...",
}) {
  return (
    <div
      className="state-card state-card--loading"
      role="status"
      aria-live="polite"
    >
      <div className="skeleton skeleton--title" />
      <div className="skeleton skeleton--line" />
      <div className="skeleton skeleton--line" />
      <div className="skeleton skeleton--visual" />
      <strong>{title}</strong>
      <p>{description}</p>
    </div>
  );
}
