import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
const dailyMetrics = JSON.parse(readFileSync(new URL("../src/data/generated/overview_daily.json", import.meta.url), "utf8"));
const weeklyMetrics = JSON.parse(readFileSync(new URL("../src/data/generated/overview_weekly.json", import.meta.url), "utf8"));
const zoneActivity = JSON.parse(readFileSync(new URL("../src/data/generated/zone_activity.json", import.meta.url), "utf8"));
test("overview navigation, disabled filters, real charts and zone rankings", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 1080 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", { name: "Executive Overview" }),
  ).toBeVisible();
  await expect(page.locator(".kpi-card")).toHaveCount(4);
  await expect(page.locator(".kpi-card__value")).toHaveText(["44.3M", "$918.3M", "$20.73", "18.1 min"]);
  const demand = page.locator(".chart-container").first();
  const revenue = page.locator(".chart-container").nth(1);
  await expect(demand.locator(".chart-hit")).toHaveCount(dailyMetrics.length);
  await expect(revenue.locator(".chart-hit")).toHaveCount(dailyMetrics.length);
  await expect(demand.locator(".chart-hit").first()).toHaveAttribute("aria-label", `${dailyMetrics[0].date}: ${dailyMetrics[0].trip_count.toLocaleString("en-US")} Trips`);
  await revenue.locator(".chart-hit").first().focus();
  await expect(revenue.locator(".chart-tooltip")).toContainText(dailyMetrics[0].base_fare_revenue.toLocaleString("en-US", { style: "currency", currency: "USD" }));
  await expect(revenue.locator(".chart-tooltip")).toContainText("Cleaned UrbanFlow historical data");
  await expect(demand.locator(".comparison")).toHaveCount(0);
  const filters = page.getByRole("region", { name: "Global filters" });
  await expect(filters.getByRole("button")).toHaveCount(5);
  for (const button of await filters.getByRole("button").all()) {
    await expect(button).toBeDisabled();
  }
  await expect(filters).toContainText("Not applied to Executive Overview. Showing the full dataset.");
  await expect(page.locator(".kpi-card__sparkline, .kpi-card__change, .kpi-card__icon")).toHaveCount(0);
  await expect(page.locator(".sample-banner, .preview-label, .map-container")).toHaveCount(0);
  await page.getByRole("button", { name: "Weekly", exact: true }).click();
  await expect(
    page.locator(".chart-container").first().locator(".chart-hit"),
  ).toHaveCount(weeklyMetrics.length);
  await page.locator(".chart-hit").first().focus();
  await expect(page.locator(".chart-tooltip")).toBeVisible();
  await expect(demand.locator(".chart-tooltip")).toContainText(weeklyMetrics[0].trip_count.toLocaleString("en-US"));
  await expect(demand.locator(".chart-tooltip")).toContainText("Cleaned UrbanFlow historical data");
  await expect(revenue.locator(".chart-hit")).toHaveCount(dailyMetrics.length);
  const zoneRows = page.getByRole("list", { name: "Top five pickup zones" }).getByRole("listitem");
  await expect(zoneRows).toHaveCount(5);
  for (const [index, zone] of zoneActivity.slice(0, 5).entries()) {
    await expect(zoneRows.nth(index)).toContainText(zone.zone_name);
    await expect(zoneRows.nth(index)).toContainText(zone.area);
    await expect(zoneRows.nth(index)).toContainText(zone.pickup_count.toLocaleString("en-US"));
    await expect(zoneRows.nth(index)).toContainText(`${(zone.share_of_total_pickups * 100).toFixed(2)}% of pickups`);
  }
  const insight = page.locator(".insight-card");
  await expect(insight).toContainText(zoneActivity[0].zone_name);
  await expect(insight).toContainText(zoneActivity[0].pickup_count.toLocaleString("en-US"));
  const topShare = zoneActivity.slice(0, 5).reduce((sum, zone) => sum + zone.share_of_total_pickups, 0);
  await expect(insight).toContainText(`${(topShare * 100).toFixed(2)}%`);
  await expect(insight).not.toContainText("High Evening Demand");
  await expect(page.getByText("Preview mode", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Collapse sidebar" }).click();
  await expect(page.locator(".sidebar")).toHaveClass(/is-collapsed/);
  await page
    .getByRole("button", { name: "Demand Analytics", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Demand Analytics", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Back to Overview/ }).click();
  await expect(
    page.getByRole("heading", { name: "Executive Overview" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("mobile drawer traps focus, closes with Escape, and layout fits", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(
    page.getByRole("button", { name: "Close navigation" }),
  ).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(
    page.getByRole("button", { name: "AI Mobility Assistant", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Open navigation" }),
  ).toBeFocused();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  await page.screenshot({
    path: "test-results/overview-mobile.png",
    fullPage: true,
  });
});
test("desktop and tablet layout fit with no runtime errors", async ({
  page,
}) => {
  for (const width of [1440, 1024, 768]) {
    await page.setViewportSize({ width, height: 1080 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBeTruthy();
    if (width === 1440)
      await page.screenshot({
        path: "test-results/overview-desktop.png",
        fullPage: true,
      });
  }
});

test("shared table sorts numeric values and supports pagination and empty results", async ({
  page,
}) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.evaluate(async () => {
    const React = (await import("/node_modules/.vite/deps/react.js")).default;
    const { createRoot } =
      (await import("/node_modules/.vite/deps/react-dom_client.js")).default;
    const { DataTable } = await import("/src/components/tables/DataTable.jsx");
    const host = document.createElement("div");
    document.body.replaceChildren(host);
    createRoot(host).render(
      React.createElement(DataTable, {
        title: "Zone rankings",
        pageSize: 2,
        columns: [
          { key: "name", label: "Zone" },
          { key: "trips", label: "Trips", numeric: true },
        ],
        rows: [
          { id: 1, name: "Midtown", trips: 100 },
          { id: 2, name: "Queens", trips: 9 },
          { id: 3, name: "Brooklyn", trips: 20 },
        ],
      }),
    );
  });
  await page.getByRole("button", { name: /Trips/ }).click();
  await expect(page.locator("tbody tr").first()).toContainText("Queens");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.locator("tbody tr").first()).toContainText("Midtown");
  await page
    .getByRole("searchbox", { name: "Search Zone rankings" })
    .fill("no such zone");
  await expect(
    page.getByText("No matching trips were found.", { exact: true }),
  ).toBeVisible();
});
