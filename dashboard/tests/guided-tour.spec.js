import { test, expect } from "@playwright/test";

test.describe("Guided Onboarding Tour (React Joyride)", () => {
  test.beforeEach(async ({ page }) => {
    page.on("console", (msg) => console.log("[BROWSER]", msg.text()));
    // Clear localStorage before each test
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
  });

  test("starts tour, verifies controls, and advances through multi-page route navigation", async ({ page }) => {
    await page.goto("/");

    // 1. Verify "Start Tour" button exists in header and starts the tour
    const startTourBtn = page.getByRole("button", { name: /start tour/i });
    await expect(startTourBtn.first()).toBeVisible();
    await startTourBtn.first().click();

    // 2. Verify Step 1 (Welcome Modal)
    const tooltip = page.locator(".urbanflow-tour-tooltip, div[role='alertdialog'], div.__floater__body");
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText("Welcome to UrbanFlow Analytics");
    await expect(tooltip).toContainText("1 of 10");

    // Verify controls exist: Next, Skip, Back (disabled or absent on step 1), Close
    const nextBtn = tooltip.locator(".tour-btn--primary");
    const skipBtn = tooltip.locator(".tour-btn--skip");
    const closeBtn = tooltip.locator(".tour-tooltip__close-btn");
    await expect(nextBtn).toBeVisible();
    await expect(skipBtn).toBeVisible();
    await expect(closeBtn).toBeVisible();

    // 3. Step 2: Executive Baseline Metrics (Overview)
    await nextBtn.click();
    await expect(tooltip).toContainText("Executive Baseline Metrics");
    await expect(tooltip).toContainText("2 of 10");
    await page.waitForTimeout(400);

    // 4. Step 3: Cross-route navigation to Fare & Revenue!
    await nextBtn.click();
    await expect(page.getByRole("heading", { name: "Fare & Revenue Analytics", exact: true })).toBeVisible({ timeout: 8000 });
    await expect(tooltip).toContainText("Base-Fare Revenue Analytics");
    await expect(tooltip).toContainText("3 of 10");
    await page.waitForTimeout(400);

    // 5. Step 4: Cross-route navigation to Trip Efficiency!
    await nextBtn.click();
    await expect(page.getByRole("heading", { name: "Trip Efficiency & ETA Analytics", exact: true })).toBeVisible({ timeout: 8000 });
    await expect(tooltip).toContainText("Trip Efficiency & Duration");
    await expect(tooltip).toContainText("4 of 10");
    await page.waitForTimeout(400);

    // 6. Test Back navigation across pages
    const backBtn = tooltip.locator(".tour-btn--back");
    await expect(backBtn).toBeVisible();
    await backBtn.click();

    // Should return to Step 3 on Fare & Revenue
    await expect(page.getByRole("heading", { name: "Fare & Revenue Analytics", exact: true })).toBeVisible({ timeout: 8000 });
    await expect(tooltip).toContainText("Base-Fare Revenue Analytics");
    await expect(tooltip).toContainText("3 of 10");
    await page.waitForTimeout(300);

    // 7. Test Skip Tour functionality
    await skipBtn.click();
    await expect(tooltip).not.toBeVisible();

    // Verify localStorage completion state
    const completed = await page.evaluate(() => localStorage.getItem("urbanflow-tour-completed"));
    expect(completed).toBe("true");

    // 8. Refresh page and verify tour does not auto-restart
    await page.reload();
    await expect(tooltip).not.toBeVisible();
    await expect(page.getByRole("heading", { name: "Executive Overview", exact: true })).toBeVisible();

    // 9. Restart tour manually from Header button
    await page.getByRole("button", { name: /start tour/i }).first().click();
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText("Welcome to UrbanFlow Analytics");
    await expect(tooltip).toContainText("1 of 10");

    // 10. Test Close button (X)
    await closeBtn.click();
    await expect(tooltip).not.toBeVisible();
  });

  test("can restart tour and advance to the final step to finish", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /start tour/i }).first().click();

    // Advance through the tour steps
    for (let i = 1; i <= 9; i++) {
      const nextBtn = page.locator(".tour-btn--primary");
      await expect(nextBtn).toBeVisible({ timeout: 5000 });
      await nextBtn.click();
      await page.waitForTimeout(500);
    }

    // Step 10: AI Mobility Assistant
    const tooltip = page.locator(".urbanflow-tour-tooltip, div[role='alertdialog'], div.__floater__body");
    await expect(tooltip).toContainText("10 of 10");
    const finishBtn = page.locator(".tour-btn--primary");
    await expect(finishBtn).toBeVisible();
    await expect(finishBtn).toContainText(/finish tour/i);
    await finishBtn.click();

    // Tooltip should be dismissed
    await expect(tooltip).not.toBeVisible();
    const completed = await page.evaluate(() => localStorage.getItem("urbanflow-tour-completed"));
    expect(completed).toBe("true");
  });

  test("runs safely on mobile viewport (390px) without overflow", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    // On mobile, start tour button in header
    const startTourBtn = page.getByRole("button", { name: /start tour/i });
    await expect(startTourBtn.first()).toBeVisible();
    await startTourBtn.first().click();

    // Tooltip renders
    const tooltip = page.locator(".urbanflow-tour-tooltip, div[role='alertdialog'], div.__floater__body");
    await expect(tooltip).toBeVisible();

    // Verify zero horizontal overflow on mobile
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth + 1;
    });
    expect(hasHorizontalOverflow).toBe(false);

    // Skip on mobile
    const skipBtn = tooltip.locator(".tour-btn--skip");
    await skipBtn.click();
    await expect(tooltip).not.toBeVisible();
  });
});
