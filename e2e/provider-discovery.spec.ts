import { expect, test } from '@playwright/test';

const tmdbSearchResponse = {
  page: 1,
  total_pages: 1,
  results: [
    {
      id: 11,
      media_type: 'movie',
      title: 'Star Wars',
      overview: 'A space opera',
      release_date: '1977-05-25',
      poster_path: '/poster.jpg',
    },
  ],
};

const tmdbDetailsResponse = {
  id: 11,
  title: 'Star Wars',
  overview: 'A space opera',
  release_date: '1977-05-25',
  original_title: 'Star Wars',
  original_language: 'en',
  poster_path: '/poster.jpg',
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'open-personal-tracking.preferences.v1',
      JSON.stringify({ onboardingCompleted: true }),
    );
  });
});

test('reviews mocked provider metadata before creating a durable local item', async ({
  page,
}) => {
  await page.route('https://api.themoviedb.org/**', async (route) => {
    const url = new URL(route.request().url());
    const body = url.pathname.endsWith('/search/multi')
      ? tmdbSearchResponse
      : tmdbDetailsResponse;
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(body),
    });
  });

  await page.goto('/app-shell');
  await page.getByRole('button', { name: 'New item', exact: true }).click();
  const drawer = page.getByRole('dialog', { name: 'New item' });

  await drawer.getByLabel('Search movies and TV').fill('Star Wars');
  await drawer.getByRole('button', { name: 'Search', exact: true }).click();
  await drawer.getByRole('button', { name: /Star Wars.*Film/ }).click();
  await expect(
    drawer.getByRole('heading', { name: 'Star Wars' }),
  ).toBeVisible();
  await expect(
    drawer.getByLabel('Use the provider image as this item’s remote cover'),
  ).not.toBeChecked();
  await drawer
    .getByRole('button', { name: 'Use metadata in item form' })
    .click();

  await expect(drawer.getByLabel('Title', { exact: true })).toHaveValue(
    'Star Wars',
  );
  await expect(drawer.getByLabel('Category')).toHaveValue('Film');
  await drawer.getByRole('button', { name: 'Save item' }).click();
  await expect(drawer).not.toBeVisible();
  await expect(
    page.getByText('Star Wars', { exact: true }).first(),
  ).toBeVisible();
  await expect(page.locator('[style*="image.tmdb.org"]')).toHaveCount(0);

  await page.reload();
  await expect(
    page.getByText('Star Wars', { exact: true }).first(),
  ).toBeVisible();
});

test('keeps manual creation available when provider search is unavailable', async ({
  page,
}) => {
  await page.route('https://api.themoviedb.org/**', (route) => route.abort());

  await page.goto('/app-shell');
  await page.getByRole('button', { name: 'New item', exact: true }).click();
  const drawer = page.getByRole('dialog', { name: 'New item' });

  await drawer.getByLabel('Search movies and TV').fill('Dune');
  await drawer.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(
    drawer
      .getByRole('region', { name: 'Find a film or series' })
      .getByRole('alert'),
  ).toContainText('temporarily unavailable');

  await drawer.getByLabel('Title', { exact: true }).fill('Manual Dune');
  await drawer.getByRole('button', { name: 'Save item' }).click();
  await expect(drawer).not.toBeVisible();
  await expect(
    page.getByText('Manual Dune', { exact: true }).first(),
  ).toBeVisible();
});
