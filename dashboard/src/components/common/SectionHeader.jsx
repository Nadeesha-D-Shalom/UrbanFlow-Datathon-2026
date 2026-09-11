export function SectionHeader({ eyebrow, title, description, actions }) {
  return (
    <div className="section-header">
      <div>
        {eyebrow ? <p className="section-header__eyebrow">{eyebrow}</p> : null}
        <h2 className="section-header__title">{title}</h2>
        {description ? (
          <p className="section-header__description">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="section-header__actions">{actions}</div>
      ) : null}
    </div>
  );
}
