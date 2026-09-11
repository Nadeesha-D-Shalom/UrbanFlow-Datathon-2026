import { useMemo, useState, useCallback, useEffect } from "react";
import { AppShell } from "./components/layout/AppShell";
import { Overview } from "./pages/Overview";

const defaultFilters = {
  dateRange: "Last 30 days",
  pickupZone: "All pickup zones",
  dropoffZone: "All drop-off zones",
  provider: "All providers",
  rateClass: "All rate classes",
};

export default function App() {
  const [activePage, setActivePage] = useState("Overview");
  const closeMobile = useCallback(() => setMobileSidebarOpen(false), []);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [filters, setFilters] = useState(defaultFilters);
  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 1025px)');
    const handleResize = () => { if (desktop.matches) closeMobile(); };
    desktop.addEventListener('change', handleResize);
    return () => desktop.removeEventListener('change', handleResize);
  }, [closeMobile]);


  const activeFilterCount = useMemo(
    () =>
      Object.entries(filters).filter(
        ([key, value]) => value !== defaultFilters[key],
      ).length,
    [filters],
  );

  const handleFilterChange = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const handleResetFilters = () => setFilters(defaultFilters);

  return (
    <AppShell
      activePage={activePage}
      onNavigate={setActivePage}
      pageTitle={activePage === "Overview" ? "Overview" : activePage}
      breadcrumb={`Workspace / ${activePage}`}
      sidebarCollapsed={sidebarCollapsed}
      mobileSidebarOpen={mobileSidebarOpen}
      onToggleSidebar={() => setSidebarCollapsed((current) => !current)}
      onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
      onCloseMobileSidebar={closeMobile}
    >
      {activePage === "Overview" ? (
        <Overview
          filters={filters}
          activeFilterCount={activeFilterCount}
          onFilterChange={handleFilterChange}
          onResetFilters={handleResetFilters}
        />
      ) : (
        <section className="planned-page">
          <span className="eyebrow">WORKSPACE / PLANNED MODULE</span>
          <h1>{activePage}</h1>
          <p>
            This module is part of the UrbanFlow roadmap. The Overview preview
            establishes the shared design system.
          </p>
          <button
            className="primary-button"
            onClick={() => setActivePage("Overview")}
          >
            Back to Overview →
          </button>
        </section>
      )}
    </AppShell>
  );
}
