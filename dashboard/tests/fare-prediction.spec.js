import { test, expect } from "@playwright/test";

const first = { provider_code: 1, pickup_timestamp: "2026-09-14T08:30:00", rider_count: 2,
  rate_class_id: 1, origin_loc_id: 132, dest_loc_id: 236 };
const second = { provider_code: 2, pickup_timestamp: "2026-03-20T17:45:00", rider_count: 1,
  rate_class_id: 1, origin_loc_id: 161, dest_loc_id: 230 };

async function openPredictions(page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Predictions", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Fare Prediction", exact: true })).toBeVisible();
}
async function fillTrip(page, trip) {
  await page.getByRole("combobox", { name: "Provider", exact: true }).selectOption(String(trip.provider_code));
  await page.getByLabel("Pickup date and time").fill(trip.pickup_timestamp.slice(0,16));
  await page.getByLabel("Rider count").fill(String(trip.rider_count));
  await page.getByRole("combobox", { name: "Rate class", exact: true }).selectOption(String(trip.rate_class_id));
  await page.getByRole("combobox", { name: "Pickup zone", exact: true }).selectOption(String(trip.origin_loc_id));
  await page.getByRole("combobox", { name: "Destination zone", exact: true }).selectOption(String(trip.dest_loc_id));
}

test("fare form validates, disables pending requests, and handles unavailable service", async ({ page }) => {
  await page.route("**/health", route => route.abort());
  let release;
  let requests = 0;
  await page.route("**/api/fare/predict", async route => {
    requests += 1;
    await new Promise(resolve => { release = resolve; });
    await route.fulfill({ status: 503, contentType: "application/json", body: "{}" });
  });
  await openPredictions(page);
  await expect(page.getByText("API status: Unavailable")).toBeVisible();
  await page.getByRole("button", { name: "Predict fare", exact: true }).click();
  expect(await page.locator("form.fare-form").first().evaluate(form => form.checkValidity())).toBe(false);
  expect(requests).toBe(0);
  await fillTrip(page, first);
  await page.getByLabel("Rider count").fill("10");
  await page.getByRole("button", { name: "Predict fare", exact: true }).click();
  expect(await page.getByLabel("Rider count").evaluate(input => input.validity.rangeOverflow)).toBe(true);
  expect(requests).toBe(0);
  await page.getByLabel("Rider count").fill("2");
  await page.getByRole("button", { name: "Predict fare", exact: true }).click();
  await expect(page.getByRole("button", { name: "Predicting…" })).toBeDisabled();
  await expect(page.getByRole("combobox", { name: "Provider", exact: true })).toBeDisabled();
  await expect.poll(() => requests).toBe(1);
  release();
  await expect(page.getByRole("alert")).toContainText("Confirm the UrbanFlow API is running on port 8000.");
  await expect(page.getByRole("button", { name: "Predict fare", exact: true })).toBeEnabled();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("two live UI predictions match the real fare API", async ({ page }) => {
  test.skip(process.env.URBANFLOW_LIVE_API !== "1", "Set URBANFLOW_LIVE_API=1 with the fare API running.");
  await openPredictions(page);
  await expect(page.getByText("API status: Connected")).toBeVisible();
  const zoneLabels = await page.getByRole("combobox", { name: "Pickup zone", exact: true }).locator("option").allTextContents();
  expect(zoneLabels.slice(1)).toEqual([...zoneLabels.slice(1)].sort((a,b) => a.localeCompare(b, "en")));
  for (const [index, trip] of [first, second].entries()) {
    await fillTrip(page, trip);
    await expect(page.locator(".fare-result__value")).toHaveCount(0);
    const responsePromise = page.waitForResponse(response => response.url().endsWith("/api/fare/predict") && response.request().method() === "POST");
    await page.getByRole("button", { name: "Predict fare", exact: true }).click();
    const response = await responsePromise;
    expect(response.ok()).toBe(true);
    expect(response.request().postDataJSON()).toEqual(trip);
    const data = await response.json();
    if (index === 0) expect(data.predicted_base_fare).toBe(88.08);
    await expect(page.locator(".fare-result__value")).toHaveText(data.predicted_base_fare.toLocaleString("en-US", { style: "currency", currency: "USD" }));
    const formattedPickup = new Intl.DateTimeFormat("en-GB", {
      day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
    }).format(new Date(trip.pickup_timestamp));
    await expect(page.locator(".fare-result__details")).toContainText(formattedPickup);
    console.log(JSON.stringify({ live_ui_payload: trip, api_prediction: data.predicted_base_fare, ui_matches: true }));
  }
  await page.screenshot({ path: "test-results/fare-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/fare-mobile.png", fullPage: true });
});
