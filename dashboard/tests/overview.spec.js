import { test, expect } from "@playwright/test";
test("overview navigation, filters, chart and map interactions", async ({
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
  await page
    .getByRole("button", { name: "Pickup Zone All pickup zones" })
    .click();
  await page
    .getByRole("searchbox", { name: "Search Pickup Zone" })
    .fill("Airport");
  await page.getByRole("option", { name: "Airport Corridor" }).click();
  await expect(
    page.getByRole("button", { name: "Pickup Zone Airport Corridor" }),
  ).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByText("1 active", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Reset filters" }).click();
  await expect(
    page.getByRole("button", { name: "Pickup Zone All pickup zones" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Date Range Last 30 days" }).click();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(page.locator(".filter-dropdown__panel")).toHaveCount(0);
  await page.getByRole("button", { name: "Weekly", exact: true }).click();
  await expect(
    page.locator(".chart-container").first().locator(".chart-hit"),
  ).toHaveCount(4);
  await page.locator(".chart-hit").first().focus();
  await expect(page.locator(".chart-tooltip")).toBeVisible();
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await expect(page.getByText("125%", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Midtown, 18,420 sample pickups" })
    .click();
  await expect(page.locator(".map-selection")).toContainText("Midtown");
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
