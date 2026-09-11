import { DateRangeSelector } from "./DateRangeSelector";
import { FilterDropdown } from "./FilterDropdown";
import { StatusBadge } from "../common/StatusBadge";

const pickupZones = [
  "Airport Corridor",
  "Central Business District",
  "University Belt",
  "Residential North",
  "Residential South",
  "Transit Hub East",
];
const dropoffZones = [
  "Airport Corridor",
  "Central Business District",
  "University Belt",
  "Residential North",
  "Residential South",
  "Transit Hub East",
];
const providers = ["Metro Cab", "CityRide", "UrbanGo", "Swift Taxi"];
const rateClasses = ["Standard", "Premium", "Airport", "Shared", "Corporate"];

export function GlobalFilterBar({
  filters,
  onFilterChange,
  onResetFilters,
  activeFilterCount,
  disabled = false,
  periodLabel = "Full dataset period",
}) {
  if (disabled) {
    return (
      <section className="global-filters global-filters--disabled" aria-label="Global filters">
        <div className="global-filters__header">
          <h2 className="global-filters__title">Global filters</h2>
          <p className="filter-scope-note" id="overview-filter-scope">
            Not applied to Executive Overview. Showing the full dataset.
          </p>
        </div>
        <div className="global-filters__grid">
          {[
            ["Date Range", periodLabel],
            ["Pickup Zone", "All pickup zones"],
            ["Drop-off Zone", "All drop-off zones"],
            ["Provider", "All providers"],
            ["Rate Class", "All rate classes"],
          ].map(([label, value]) => (
            <div className="filter-dropdown" key={label}>
              <span className="filter-dropdown__label">{label}</span>
              <button className="filter-dropdown__button" disabled
                aria-label={`${label} ${value}`} aria-describedby="overview-filter-scope">
                {value}
              </button>
            </div>
          ))}
        </div>
      </section>
    );
  }
  return (
    <section
      className={`global-filters ${activeFilterCount > 0 ? "is-active" : ""}`}
      aria-label="Global filters"
    >
      <div className="global-filters__header">
        <div>
          <h2 className="global-filters__title">Global filters</h2>
          <p className="global-filters__description">Workspace scope</p>
        </div>

        <div className="global-filters__status">
          <StatusBadge
            variant={activeFilterCount > 0 ? "info" : "neutral"}
            label={
              activeFilterCount > 0
                ? `${activeFilterCount} active`
                : "All records"
            }
          />
          <button
            className="secondary-button"
            type="button"
            onClick={onResetFilters}
            disabled={!activeFilterCount}
          >
            Reset filters
          </button>
        </div>
      </div>

      <div className="global-filters__grid">
        <DateRangeSelector
          value={filters.dateRange}
          onChange={(value) => onFilterChange("dateRange", value)}
        />
        <FilterDropdown
          label="Pickup Zone"
          value={filters.pickupZone}
          options={pickupZones.filter(
            (option) => option !== filters.pickupZone,
          )}
          onChange={(value) => onFilterChange("pickupZone", value)}
          searchable
          placeholder="All pickup zones"
          active={filters.pickupZone !== "All pickup zones"}
        />
        <FilterDropdown
          label="Drop-off Zone"
          value={filters.dropoffZone}
          options={dropoffZones.filter(
            (option) => option !== filters.dropoffZone,
          )}
          onChange={(value) => onFilterChange("dropoffZone", value)}
          searchable
          placeholder="All drop-off zones"
          active={filters.dropoffZone !== "All drop-off zones"}
        />
        <FilterDropdown
          label="Provider"
          value={filters.provider}
          options={providers.filter((option) => option !== filters.provider)}
          onChange={(value) => onFilterChange("provider", value)}
          searchable
          placeholder="All providers"
          active={filters.provider !== "All providers"}
        />
        <FilterDropdown
          label="Rate Class"
          value={filters.rateClass}
          options={rateClasses.filter((option) => option !== filters.rateClass)}
          onChange={(value) => onFilterChange("rateClass", value)}
          searchable={false}
          placeholder="All rate classes"
          active={filters.rateClass !== "All rate classes"}
        />
      </div>
    </section>
  );
}
