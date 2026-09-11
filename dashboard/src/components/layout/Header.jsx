export function Header({ title, onOpenMobileSidebar, onStartTour }) {
  return (
    <header className="header">
      <div className="header__left">
        <button
          className="icon-button header__menu"
          onClick={onOpenMobileSidebar}
          id="navigation-toggle" aria-label="Open navigation"
        >
          ☰
        </button>
        <span className="header-path">
          Workspace <span>/</span> <strong>{title}</strong>
        </span>
      </div>
      <div className="header__right">
        {onStartTour && (
          <button
            type="button"
            className="tour-start-btn"
            onClick={onStartTour}
            aria-label="Start Tour"
            data-tour="start-tour-button"
          >
            <span className="tour-start-btn__icon" aria-hidden="true">✨</span>
            <span>Start Tour</span>
          </button>
        )}
        <details className="profile-menu">
          <summary aria-label="Open profile menu">
            <span className="header__avatar">OT</span>
            <span className="profile-name">Operations Team</span>
            <span>⌄</span>
          </summary>
          <div className="profile-panel">
            <strong>Operations Team</strong>
            <p>Executive view</p>
            <hr />
            <p>
              Account management is not enabled in this workspace.
            </p>
          </div>
        </details>
      </div>
    </header>
  );
}
