export function RecommendationCard({ title, summary, action }) {
  return (
    <article className="recommendation-card">
      <p className="recommendation-card__eyebrow">Recommendation</p>
      <h3 className="recommendation-card__title">{title}</h3>
      <p className="recommendation-card__summary">{summary}</p>
      <p className="recommendation-card__action">{action}</p>
    </article>
  );
}
