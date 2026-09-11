const variantLabels = {
  opportunity: "Opportunity",
  warning: "Warning",
  information: "Information",
};

export function InsightCard({
  variant = "information",
  title,
  evidence,
  impact,
  action,
}) {
  return (
    <article className={`insight-card insight-card--${variant}`}>
      <div className="insight-card__badge">
        {variantLabels[variant] ?? variantLabels.information}
      </div>
      <h3 className="insight-card__title">{title}</h3>
      <p className="insight-card__evidence">{evidence}</p>

      <div className="insight-card__section">
        <span>Impact</span>
        <p>{impact}</p>
      </div>

      <div className="insight-card__section">
        <span>Recommended action</span>
        <p>{action}</p>
      </div>
    </article>
  );
}
