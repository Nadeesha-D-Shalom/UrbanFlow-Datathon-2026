import { useMemo, useState, useCallback, useEffect } from "react";

import { AppShell } from "./components/layout/AppShell";

import { Overview } from "./pages/Overview";
import { Predictions } from "./pages/Predictions";
import { DemandAnalytics } from "./pages/DemandAnalytics";
import { SpatialAnalytics } from "./pages/SpatialAnalytics";
import { MobilityAssistant } from "./pages/MobilityAssistant";
import { FareRevenue } from "./pages/FareRevenue";
import { TripEfficiency } from "./pages/TripEfficiency";
import { BusinessInsights } from "./pages/BusinessInsights";
import { DashboardTour } from "./components/tour/DashboardTour";

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
  const [tourRunning, setTourRunning] = useState(false);
  const [tourStepIndex, setTourStepIndex] = useState(0);

  const handleStartTour = useCallback(() => {
    setActivePage("Overview");
    setTourStepIndex(0);
    setTourRunning(true);
  }, []);

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
    <>
      <DashboardTour
        run={tourRunning}
        onToggleRun={setTourRunning}
        activePage={activePage}
        onNavigate={setActivePage}
        stepIndex={tourStepIndex}
        setStepIndex={setTourStepIndex}
      />
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
        onStartTour={handleStartTour}
      >
      {activePage === "Overview" ? (
        <Overview
          filters={filters}
          activeFilterCount={activeFilterCount}
          onFilterChange={handleFilterChange}
          onResetFilters={handleResetFilters}
        />
      ) : activePage === "AI Mobility Assistant" ? (
        <MobilityAssistant />
      ) : activePage === "Demand Analytics" ? (
        <DemandAnalytics onBack={() => setActivePage("Overview")} />
      ) : activePage === "Predictions" ? (
        <Predictions />
      ) : activePage === "Zone & Hotspots" ? (
        <SpatialAnalytics mode="hotspots" />
      ) : activePage === "OD Flows" ? (
        <SpatialAnalytics mode="od" />
      ) : activePage === "Fare & Revenue" ? (
        <FareRevenue onBack={() => setActivePage("Overview")} onNavigate={setActivePage} />
      ) : activePage === "Trip Efficiency" ? (
        <TripEfficiency onBack={() => setActivePage("Overview")} onNavigate={setActivePage} />
      ) : activePage === "Business Insights" ? (
        <BusinessInsights onBack={() => setActivePage("Overview")} onNavigate={setActivePage} />
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
    </>
  );
}
