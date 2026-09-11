export function AnalyticsCard({
  title,
  description,
  actions,
  footer,
  children,
  compact = false,
  info,
}) {
  return (
    <article
      className={`analytics-card ${compact ? "analytics-card--compact" : ""}`}
    >
      <div className="analytics-card__header">
        <div>
          <h3 className="analytics-card__title">
            {title}
            {info && (
              <details className="card-info">
                <summary aria-label={`About ${title}`}>i</summary>
                <p>{info}</p>
              </details>
            )}
          </h3>
          {description ? (
            <p className="analytics-card__description">{description}</p>
          ) : null}
        </div>
        {actions ? (
          <div className="analytics-card__actions">{actions}</div>
        ) : null}
      </div>

      <div className="analytics-card__body">{children}</div>

      {footer ? <div className="analytics-card__footer">{footer}</div> : null}
    </article>
  );
}
