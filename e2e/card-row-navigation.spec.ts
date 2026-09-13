import { expect, test, type Page } from '@playwright/test';

const addItem = async (page: Page, title: string) => {
  await page.getByRole('button', { name: 'New item' }).click();
  const drawer = page.getByRole('dialog', { name: 'New item' });
  await drawer.getByLabel('Title').fill(title);
  await drawer.getByRole('button', { name: 'In progress' }).click();
  await drawer.getByRole('button', { name: 'Save item' }).click();
  await expect(drawer).not.toBeVisible();
};

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    localStorage.setItem(
      'open-personal-tracking.preferences.v1',
      JSON.stringify({ onboardingCompleted: true }),
    );
  });
  await page.goto('/app-shell');
  await expect(page.getByRole('button', { name: 'New item' })).toBeVisible();
});

test('card controls preserve focus and native scrolling at boundaries', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (let i = 1; i <= 4; i++) await addItem(page, `Card ${i}`);
  const row = page.getByRole('region', { name: 'Up next', exact: true });
  const previous = page.getByRole('button', {
    name: 'Previous cards in Up next',
  });
  const next = page.getByRole('button', { name: 'Next cards in Up next' });
  await expect(previous).toBeDisabled();
  await expect(next).toBeEnabled();
  await next.focus();
  await page.keyboard.press('Enter');
  await expect
    .poll(() => row.evaluate((el) => el.scrollLeft))
    .toBeGreaterThan(0);
  await expect(previous).toBeEnabled();
  await expect(next).toBeFocused();
  await expect(next).toHaveCSS('outline-style', 'solid');
  for (let i = 0; i < 4; i++) await page.keyboard.press('Space');
  await expect(next).toBeDisabled();
  await expect(next).toBeFocused();
  await previous.focus();
  await page.keyboard.press('Space');
  await expect(next).toBeEnabled();
  await row.hover();
  await page.mouse.wheel(-2000, 0);
  await expect(previous).toBeDisabled();
  await row.focus();
  await page.keyboard.press('ArrowRight');
  await expect(previous).toBeEnabled();
});

test('controls follow overflow after resizing and filtering', async ({
  page,
}) => {
  const next = page.getByRole('button', { name: 'Next cards in Up next' });
  await expect(next).not.toBeVisible();
  await addItem(page, 'First card');
  await expect(next).not.toBeVisible();
  await addItem(page, 'Second card');
  await expect(next).toBeVisible();
  await page.setViewportSize({ width: 1600, height: 1000 });
  await expect(next).not.toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(next).toBeVisible();
  await page
    .getByPlaceholder('Search items, authors, tags…')
    .fill('First card');
  await expect(next).not.toBeVisible();
});

test('card buttons respect a changed reduced-motion preference', async ({
  page,
}) => {
  await addItem(page, 'First card');
  await addItem(page, 'Second card');
  const row = page.getByRole('region', { name: 'Up next', exact: true });
  const next = page.getByRole('button', { name: 'Next cards in Up next' });
  await row.evaluate((el) => {
    const scroll = el.scrollBy.bind(el);
    el.scrollBy = (options: ScrollToOptions | number, y?: number) => {
      if (typeof options === 'number') return scroll(options, y ?? 0);
      el.setAttribute('data-scroll-behavior', options.behavior ?? 'auto');
      scroll(options);
    };
  });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await next.click();
  await expect(row).toHaveAttribute('data-scroll-behavior', 'smooth');
  await expect(next).toBeDisabled();
  await row.evaluate((el) => el.scrollTo({ left: 0, behavior: 'instant' }));
  await expect(next).toBeEnabled();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await next.click();
  await expect(row).toHaveAttribute('data-scroll-behavior', 'instant');
  await expect(next).toBeDisabled();
});
