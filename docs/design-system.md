# UrbanFlow Analytics design system

## Product foundation

Urban mobility data -> operational intelligence -> business insight -> management action.

Desktop-first light analytical workspace, a persistent navy navigation rail, blue data series and restrained semantic feedback. Only the sample Executive Overview is implemented. Other navigation destinations use one planned-module state.

## Tokens and typography

`dashboard/src/styles.css` owns all tokens and responsive rules. Inter Variable is bundled locally, with system sans-serif fallbacks. No external font request is required. Numeric metrics use tabular figures.

| Token                   | Value                        | Purpose                                               |
| ----------------------- | ---------------------------- | ----------------------------------------------------- |
| Primary / dark / light  | #2563EB / #1D4ED8 / #DBEAFE  | Active navigation, primary actions, first data series |
| Background / surface    | #F6F8FC / #FFFFFF            | Workspace and analytical containers                   |
| Sidebar / primary text  | #0F172A                      | Navigation and highest emphasis                       |
| Secondary text / border | #64748B / #E2E8F0            | Context, labels and separation                        |
| Success                 | #15803D                      | Favorable change; #16A34A for graphical accents       |
| Warning                 | #A16207                      | Warning text; #F59E0B for graphical accents           |
| Critical                | #DC2626                      | Negative outcomes and failures                        |
| Information             | #0369A1                      | Informational text; #0284C7 for graphical accents     |
| Radius                  | 6 / 10 / 12 px               | Controls, cards, larger surfaces                      |
| Spacing                 | 4 / 8 / 12 / 16 / 24 / 32 px | Reusable spacing scale                                |

Page title: 27px / 650; section and card titles: 13-17px / 600; KPI values: 28px / 650; labels and dense metadata: 10-12px; narrative text: 11-13px with 1.6-1.75 line height. Never use color alone to express outcomes: pair it with labels, signs, dashes or status text.

## Component contracts

- `AppShell`, `Sidebar`, `Header`: controlled navigation/collapse/drawer state; compact header, demo profile panel, focus-managed mobile drawer. The main region is inert while the drawer is open.
- `PageContainer`, `SectionHeader`: shared page spacing and heading hierarchy.
- `GlobalFilterBar`: controlled `filters`, `onFilterChange`, `onResetFilters`, `activeFilterCount`. Filters persist across module navigation in the current session. No fake data recalculation.
- `FilterDropdown`: controlled string `value`, string `options`, optional default `placeholder`, `searchable`, `active`, `onChange`. Supports search, arrow keys, Home/End, Escape, focus return, outside dismissal, and selected state. For real zone catalogs replace local option filtering with debounced server search and bounded results.
- `DateRangeSelector`: supported presets only. Custom date entry is intentionally absent until a date interval contract is agreed with the backend.
- `KPICard`: `label`, `value`, numeric `change`, `compareLabel`, `icon`, optional `sparkline`, `lowerIsBetter`. A duration reduction can be favorable. Comparison labels must match the data interval.
- `AnalyticsCard`: `title`, `description`, `info`, `actions`, `children`, `footer`, `compact`. The optional information disclosure is keyboard accessible.
- `ChartContainer`: `data: [{label,value}]`, `comparison`, `type: line|bar`, `label`, `unit`, positive `max`, optional `forecastStart`, `uncertainty: [{lower,upper}]`, `summary`. Data must be finite, nonnegative and fit the domain; comparison and uncertainty share the primary x-axis. Primary series is blue, comparison dashed slate, forecast dashed blue, uncertainty pale blue. Interactive points provide keyboard and mouse tooltips. Higher-density charts should use aggregate series rather than individual trip records.
- `MapContainer`: illustrative SVG map with zoom, drag/keyboard pan, named focusable selectable zones, tooltips and intensity legend. `onZoneSelect`, `timeControl` and `children` provide extension points. This is a schematic, not real geographic boundaries. Real choropleths, OD flows and heat layers require a geographic renderer and validated zone shapes; do not treat this schematic as spatial analysis.
- `DataTable`: `columns: [{key,label,numeric,sortable,render}]`, `rows`, stable `rowKey`, `pageSize`, `title`. Search, numeric/text sorting, pagination, sticky headings and scroll containment. Use column `render` for status badges and signed metrics. The local implementation is for bounded results; millions of raw trips belong behind server filtering, sorting and pagination.
- `InsightCard`: `variant: opportunity|warning|information`, `title`, `evidence`, `impact`, `action`. Evidence first, management impact second, recommended action last.
- `RecommendationCard`: concise management recommendation container.
- `ModelPerformanceCard`: `name`, `mae`, `rmse`, `r2`, `unit`, `status`, `best`, `context`, `children`. Pending metrics have an explicit state. `ModelComparisonChart`, `FeatureImportance`, `ActualVsPredicted` provide visual components without adding an ML page.
- `StatusBadge`, `LoadingState`, `EmptyState`, `ErrorState`: shared semantic feedback. `ErrorState` accepts `onRetry`. Tables distinguish no matching results from no available data.

## Responsive and accessibility rules

Desktop navigation is 236px (76px collapsed); tablet/mobile navigation becomes a drawer at 1024px. KPIs reflow to two columns at 1024px and one below 420px. Analytics becomes one column below 760px. Filters wrap to two columns on small screens so open menus remain visible. Tables scroll within their container.

Keep meaningful accessible names on controls, use one page h1, preserve visible keyboard focus, and honor reduced motion. Chart values have focusable labels and tooltips. Map zones expose names, values and selection state. Provide textual interpretation alongside charts for final analytical pages.

## Preview boundary and integration

Static January 2026 sample; numbers and charts are independent design fixtures, not reconciled business measures. Filters update UI scope only and explicitly disclose that preview values are unchanged. No notifications imply live feeds. No final analytics, models, API calls, or geographic datasets are implemented.

Keep backend integration in `services/api.js`. A future data hook should translate pending/empty/error/success states into shared components. Page filters should be visually separate from global workspace filters. Replace mock fixtures with validated API responses; preserve units, scope and comparison periods.

## Validation

`npm run build` validates the production bundle. `npm run test:e2e` exercises the sample Overview, global filters, keyboard menus, collapse/navigation, chart interval/tooltip, map zoom/selection and desktop/tablet/mobile overflow. Screenshots are written to ignored `dashboard/test-results/`.
