import { expect, test, type Page } from '@playwright/test';

const addItem = async (page: Page, title: string) => {
  await page.getByRole('button', { name: 'New item' }).click();
  const drawer = page.getByRole('dialog', { name: 'New item' });
  await drawer.getByLabel('Title').fill(title);
  await drawer.getByRole('button', { name: 'Save item' }).click();
  await expect(drawer).not.toBeVisible();
};

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.addInitScript(() =>
    localStorage.setItem(
      'open-personal-tracking.preferences.v1',
      JSON.stringify({ onboardingCompleted: true }),
    ),
  );
  await page.goto('/app-shell');
  await expect(page.getByRole('button', { name: 'New item' })).toBeVisible();
});

test('Enter submits global search from every primary screen', async ({
  page,
}) => {
  await addItem(page, 'Spiderman');
  await addItem(page, 'Other book');
  for (const screen of [
    'History',
    'Library',
    'Discover',
    'Profile',
    'Collections',
    'Import',
    'Export',
    'Settings',
  ]) {
    await page
      .locator('.sidebar')
      .getByRole('button', { name: new RegExp(`^${screen}`) })
      .click();
    const input = page.getByPlaceholder('Search items, authors, or tags…');
    await input.fill('Spiderman');
    await input.press('Enter');
    await expect(
      page.getByRole('heading', { name: 'Your tracked items' }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Your tracked items' }),
    ).toBeFocused();
    await expect(page.getByLabel('Item list')).toContainText('Spiderman');
    await expect(page.getByLabel('Item list')).not.toContainText('Other book');
  }
});

test('submit searches every category and supports replacing and clearing a missing query', async ({
  page,
}) => {
  await addItem(page, 'Spiderman');
  await page.getByRole('button', { name: 'Film', exact: true }).click();
  await page
    .locator('.sidebar')
    .getByRole('button', { name: 'History', exact: true })
    .click();
  const search = page.getByRole('search', { name: 'Library search' });
  const input = search.getByRole('searchbox');
  await input.fill('Missing title');
  await search
    .getByRole('button', { name: 'Search library', exact: true })
    .click();
  await expect(
    page.getByRole('status').filter({ hasText: 'No items match' }),
  ).toContainText('Missing title');
  await input.fill('Spiderman');
  await input.press('Enter');
  await expect(page.getByLabel('Item list')).toContainText('Spiderman');
  await input.fill('Missing title');
  await input.press('Enter');
  await search.getByRole('button', { name: 'Clear search' }).focus();
  await page.keyboard.press('Enter');
  await expect(input).toBeFocused();
  await expect(input).toHaveValue('');
  await expect(page.getByLabel('Item list')).toContainText('Spiderman');
});

test('empty global search submission leaves the current screen and category unchanged', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Film', exact: true }).click();
  await page
    .locator('.sidebar')
    .getByRole('button', { name: 'History', exact: true })
    .click();

  const search = page.getByRole('search', { name: 'Library search' });
  const input = search.getByRole('searchbox');
  await input.press('Enter');

  await expect(page.getByRole('heading', { name: 'History' })).toBeVisible();
  await expect(input).toBeFocused();

  await page
    .locator('.sidebar')
    .getByRole('button', { name: /^Library/ })
    .click();
  await expect(
    page.getByRole('button', { name: 'Film', exact: true }),
  ).toHaveClass(/is-selected/);
});

test('mobile search offers a labelled action and query-specific empty results', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const search = page.getByRole('search', { name: 'Library search' });
  await search.getByRole('searchbox').fill('Missing title');
  const submit = search.getByRole('button', {
    name: 'Search library',
    exact: true,
  });
  await expect(submit).toBeVisible();
  await submit.click();
  await expect(
    page.getByRole('heading', { name: 'Your tracked items' }),
  ).toBeFocused();
  await expect(
    page.getByRole('status').filter({ hasText: 'No items match' }),
  ).toContainText('Missing title');
  await search.getByRole('button', { name: 'Clear search' }).click();
  await expect(search.getByRole('searchbox')).toBeFocused();
  await expect(
    page.getByRole('heading', { name: 'Nothing tracked yet' }),
  ).toBeVisible();
});
