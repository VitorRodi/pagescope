import { test, expect } from '@playwright/test';
import { fixture } from '../fixture';

test('explores an explicitly labeled example, filters requests and downloads a share card', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Explore example' }).click();
  await expect(page.getByText('Illustrative example', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Where the weight comes from' })).toBeVisible();
  await page.getByLabel('Filter requests').fill('hero');
  await expect(page.locator('.request-row')).toHaveCount(1);
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export PNG card' }).click();
  expect((await download).suggestedFilename()).toBe('pagescope-example.png');
});

test('imports a real-format report and compares a second run without uploading files', async ({
  page,
}) => {
  await page.goto('/');
  await page
    .getByLabel('Import Lighthouse JSON')
    .setInputFiles({
      name: 'before.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(fixture())),
    });
  await expect(page.getByText('Imported report', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Set as baseline' }).click();
  const after = fixture();
  after.audits['largest-contentful-paint'].numericValue = 2400;
  await page
    .getByLabel('Import Lighthouse JSON')
    .setInputFiles({
      name: 'after.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(after)),
    });
  await expect(page.getByRole('heading', { name: 'Before → after' })).toBeVisible();
  await expect(page.getByTestId('lcp-delta')).toHaveText('-1.20 s');
});

test('explains quota failures and keeps the API key out of browser storage', async ({ page }) => {
  await page.route('https://www.googleapis.com/**', (route) =>
    route.fulfill({ status: 429, json: { error: { message: 'Quota exceeded' } } }),
  );
  await page.goto('/');
  await page.getByLabel('Website URL').fill('https://example.com');
  await page.getByText('API key & how this works', { exact: true }).click();
  await page.getByLabel('Your PageSpeed API key (optional)').fill('test-key-not-a-secret');
  await page.getByRole('button', { name: 'Analyze website' }).click();
  await expect(page.getByRole('alert')).toContainText('quota');
  expect(await page.evaluate(() => localStorage.length + sessionStorage.length)).toBe(0);
});

test('renders a successful API response and sends the selected device', async ({ page }) => {
  let requested = '';
  await page.route('https://www.googleapis.com/**', (route) => {
    requested = route.request().url();
    return route.fulfill({ json: { lighthouseResult: fixture() } });
  });
  await page.goto('/');
  await page.getByLabel('Website URL').fill('https://example.com/?a=1&b=2');
  await page.getByLabel('Test device').selectOption('desktop');
  await page.getByRole('button', { name: 'Analyze website' }).click();
  await expect(page.getByText('PageSpeed Insights', { exact: true })).toBeVisible();
  expect(new URL(requested).searchParams.get('strategy')).toBe('desktop');
  expect(new URL(requested).searchParams.get('url')).toBe('https://example.com/?a=1&b=2');
});

test('mobile layout fits the viewport and invalid imports produce a useful error', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Explore example' }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page
    .getByLabel('Import Lighthouse JSON')
    .setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{}') });
  await expect(page.getByRole('alert')).toContainText('Lighthouse');
});
