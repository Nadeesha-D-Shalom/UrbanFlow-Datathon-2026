import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

export function AppShell({
  activePage,
  onNavigate,
  pageTitle,
  breadcrumb,
  sidebarCollapsed,
  mobileSidebarOpen,
  onToggleSidebar,
  onOpenMobileSidebar,
  onCloseMobileSidebar,
  children,
}) {
  return (
    <div className="app-shell">
      <Sidebar
        activePage={activePage}
        onNavigate={onNavigate}
        collapsed={sidebarCollapsed}
        mobileOpen={mobileSidebarOpen}
        onToggleCollapse={onToggleSidebar}
        onCloseMobile={onCloseMobileSidebar}
      />

      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <div
        className="app-shell__content"
        inert={mobileSidebarOpen ? "" : undefined}
      >
        <Header
          title={pageTitle}
          breadcrumb={breadcrumb}
          onOpenMobileSidebar={onOpenMobileSidebar}
        />

        <main id="main-content" tabIndex={-1} className="app-shell__main">
          {children}
        </main>
      </div>
    </div>
  );
}
