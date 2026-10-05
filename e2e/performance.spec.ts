import { expect, test } from '@playwright/test';

const preferencesKey = 'open-personal-tracking.preferences.v1';

const createPerformanceBackup = (itemCount: number): Buffer => {
  const timestamp = '2026-01-01T00:00:00.000Z';
  const items = Array.from({ length: itemCount }, (_, index) => ({
    id: `browser-performance-${index}`,
    type: index % 2 === 0 ? 'film' : 'book',
    title: `Browser performance item ${index}`,
    category: index % 2 === 0 ? 'Film' : 'Book',
    status: index % 3 === 0 ? 'completed' : 'in_progress',
    progress: { current: index % 100, target: 100, unit: 'percent' },
    notes: [`Synthetic note ${index}`],
    tags: index % 2 === 0 ? ['synthetic', 'watched'] : ['synthetic'],
    collections: [],
    createdAt: timestamp,
    updatedAt: timestamp,
    attributes: { fixture: true, position: index },
    externalIds: {},
    subunits: [],
  }));

  return Buffer.from(
    JSON.stringify({
      schemaVersion: 2,
      exportedAt: timestamp,
      items,
      collections: [],
      history: [],
      preferences: {
        displayName: '',
        locale: 'en',
        activities: [],
        favoriteGenres: [],
        placeholderCovers: true,
        onboardingCompleted: true,
      },
    }),
  );
};

test('keeps production startup, restore, and library search within browser budgets', async ({
  page,
}) => {
  await page.addInitScript((key) => {
    window.localStorage.setItem(
      key,
      JSON.stringify({ onboardingCompleted: true }),
    );
  }, preferencesKey);

  const startupStartedAt = Date.now();
  await page.goto('/app-shell');
  await expect(page.getByRole('button', { name: 'New item' })).toBeVisible();
  expect(Date.now() - startupStartedAt).toBeLessThan(10_000);

  await page
    .getByRole('navigation', { name: 'Secondary navigation' })
    .getByRole('button', { name: 'Import', exact: true })
    .click();
  const restoreStartedAt = Date.now();
  page.once('dialog', (dialog) => dialog.accept());
  await page
    .getByLabel('Select an Open Personal Tracking JSON backup')
    .setInputFiles({
      name: 'synthetic-performance-backup.json',
      mimeType: 'application/json',
      buffer: createPerformanceBackup(1_000),
    });
  await expect(page.getByText('Restored 1000 items from')).toBeVisible();
  expect(Date.now() - restoreStartedAt).toBeLessThan(10_000);

  await page
    .getByRole('navigation', { name: 'Primary navigation' })
    .getByRole('button', { name: /^Library/ })
    .first()
    .click();
  const searchStartedAt = Date.now();
  await page.getByLabel('Search your library').first().fill('item 999');
  await expect(
    page.getByRole('heading', { name: 'Browser performance item 999' }),
  ).toBeVisible();
  expect(Date.now() - searchStartedAt).toBeLessThan(2_000);
});
