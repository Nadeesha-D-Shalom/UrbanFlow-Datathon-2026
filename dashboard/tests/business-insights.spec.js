import { test, expect } from "@playwright/test";

test.describe("Business Insights Dashboard Page", () => {
  test("navigates to Business Insights and validates all 6 verified strategic insights", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Business Insights", exact: true }).click();

    // Verify page heading
    await expect(page.getByRole("heading", { name: "Business & Operational Insights", exact: true })).toBeVisible();

    // Verify Baseline KPIs
    const kpis = page.locator(".kpi-grid");
    await expect(kpis).toBeVisible();
    await expect(kpis).toContainText("$918.3M");
    await expect(kpis).toContainText("$20.73");
    await expect(kpis).toContainText("18.1 min");
    await expect(kpis).toContainText("70.95%");

    // Verify 6 Insight Cards initially rendered
    const cards = page.locator(".insight-card");
    await expect(cards).toHaveCount(6);

    // Verify Problem / Evidence / Action structure on each card
    for (let i = 0; i < 6; i++) {
      const card = cards.nth(i);
      await expect(card.locator(".block-problem")).toBeVisible();
      await expect(card.locator(".block-problem .block-label")).toContainText("Problem");

      await expect(card.locator(".block-evidence")).toBeVisible();
      await expect(card.locator(".block-evidence .block-label")).toContainText("Verified Evidence");

      await expect(card.locator(".block-action")).toBeVisible();
      await expect(card.locator(".block-action .block-label")).toContainText("Business Action");
    }

    // Verify specific domain insights and verified evidence
    // 1. Midday congestion deficit vs evening volume
    await expect(page.locator(".insight-card").filter({ hasText: "Midday Speed Deficit" })).toContainText("19.97 min");
    await expect(page.locator(".insight-card").filter({ hasText: "Midday Speed Deficit" })).toContainText("28.8% slower");

    // 2. Spatial concentration
    await expect(page.locator(".insight-card").filter({ hasText: "Core Manhattan Spatial Concentration" })).toContainText("10.2M pickups");
    await expect(page.locator(".insight-card").filter({ hasText: "Core Manhattan Spatial Concentration" })).toContainText(">23% of citywide demand");

    // 3. Upfront fare pricing
    await expect(page.locator(".insight-card").filter({ hasText: "Pre-Trip Upfront Pricing Feasibility" })).toContainText("96.0%");
    await expect(page.locator(".insight-card").filter({ hasText: "Pre-Trip Upfront Pricing Feasibility" })).toContainText("$4.39 MAE");

    // 4. Airport deadhead
    await expect(page.locator(".insight-card").filter({ hasText: "Airport Corridor Return-Trip Deadhead Risk" })).toContainText("Rate Class 2");
    await expect(page.locator(".insight-card").filter({ hasText: "Airport Corridor Return-Trip Deadhead Risk" })).toContainText("47.3% feature importance");

    // 5. ETA confidence windows
    await expect(page.locator(".insight-card").filter({ hasText: "5-Minute Arrival Confidence Windows" })).toContainText("70.95% accuracy within ±5 minutes");
    await expect(page.locator(".insight-card").filter({ hasText: "5-Minute Arrival Confidence Windows" })).toContainText("4.53 min");

    // 6. Midweek revenue vs weekend
    await expect(page.locator(".insight-card").filter({ hasText: "Midweek Revenue Peak" })).toContainText("$2.74M/day");
    await expect(page.locator(".insight-card").filter({ hasText: "Midweek Revenue Peak" })).toContainText("$21.45");

    // Test Domain Filter Tabs
    const filterPills = page.locator(".filter-pill");

    // Demand filter
    await page.getByRole("tab", { name: "Demand & Operations (1)" }).click();
    await expect(page.locator(".insight-card")).toHaveCount(1);
    await expect(page.locator(".insight-card")).toContainText("Midday Speed Deficit");

    // Spatial filter
    await page.getByRole("tab", { name: "Spatial & OD Flows (2)" }).click();
    await expect(page.locator(".insight-card")).toHaveCount(2);

    // Fare filter
    await page.getByRole("tab", { name: "Fare & Revenue (2)" }).click();
    await expect(page.locator(".insight-card")).toHaveCount(2);

    // ETA filter
    await page.getByRole("tab", { name: "ETA & Dispatch (1)" }).click();
    await expect(page.locator(".insight-card")).toHaveCount(1);

    // Back to All
    await page.getByRole("tab", { name: "All Insights (6)" }).click();
    await expect(page.locator(".insight-card")).toHaveCount(6);

    // Test Quick Navigation Footer
    await page.getByRole("button", { name: "Fare & Revenue Analytics →" }).click();
    await expect(page.getByRole("heading", { name: "Fare & Revenue Analytics", exact: true })).toBeVisible();
  });

  test("renders cleanly on mobile viewport (390px) without horizontal overflow", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    // Open mobile sidebar
    const toggleBtn = page.getByRole("button", { name: /open navigation|toggle navigation|menu/i });
    if (await toggleBtn.isVisible()) {
      await toggleBtn.click();
    }
    await page.getByRole("button", { name: "Business Insights", exact: true }).click();

    // Verify page rendered
    await expect(page.getByRole("heading", { name: "Business & Operational Insights", exact: true })).toBeVisible();

    // Verify zero horizontal overflow
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth + 1;
    });
    expect(hasHorizontalOverflow).toBe(false);
  });
});
