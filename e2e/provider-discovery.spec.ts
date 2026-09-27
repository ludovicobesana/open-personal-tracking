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
  await page
    .getByRole('button', { name: 'Discover', exact: true })
    .first()
    .click();

  await page.getByLabel('Search TMDB films and series').fill('Star Wars');
  await page.getByRole('button', { name: 'Search TMDB', exact: true }).click();
  await page.getByRole('button', { name: 'Review Star Wars, Film' }).click();
  await expect(page.getByRole('heading', { name: 'Star Wars' })).toBeVisible();
  await expect(page.getByLabel('Show TMDB poster previews')).not.toBeChecked();
  await page.getByRole('button', { name: 'Add Star Wars to library' }).click();
  const drawer = page.getByRole('dialog', { name: 'New item' });

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
  await page
    .getByRole('button', { name: 'Discover', exact: true })
    .first()
    .click();

  await page.getByLabel('Search TMDB films and series').fill('Dune');
  await page.getByRole('button', { name: 'Search TMDB', exact: true }).click();
  await expect(
    page
      .getByRole('region', { name: 'Find your next film or series' })
      .getByRole('alert'),
  ).toContainText('temporarily unavailable');

  await page.getByRole('button', { name: 'Add manually', exact: true }).click();
  const drawer = page.getByRole('dialog', { name: 'New item' });
  await drawer.getByLabel('Title', { exact: true }).fill('Manual Dune');
  await drawer.getByRole('button', { name: 'Save item' }).click();
  await expect(drawer).not.toBeVisible();
  await expect(
    page.getByText('Manual Dune', { exact: true }).first(),
  ).toBeVisible();
});
