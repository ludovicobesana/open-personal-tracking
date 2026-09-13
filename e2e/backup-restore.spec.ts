import { expect, test, type Page } from '@playwright/test';

const APP_PATH = '/app-shell';
const ARCHIVE_DATABASE_NAME = 'open-personal-tracking';
const ONBOARDING_STORAGE_KEY = 'open-personal-tracking.preferences.v1';
const TITLE = 'Backup recovery fixture';

const storedZip = (entries: Array<{ name: string; text: string }>): Buffer => {
  let offset = 0;
  const localEntries: Buffer[] = [];
  const centralEntries: Buffer[] = [];

  for (const entry of entries) {
    const name = Buffer.from(entry.name);
    const content = Buffer.from(entry.text);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt32LE(content.length, 18);
    local.writeUInt32LE(content.length, 22);
    local.writeUInt16LE(name.length, 26);
    localEntries.push(Buffer.concat([local, name, content]));

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt32LE(content.length, 20);
    central.writeUInt32LE(content.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(offset, 42);
    centralEntries.push(Buffer.concat([central, name]));
    offset += localEntries.at(-1)!.length;
  }

  const directory = Buffer.concat(centralEntries);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...localEntries, directory, end]);
};

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
  await page
    .getByLabel('Select an Open Personal Tracking JSON backup')
    .setInputFiles(backupPath!);

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
  await page
    .getByLabel('Select an Open Personal Tracking JSON backup')
    .setInputFiles({
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

test('previews and imports a TV Time GDPR ZIP export locally', async ({
  page,
}) => {
  await openManagePage(page, 'Import');
  await expect(page.getByAltText('TV Time')).toBeVisible();
  await page.getByLabel('Select TV Time ZIP or CSV files').setInputFiles({
    name: 'tv-time-gdpr-export.zip',
    mimeType: 'application/zip',
    buffer: storedZip([
      {
        name: 'user_tv_show_data.csv',
        text: 'user_id,tv_show_id,is_followed,is_favorited,nb_episodes_seen,tv_show_name\nuser-1,show-7,1,0,4,TV Time fixture\n',
      },
      {
        name: 'seen_episode_latest.csv',
        text: 'user_id,episode_id,created_at,tv_show_name,episode_season_number,episode_number\nuser-1,episode-7,2025-01-01T12:00:00.000Z,TV Time fixture,1,4\n',
      },
    ]),
  });

  await expect(
    page.getByRole('heading', { name: 'Review TV Time import' }),
  ).toBeVisible();
  await expect(page.getByText('1 item', { exact: true })).toBeVisible();
  await expect(page.getByText('1 across 1 season')).toBeVisible();
  await page.getByRole('button', { name: 'Confirm import' }).click();
  const importFeedback = page.getByRole('status').filter({
    hasText: 'TV Time import complete',
  });
  await expect(importFeedback).toContainText(
    '1 item was saved to this device.',
  );
  await importFeedback
    .getByRole('button', { name: 'Dismiss TV Time import notification' })
    .click();
  await expect(importFeedback).toBeHidden();

  await page
    .getByRole('navigation', { name: 'Primary navigation' })
    .getByRole('button', { name: /^Library/ })
    .first()
    .click();
  await expect(itemInList(page, 'TV Time fixture')).toBeVisible();
  await itemInList(page, 'TV Time fixture').click();
  await expect(page.getByText('Season 1', { exact: true })).toBeVisible();
  await expect(page.getByText('E4 · Episode 4')).toBeVisible();
});

test('creates a series with season and episode details', async ({ page }) => {
  await page.getByRole('button', { name: 'New item' }).click();
  const drawer = page.getByRole('dialog', { name: 'New item' });
  await drawer.getByLabel('Title').fill('Series fixture');
  await drawer.getByLabel('Category').selectOption('Series');
  await drawer.getByRole('button', { name: 'Add season' }).click();
  await drawer.getByLabel('Season 1 title').fill('Season 1');
  await drawer
    .getByLabel('Season 1 information')
    .fill('A private season description.');
  await drawer
    .getByLabel('Season 1 image URL')
    .fill('https://example.test/season-1.jpg');
  await drawer.getByLabel('Episode 1 title').fill('First episode');
  await drawer
    .getByLabel('Episode 1 information')
    .fill('A private episode description.');
  await drawer
    .getByLabel('Episode 1 image URL')
    .fill('https://example.test/episode-1.jpg');
  await drawer.getByRole('button', { name: 'Add episode' }).click();
  await drawer.getByLabel('Episode 2 title').fill('Second episode');
  await drawer.getByLabel('Watched').first().check();
  await drawer.getByRole('button', { name: 'Save item' }).click();

  await expect(itemInList(page, 'Series fixture')).toBeVisible();
  await itemInList(page, 'Series fixture').click();
  await expect(page.getByText('Season 1', { exact: true })).toBeVisible();
  await expect(page.getByText('E1 · First episode')).toBeVisible();
  await page.getByRole('button', { name: 'Open page' }).click();
  await expect(
    page
      .getByRole('dialog', { name: 'Series fixture' })
      .getByText('A private season description.'),
  ).toBeVisible();
  await page
    .getByRole('button', {
      name: 'Open Season 1, episode 1, First episode',
    })
    .click();
  await expect(page.getByText('A private episode description.')).toBeVisible();
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
    await page
      .getByLabel('Select an Open Personal Tracking JSON backup')
      .setInputFiles(backupPath);
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
    if (!page.isClosed()) {
      await page.context().setOffline(false);
    }
  }
});
