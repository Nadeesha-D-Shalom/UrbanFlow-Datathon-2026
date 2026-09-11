export const TOUR_STEPS = [
  {
    id: "welcome",
    target: "body",
    placement: "center",
    page: "Overview",
    disableBeacon: true,
    title: "Welcome to UrbanFlow Analytics",
    content:
      "UrbanFlow is an urban mobility intelligence platform analyzing 44.3M NYC taxi trips. Let's take a guided tour of the analytics and intelligence modules.",
  },
  {
    id: "overview-kpis",
    target: '[data-tour="overview-kpis"]',
    placement: "bottom",
    page: "Overview",
    disableBeacon: true,
    title: "Executive Baseline Metrics",
    content:
      "Monitor citywide trip volume (44.3M), 365 active service days, and fleet indicators across New York City.",
  },
  {
    id: "fare-kpis",
    target: '[data-tour="fare-kpis"]',
    placement: "bottom",
    page: "Fare & Revenue",
    disableBeacon: true,
    title: "Base-Fare Revenue Analytics",
    content:
      "Explore verified base-fare revenue ($918.3M), $20.73 average base fare, and pre-trip Decision Tree test metrics ($4.39 MAE, 0.7579 R²).",
  },
  {
    id: "trip-efficiency-kpis",
    target: '[data-tour="trip-efficiency-kpis"]',
    placement: "bottom",
    page: "Trip Efficiency",
    disableBeacon: true,
    title: "Trip Efficiency & Duration",
    content:
      "Review average trip duration (18.1 min) and the champion LightGBM model selected via rolling temporal validation (4.53 min MAE).",
  },
  {
    id: "demand-chart",
    target: '[data-tour="demand-chart"]',
    placement: "bottom",
    page: "Demand Analytics",
    disableBeacon: true,
    title: "Recursive Demand Forecasts",
    content:
      "Multi-step recursive LightGBM hourly pickup forecasts across 24h, 48h, and 72h horizons for top transit zones.",
  },
  {
    id: "hotspot-map",
    target: '[data-tour="hotspot-map"]',
    placement: "bottom",
    page: "Zone & Hotspots",
    disableBeacon: true,
    title: "Official Taxi-Zone Map",
    content:
      "Explore official NYC TLC taxi zone boundaries joined by LocationID with pickup intensity by operating period and spatial clustering.",
  },
  {
    id: "od-flow-routes",
    target: '[data-tour="od-flow-routes"]',
    placement: "bottom",
    page: "OD Flows",
    disableBeacon: true,
    title: "Origin-Destination Flows",
    content:
      "Ranked inter-borough travel corridors and passenger movement volumes across morning, midday, evening, and night periods.",
  },
  {
    id: "prediction-form",
    target: '[data-tour="prediction-form"]',
    placement: "bottom",
    page: "Predictions",
    disableBeacon: true,
    title: "Live Pre-Trip Estimators",
    content:
      "Estimate real-time trip base fare and trip duration using booking-time inputs with zero post-trip feature leakage.",
  },
  {
    id: "insights-grid",
    target: '[data-tour="insights-grid"]',
    placement: "bottom",
    page: "Business Insights",
    disableBeacon: true,
    title: "Strategic Business Insights",
    content:
      "6 grounded recommendations structured as Problem / Evidence / Business Action synthesized across all platform analytics.",
  },
  {
    id: "assistant-workspace",
    target: '[data-tour="assistant-workspace"]',
    placement: "bottom",
    page: "AI Mobility Assistant",
    disableBeacon: true,
    title: "AI Mobility Assistant",
    content:
      "Query platform analytics in plain English with grounded evidence across all 9 mobility intents and zero external LLMs.",
  },
];

