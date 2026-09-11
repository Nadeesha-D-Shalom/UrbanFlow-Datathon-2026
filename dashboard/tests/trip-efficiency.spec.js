import { test, expect } from "@playwright/test";

test.describe("Trip Efficiency Dashboard Page", () => {
  test("navigates to Trip Efficiency and validates all required ETA metrics, tables, and charts", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Trip Efficiency", exact: true }).click();

    // Verify page heading
    await expect(page.getByRole("heading", { name: "Trip Efficiency & ETA Analytics", exact: true })).toBeVisible();

    // Verify scope banner
    const banner = page.locator(".efficiency-scope-banner");
    await expect(banner).toBeVisible();
    await expect(banner).toContainText("ROLLING VALIDATION PERFORMANCE");
    await expect(banner).toContainText("November 2025 – February 2026");

    // 1. Verify 4 Required KPI Cards
    const kpis = page.locator(".kpi-grid");
    await expect(kpis).toBeVisible();
    await expect(kpis).toContainText("Average Trip Duration");
    await expect(kpis).toContainText("18.1 min");

    await expect(kpis).toContainText("Final Selected ETA Model");
    await expect(kpis).toContainText("LightGBM");

    await expect(kpis).toContainText("Rolling Validation MAE");
    await expect(kpis).toContainText("4.526 min");

    await expect(kpis).toContainText("Rolling Validation R²");
    await expect(kpis).toContainText("0.7412");

    // 2. Verify ETA Model Performance Section
    const perfCard = page.locator(".performance-summary-box");
    await expect(perfCard).toBeVisible();
    await expect(perfCard.locator(".performance-badge")).toContainText("Rolling Validation Performance");
    await expect(perfCard.locator(".performance-split-note")).toContainText("Nov 2025 – Feb 2026");
    await expect(perfCard.locator(".perf-metric-card").filter({ hasText: "Rolling MAE" })).toContainText("4.526 min");
    await expect(perfCard.locator(".perf-metric-card").filter({ hasText: "Rolling RMSE" })).toContainText("7.497 min");
    await expect(perfCard.locator(".perf-metric-card").filter({ hasText: "Rolling R²" })).toContainText("0.7412");

    // Verify tolerance bands
    await expect(perfCard.locator(".tolerance-bands")).toContainText("18.22%");
    await expect(perfCard.locator(".tolerance-bands")).toContainText("49.96%");
    await expect(perfCard.locator(".tolerance-bands")).toContainText("70.95%");

    // Verify folds table
    const foldsTable = page.locator(".folds-table");
    await expect(foldsTable).toBeVisible();
    await expect(foldsTable).toContainText("2025-11");
    await expect(foldsTable).toContainText("2025-12");
    await expect(foldsTable).toContainText("2026-01");
    await expect(foldsTable).toContainText("2026-02");
    await expect(foldsTable).toContainText("4.5260");
    await expect(foldsTable).toContainText("7.4970");

    // Verify model architecture & specifications card
    const specsCard = page.locator(".model-summary-specs");
    await expect(specsCard).toBeVisible();
    await expect(specsCard).toContainText("LightGBM");
    await expect(specsCard).toContainText("trip_duration_minutes");
    await expect(specsCard).toContainText("1,841,777");
    await expect(specsCard).toContainText("50 pre-trip");
    await expect(specsCard.locator(".leakage-governance-box")).toContainText("Pre-Trip Input Boundaries");

    // 3. Verify Historical Period Durations
    const periodGrid = page.locator(".period-duration-grid");
    await expect(periodGrid).toBeVisible();
    await expect(periodGrid).toContainText("Morning");
    await expect(periodGrid).toContainText("18.02 min");
    await expect(periodGrid).toContainText("Midday");
    await expect(periodGrid).toContainText("19.97 min");
    await expect(periodGrid).toContainText("Evening");
    await expect(periodGrid).toContainText("17.05 min");
    await expect(periodGrid).toContainText("Night");
    await expect(periodGrid).toContainText("15.51 min");

    // Verify diurnal profile
    const diurnal = page.locator(".diurnal-chart-container");
    await expect(diurnal).toBeVisible();
    await expect(diurnal).toContainText("Peak Congestion: Hour 15 (3 PM) · 20.73 min");
    await expect(diurnal).toContainText("Free-Flow Trough: Hour 2 (2 AM) · 13.53 min");

    // 4. Verify 50-Feature Architecture
    const featureList = page.locator(".feature-groups-list");
    await expect(featureList).toBeVisible();
    await expect(featureList).toContainText("Booking-Time & Static Features");
    await expect(featureList).toContainText("Historical OD Route Features");
    await expect(featureList).toContainText("Marginal Origin / Destination Historical Features");
    await expect(featureList).toContainText("Cyclical Trigonometric Encodings");

    // 5. Verify Live Benchmark Demo Card
    const demoCard = page.locator(".demo-card-content");
    await expect(demoCard).toBeVisible();
    await expect(demoCard).toContainText("12.33 min (12.3345 min)");
    await page.getByRole("button", { name: "Execute Verified Sample →" }).click();
    const demoFeedback = demoCard.locator(".demo-result-badge, .fare-error");
    await expect(demoFeedback).toBeVisible({ timeout: 10000 });

    // 6. Verify Takeaways
    const takeaways = page.locator(".takeaways-section");
    await expect(takeaways).toBeVisible();
    await expect(takeaways).toContainText("Historical Route Aggregates");
    await expect(takeaways).toContainText("Diurnal Dispatch Adjustments");
    await expect(takeaways).toContainText("Predictable Arrival Windows");
    await expect(takeaways).toContainText("Outlier & Data Hygiene");

    // Verify navigation back to Overview
    await page.getByRole("button", { name: "Back to Overview →" }).click();
    await expect(page.getByRole("heading", { name: "Executive Overview", exact: true })).toBeVisible();
  });

  test("is fully responsive with zero horizontal overflow on mobile viewports", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    // Open mobile navigation
    await page.getByRole("button", { name: /open navigation|menu/i }).click();
    await page.getByRole("button", { name: "Trip Efficiency", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Trip Efficiency & ETA Analytics", exact: true })).toBeVisible();

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const innerWidth = await page.evaluate(() => window.innerWidth);
    expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
  });
});
