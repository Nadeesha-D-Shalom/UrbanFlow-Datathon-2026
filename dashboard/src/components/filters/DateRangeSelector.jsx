import { FilterDropdown } from "./FilterDropdown";
export function DateRangeSelector({ value, onChange }) {
  return (
    <FilterDropdown
      label="Date Range"
      value={value}
      options={[
        "Today",
        "Last 7 days",
        "Last 30 days",
        "Last 90 days",
        "Year to date",
      ]}
      onChange={onChange}
      active={value !== "Last 30 days"}
    />
  );
}
