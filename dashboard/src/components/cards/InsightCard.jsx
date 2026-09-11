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
  interpretation,
  showBadge = true,
}) {
  return (
    <article className={`insight-card insight-card--${variant} ${interpretation ? "insight-card--historical" : ""}`}>
      {showBadge && <div className="insight-card__badge">
        {variantLabels[variant] ?? variantLabels.information}
      </div>}
      <h3 className="insight-card__title">{title}</h3>
      <p className="insight-card__evidence">{evidence}</p>

      {impact && <div className="insight-card__section">
        <span>Impact</span>
        <p>{impact}</p>
      </div>}

      {action && <div className="insight-card__section">
        <span>Recommended action</span>
        <p>{action}</p>
      </div>}
      {interpretation && <div className="insight-card__section">
        <span>Operational interpretation</span>
        <p>{interpretation}</p>
      </div>}
    </article>
  );
}
