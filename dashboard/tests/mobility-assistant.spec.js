import { test, expect } from '@playwright/test';
async function open(page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'AI Mobility Assistant', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'AI Mobility Assistant' })).toBeVisible();
}
async function ask(page, question) {
  await page.getByLabel('Your analytics question').fill(question);
  await page.getByRole('button', { name: 'Ask UrbanFlow', exact: true }).click();
}
test('assistant shows grounded chips, clarification, empty and unsupported states', async ({ page }) => {
  await open(page);
  await expect(page.getByRole('heading', { name: 'Where should we focus?' })).toBeVisible();
  await page.getByRole('button', { name: 'Busiest zones at night', exact: true }).click();
  await expect(page.locator('.assistant-answer').last()).toContainText('JFK Airport: 689,318 pickups');
  await expect(page.locator('.assistant-answer').last().locator('li')).toHaveCount(5);
  await ask(page, 'Best zones for drivers around 8?');
  await expect(page.locator('.assistant-clarification')).toContainText('AM or PM');
  await ask(page, 'Revenue on 2024-01-01');
  await expect(page.locator('.assistant-empty')).toContainText('No daily records');
  await ask(page, 'Tell me a joke');
  await expect(page.locator('.assistant-unsupported')).toBeVisible();
  await page.getByRole('button', { name: 'Clear conversation' }).click();
  await expect(page.locator('.assistant-answer')).toHaveCount(0);
});
test('prediction loading, error, and retry preserve the question', async ({ page }) => {
  let release;
  await page.route('**/api/fare/predict', async route => { await new Promise(resolve => { release = resolve; }); await route.fulfill({ status: 503, body: '{}' }); });
  await open(page);
  await ask(page, 'Fare from zone 161 to zone 132 tomorrow at 8 AM provider 1');
  await expect(page.getByRole('status')).toContainText('Checking UrbanFlow');
  await expect(page.getByLabel('Your analytics question')).toBeDisabled();
  await expect.poll(() => Boolean(release)).toBe(true); release();
  await expect(page.locator('.assistant-error')).toContainText('Source unavailable');
  await expect(page.getByRole('button', { name: 'Retry question' })).toBeVisible();
  await expect(page.getByLabel('Your analytics question')).toBeEnabled();
});
test('forecast outage is labeled and assistant fits a mobile screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('**/api/demand/forecast*', route => route.abort());
  await page.goto('/');
  const menu = page.getByRole('button', { name: /open.*menu|open.*navigation|open.*sidebar/i });
  if (await menu.count()) await menu.first().click();
  // App navigation is also reachable in desktop layout before testing mobile content.
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.getByRole('button', { name: 'AI Mobility Assistant', exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Peak demand tomorrow morning', exact: true }).click();
  await expect(page.locator('.assistant-answer')).toContainText('forecast service unavailable');
  await expect(page.locator('.assistant-answer')).toContainText('not a future forecast');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
