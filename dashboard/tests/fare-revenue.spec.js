import { test, expect } from "@playwright/test";

test.describe("Fare & Revenue Dashboard Page", () => {
  test("navigates to Fare & Revenue and validates all required metrics, cards, and charts", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Fare & Revenue", exact: true }).click();

    // Verify page title and heading
    await expect(page.getByRole("heading", { name: "Fare & Revenue Analytics", exact: true })).toBeVisible();

    // Verify dataset scope banner
    const scopeBanner = page.locator(".fare-scope-banner");
    await expect(scopeBanner).toBeVisible();
    await expect(scopeBanner).toContainText("BASE FARE ONLY");
    await expect(scopeBanner).toContainText("44,286,676 trips");

    // 1. Verify 4 Required KPI Cards
    const kpis = page.locator(".kpi-grid");
    await expect(kpis).toBeVisible();
    await expect(kpis).toContainText("Total Base-Fare Revenue");
    await expect(kpis).toContainText("$918.3M");
    await expect(kpis).toContainText("Excludes tips, tolls & charges");

    await expect(kpis).toContainText("Average Base Fare");
    await expect(kpis).toContainText("$20.73");

    await expect(kpis).toContainText("Final Decision Tree Test MAE");
    await expect(kpis).toContainText("4.3861");

    await expect(kpis).toContainText("Final Decision Tree Test R²");
    await expect(kpis).toContainText("0.7579");

    // 2. Verify Final Decision Tree Model Performance (Unseen Test Set)
    const testCard = page.locator(".test-metrics-card");
    await expect(testCard).toBeVisible();
    await expect(testCard.locator(".test-badge")).toContainText("FINAL UNSEEN TEST SET");
    await expect(testCard.locator(".test-metric-box").filter({ hasText: "Test MAE" })).toContainText("4.3861");
    await expect(testCard.locator(".test-metric-box").filter({ hasText: "Test RMSE" })).toContainText("8.7595");
    await expect(testCard.locator(".test-metric-box").filter({ hasText: "Test R²" })).toContainText("0.7579");
    await expect(testCard).toContainText("vs 4.5585 validation MAE");

    // 3. Verify Feature Importance Chart
    const featureChart = page.locator(".feature-bars-chart");
    await expect(featureChart).toBeVisible();
    await expect(featureChart).toContainText("rate_class_id");
    await expect(featureChart).toContainText("0.473");
    await expect(featureChart).toContainText("47.3%");

    await expect(featureChart).toContainText("origin_loc_id");
    await expect(featureChart).toContainText("0.256");

    await expect(featureChart).toContainText("dest_loc_id");
    await expect(featureChart).toContainText("0.230");

    await expect(featureChart).toContainText("pickup_hour");
    await expect(featureChart).toContainText("0.016869");

    await expect(featureChart).toContainText("pickup_month");
    await expect(featureChart).toContainText("0.010");

    await expect(featureChart).toContainText("pickup_day_of_week");
    await expect(featureChart).toContainText("0.007");

    await expect(featureChart).toContainText("provider_code");
    await expect(featureChart).toContainText("0.003");

    await expect(featureChart).toContainText("rider_count");
    await expect(featureChart).toContainText("0.002");

    await expect(featureChart).toContainText("is_weekend");
    await expect(featureChart).toContainText("0.001");

    // Verify impurity disclaimer note
    const note = page.locator(".feature-clarification-note");
    await expect(note).toBeVisible();
    await expect(note).toContainText("Impurity-based", { ignoreCase: true });
    await expect(note).toContainText("96.0%");

    // 4. Verify Model Architecture & Governance
    const governance = page.locator(".governance-card");
    await expect(governance).toBeVisible();
    await expect(governance).toContainText("DecisionTreeRegressor");
    await expect(governance).toContainText("base_fare");
    await expect(governance).toContainText("Untouched March 2026 partition");
    await expect(governance.locator(".leakage-governance-box")).toContainText("Pre-Trip Input Boundaries");
    await expect(governance.locator(".leakage-governance-box")).toContainText("Excludes post-trip metered distance");

    // 5. Verify Revenue Analytics
    const revSection = page.locator(".revenue-monthly-container");
    await expect(revSection).toBeVisible();
    await expect(revSection.locator(".revenue-summary-table")).toBeVisible();
    await expect(revSection.locator(".revenue-summary-table tfoot")).toContainText("365");
    await expect(revSection.locator(".revenue-summary-table tfoot")).toContainText("44,286,676");
    await expect(revSection.locator(".revenue-summary-table tfoot")).toContainText("$918.28M");
    await expect(revSection.locator(".revenue-summary-table tfoot")).toContainText("$20.73");

    // Test Day-of-Week toggle
    await page.getByRole("button", { name: "Day of Week Profile" }).click();
    const dowSection = page.locator(".revenue-dow-container");
    await expect(dowSection).toBeVisible();
    await expect(dowSection).toContainText("Thursday leads average daily revenue");
    await expect(dowSection).toContainText("Sunday exhibits the highest average base fare");

    // 6. Verify Business Takeaways
    const takeaways = page.locator(".takeaways-section");
    await expect(takeaways).toBeVisible();
    await expect(takeaways).toContainText("Pre-Trip Pricing Feasibility");
    await expect(takeaways).toContainText("Unseen Test Set Generalization");
    await expect(takeaways).toContainText("Predictable Base-Fare Economics");
    await expect(takeaways).toContainText("Rate-Code Sensitivity");

    // Verify navigation back to Overview
    await page.getByRole("button", { name: "Back to Overview →" }).click();
    await expect(page.getByRole("heading", { name: "Executive Overview", exact: true })).toBeVisible();
  });

  test("is fully responsive with zero horizontal overflow on mobile viewports", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    // Open mobile sidebar
    await page.getByRole("button", { name: /open navigation|menu/i }).click();
    await page.getByRole("button", { name: "Fare & Revenue", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Fare & Revenue Analytics", exact: true })).toBeVisible();

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const innerWidth = await page.evaluate(() => window.innerWidth);
    expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
  });
});
