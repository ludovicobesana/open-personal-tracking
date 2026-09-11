import { expect, test, type Page } from '@playwright/test';

const APP_PATH = '/app-shell';
const ARCHIVE_DATABASE_NAME = 'open-personal-tracking';
const ONBOARDING_STORAGE_KEY = 'open-personal-tracking.preferences.v1';
const TITLE = 'Backup recovery fixture';

const itemInList = (page: Page, title: string) =>
  page
    .getByLabel('Item list')
    .getByRole('heading', { name: title, exact: true });

const completeOnboarding = async (page: Page): Promise<void> => {
  await page.addInitScript(
    ({ key }) => {
      window.localStorage.setItem(
        key,
        JSON.stringify({ onboardingCompleted: true }),
      );
    },
    { key: ONBOARDING_STORAGE_KEY },
  );
};

const addItem = async (page: Page, title = TITLE): Promise<void> => {
  await page.getByRole('button', { name: 'New item' }).click();
  const drawer = page.getByRole('dialog', { name: 'New item' });

  await drawer.getByLabel('Title').fill(title);
  await drawer.getByLabel('Description').fill('A local recovery fixture.');
  await drawer.getByLabel('Rating').fill('4.5');
  await drawer.getByLabel('Tags').fill('science fiction, favourite');
  await drawer.getByLabel('Collections').fill('recovery tests');
  await drawer
    .getByLabel('Private notes')
    .fill('Keep this note after restoring.');
  await drawer.getByRole('button', { name: 'In progress' }).click();
  await drawer.getByRole('button', { name: 'Save item' }).click();

  await expect(itemInList(page, title)).toBeVisible();
};

const openItemDetail = async (page: Page, title = TITLE): Promise<void> => {
  await itemInList(page, title).click();
  await expect(
    page.getByRole('complementary', { name: 'Selected item details' }),
  ).toBeVisible();
};

const clearArchive = async (page: Page): Promise<void> => {
  await page.evaluate(
    (databaseName) =>
      new Promise<void>((resolve, reject) => {
        const request = window.indexedDB.deleteDatabase(databaseName);
        request.onsuccess = () => resolve();
        request.onerror = () =>
          reject(request.error ?? new Error('Could not clear IndexedDB'));
        request.onblocked = () =>
          reject(new Error('IndexedDB is blocked by another open connection'));
      }),
    ARCHIVE_DATABASE_NAME,
  );
};

const openManagePage = (page: Page, name: 'Export' | 'Import') =>
  page
    .getByRole('navigation', { name: 'Secondary navigation' })
    .getByRole('button', { name, exact: true })
    .click();

const activateOfflineSupport = async (page: Page): Promise<void> => {
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await expect
    .poll(() =>
      page.evaluate(
        () => navigator.serviceWorker.controller?.state === 'activated',
      ),
    )
    .toBe(true);
};

test.beforeEach(async ({ page }) => {
  await completeOnboarding(page);
  await page.goto(APP_PATH);
  await expect(page.getByRole('button', { name: 'New item' })).toBeVisible();
});

test('exports, clears, and restores a complete local archive', async ({
  page,
}, testInfo) => {
  await addItem(page);
  await openItemDetail(page);
  await page.getByRole('button', { name: 'Open page' }).click();

  const progress = page.getByLabel('Adjust progress percentage');
  await progress.press('Home');
  await progress.press('ArrowRight');
  await expect(progress).toHaveValue('1');

  await page.reload();
  await expect(itemInList(page, TITLE)).toBeVisible();

  await openManagePage(page, 'Export');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export now' }).click();
  const download = await downloadPromise;
  const backupPath = testInfo.outputPath(download.suggestedFilename());
  await download.saveAs(backupPath);

  expect(download.suggestedFilename()).toMatch(
    /^open-personal-tracking-backup-.*\.json$/,
  );
  await expect(page.getByRole('status')).toHaveText(
    'Backup downloaded. Keep this file somewhere you control.',
  );

  await clearArchive(page);
  await page.reload();
  await expect(page.getByText('Nothing tracked yet')).toBeVisible();

  await openManagePage(page, 'Import');
  page.once('dialog', (dialog) => dialog.accept());
  await page.locator('input[type="file"]').setInputFiles(backupPath!);

  await expect(page.getByRole('status')).toHaveText(
    /^Restored 1 item from open-personal-tracking-backup-.*\.json\.$/,
  );

  await page
    .getByRole('navigation', { name: 'Primary navigation' })
    .getByRole('button', { name: /^Library/ })
    .first()
    .click();
  await openItemDetail(page);
  await page.getByRole('button', { name: 'Open page' }).click();
  await expect(page.getByLabel('Adjust progress percentage')).toHaveValue('1');
  await page.keyboard.press('Escape');
  await page
    .getByRole('complementary', { name: 'Selected item details' })
    .getByRole('button', { name: 'Edit' })
    .click();

  const drawer = page.getByRole('dialog', { name: 'New item' });
  await expect(drawer.getByLabel('Rating')).toHaveValue('4.5');
  await expect(drawer.getByLabel('Tags')).toHaveValue(
    'science fiction, favourite',
  );
  await expect(drawer.getByLabel('Collections')).toHaveValue('recovery tests');
  await expect(drawer.getByLabel('Private notes')).toHaveValue(
    'Keep this note after restoring.',
  );
});

test('keeps the existing archive when a backup file is invalid', async ({
  page,
}) => {
  await addItem(page, 'Existing archive item');
  await openManagePage(page, 'Import');
  await page.locator('input[type="file"]').setInputFiles({
    name: 'invalid-backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{ this is not JSON'),
  });

  await expect(page.getByText('Could not restore this backup')).toContainText(
    'Could not restore this backup. Your current local archive was not changed',
  );

  await page
    .getByRole('navigation', { name: 'Primary navigation' })
    .getByRole('button', { name: /^Library/ })
    .first()
    .click();
  await expect(itemInList(page, 'Existing archive item')).toBeVisible();
});

test('opens and restores local data while offline after its first visit', async ({
  page,
}, testInfo) => {
  await activateOfflineSupport(page);
  await page.context().setOffline(true);

  try {
    await page.reload();
    await expect(page.getByRole('button', { name: 'New item' })).toBeVisible();
    await expect(page.getByRole('status')).toHaveText(
      /You're offline.*Your library, changes, backups, and restores stay available on this device\./,
    );
    await page.getByRole('button', { name: 'Dismiss offline message' }).click();
    await expect(
      page.getByRole('button', { name: 'Show offline details' }),
    ).toBeVisible();
    const [offlineReminderBox, localSyncLabelBox] = await Promise.all([
      page.getByRole('button', { name: 'Show offline details' }).boundingBox(),
      page.getByText('Local sync', { exact: true }).boundingBox(),
    ]);
    expect(offlineReminderBox).not.toBeNull();
    expect(localSyncLabelBox).not.toBeNull();
    expect(
      offlineReminderBox!.y + offlineReminderBox!.height,
    ).toBeLessThanOrEqual(localSyncLabelBox!.y);
    await page.getByRole('button', { name: 'Show offline details' }).click();
    await addItem(page, 'Offline archive item');
    await openItemDetail(page, 'Offline archive item');
    await page
      .getByRole('complementary', { name: 'Selected item details' })
      .getByRole('button', { name: 'Edit' })
      .click();
    await page
      .getByRole('dialog', { name: 'New item' })
      .getByLabel('Description')
      .fill('Updated without a network connection.');
    await page
      .getByRole('dialog', { name: 'New item' })
      .getByRole('button', { name: 'Save item' })
      .click();
    await page
      .getByLabel('Search your library')
      .first()
      .fill('Offline archive item');
    await expect(itemInList(page, 'Offline archive item')).toBeVisible();

    await openManagePage(page, 'Export');
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export now' }).click();
    const download = await downloadPromise;
    const backupPath = testInfo.outputPath(download.suggestedFilename());
    await download.saveAs(backupPath);

    await clearArchive(page);
    await page.reload();
    await expect(page.getByText('Nothing tracked yet')).toBeVisible();

    await openManagePage(page, 'Import');
    page.once('dialog', (dialog) => dialog.accept());
    await page.locator('input[type="file"]').setInputFiles(backupPath);
    await expect(page.getByText(/^Restored 1 item from /)).toHaveText(
      /^Restored 1 item from open-personal-tracking-backup-.*\.json\.$/,
    );
    await page
      .getByRole('navigation', { name: 'Primary navigation' })
      .getByRole('button', { name: /^Library/ })
      .first()
      .click();
    await expect(itemInList(page, 'Offline archive item')).toBeVisible();
  } finally {
    await page.context().setOffline(false);
  }
});
