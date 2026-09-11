export function ErrorState({
  title = "Unable to load analytics data.",
  description = "Try refreshing the page or checking the source connection.",
  onRetry,
}) {
  return (
    <div className="state-card state-card--error" role="alert">
      <strong>{title}</strong>
      <p>{description}</p>
      {onRetry && (
        <button className="secondary-button" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}
