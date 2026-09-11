import { StatusBadge } from "../common/StatusBadge";
export function Header({ title, onOpenMobileSidebar }) {
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
        <span className="header__meta">Static sample · Jan 2026</span>
        <StatusBadge variant="info" label="Preview mode" />
        <details className="profile-menu">
          <summary aria-label="Open profile menu">
            <span className="header__avatar">OT</span>
            <span className="profile-name">Operations Team</span>
            <span>⌄</span>
          </summary>
          <div className="profile-panel">
            <strong>Operations Team</strong>
            <p>Demo workspace · Executive view</p>
            <hr />
            <p>
              Sample data only. Account management will be available when the
              platform is connected.
            </p>
          </div>
        </details>
      </div>
    </header>
  );
}
