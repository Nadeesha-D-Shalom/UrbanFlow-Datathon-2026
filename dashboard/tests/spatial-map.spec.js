import { test, expect } from "@playwright/test";

test("official taxi-zone map loads period intensity and cluster view", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Zone & Hotspots", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Zone & Hotspots", exact: true })).toBeVisible();
  await expect(page.getByRole("img", { name: /Morning taxi-zone pickup intensity map/ })).toBeVisible();
  await expect(page.locator(".taxi-zone-map path")).toHaveCount(263);
  await page.getByRole("button", { name: "Evening", exact: true }).click();
  await expect(page.getByRole("img", { name: /Evening taxi-zone pickup intensity map/ })).toBeVisible();
  await page.getByRole("button", { name: "Cluster view", exact: true }).click();
  await expect(page.getByRole("img", { name: /Evening taxi-zone movement cluster map/ })).toBeVisible();
  await expect(page.getByText(/official NYC TLC taxi zones joined by LocationID/)).toBeVisible();
});