import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'open-personal-tracking.preferences.v1',
      JSON.stringify({ onboardingCompleted: true }),
    );
  });
});

test('shows explicit empty states for a new local archive', async ({
  page,
}) => {
  await page.goto('/app-shell');
  await page.getByRole('button', { name: 'Insights', exact: true }).click();

  await expect(
    page.getByRole('heading', { name: 'See your personal patterns' }),
  ).toBeVisible();
  await expect(
    page.getByText('No valid completion events yet.', { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByText('No ratings yet.', { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByText('Your archive has no categories yet.', { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByText('No analytics or network calls', { exact: true }),
  ).toBeVisible();
});
