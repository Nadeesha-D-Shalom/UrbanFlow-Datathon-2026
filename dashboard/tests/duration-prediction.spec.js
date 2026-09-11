import { test, expect } from "@playwright/test";

const trips = [
  { provider_code: 1, pickup_timestamp: "2026-09-14T08:30:00", rider_count: 2,
    rate_class_id: 1, origin_loc_id: 132, dest_loc_id: 236 },
  { provider_code: 2, pickup_timestamp: "2026-03-20T17:45:00", rider_count: 1,
    rate_class_id: 1, origin_loc_id: 161, dest_loc_id: 230 },
];

async function fillTrip(page, trip) {
  await page.getByRole("combobox", { name: "Duration provider", exact: true }).selectOption(String(trip.provider_code));
  await page.getByLabel("Duration pickup time").fill(trip.pickup_timestamp.slice(0, 16));
  await page.getByLabel("Duration riders").fill(String(trip.rider_count));
  await page.getByRole("combobox", { name: "Duration rate class", exact: true }).selectOption(String(trip.rate_class_id));
  await page.getByRole("combobox", { name: "Duration pickup zone", exact: true }).selectOption(String(trip.origin_loc_id));
  await page.getByRole("combobox", { name: "Duration destination zone", exact: true }).selectOption(String(trip.dest_loc_id));
}

test("two live UI duration predictions match the real API", async ({ page }) => {
  test.skip(process.env.URBANFLOW_LIVE_API !== "1", "Set URBANFLOW_LIVE_API=1 with the UrbanFlow API running.");
  await page.goto("/");
  await page.getByRole("button", { name: "Predictions", exact: true }).click();
  await page.getByRole("tab", { name: "Trip Duration", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Trip Duration Prediction", exact: true })).toBeVisible();

  for (const trip of trips) {
    await fillTrip(page, trip);
    const responsePromise = page.waitForResponse(response => response.url().endsWith("/api/duration/predict") && response.request().method() === "POST");
    await page.getByRole("button", { name: "Predict duration", exact: true }).click();
    const response = await responsePromise;
    expect(response.ok()).toBe(true);
    expect(response.request().postDataJSON()).toEqual(trip);
    const data = await response.json();
    expect(data.predicted_trip_duration_minutes).toBeGreaterThan(0);
    await expect(page.locator(".duration-result__value")).toHaveText(`${Math.round(data.predicted_trip_duration_minutes)} min`);
    console.log(JSON.stringify({ ui_payload: trip, api_prediction: data.predicted_trip_duration_minutes, ui_matches: true }));
  }
});