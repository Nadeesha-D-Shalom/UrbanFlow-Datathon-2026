const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

async function fetchJson(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const error = new Error(`Request failed with status ${response.status}`);
    error.status = response.status;
    throw error;
  }

  return response.json();
}

export const api = {
  health: (options = {}) => fetchJson("/health", options),
  predictions: () => fetchJson("/api/predictions"),
  analytics: () => fetchJson("/api/analytics"),
  durationPrediction: (payload, options = {}) => fetchJson("/api/duration/predict", {
    ...options,
    method: "POST",
    body: JSON.stringify(payload),
  }),
  demandForecast: (horizon, options = {}) => fetchJson(`/api/demand/forecast?horizon=${horizon}`, options),
  farePrediction: (payload, options = {}) => fetchJson("/api/fare/predict", {
    ...options,
    method: "POST",
    body: JSON.stringify(payload),
  }),
};

export { fetchJson };
