import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { createEmptyArchive, createItem } from '../src/domain/archive.js';
import {
  clearArchiveSnapshot,
  exportArchiveBackup,
  loadArchiveSnapshot,
  restoreArchiveBackup,
  saveArchiveSnapshot,
} from '../src/storage/archive-store.js';

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs) {
    rmSync(dir, { recursive: true, force: true });
  }
  tempDirs.length = 0;
});

describe('archive storage', () => {
  it('persists and restores a valid archive snapshot', async () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'opt-archive-'));
    tempDirs.push(dir);

    const archive = createEmptyArchive();
    archive.items.push(
      createItem({
        title: 'Dune',
        category: 'book',
        status: 'in_progress',
        progress: {
          current: 184,
          target: 688,
          unit: 'pages',
        },
        notes: ['Strong worldbuilding'],
        tags: ['classic'],
        collections: ['favorites'],
        attributes: {
          author: 'Frank Herbert',
        },
      }),
    );

    const filePath = path.join(dir, 'archive.json');
    await saveArchiveSnapshot(archive, filePath);
    const restored = await loadArchiveSnapshot(filePath);

    expect(restored.schemaVersion).toBe(archive.schemaVersion);
    expect(restored.items).toHaveLength(1);
    expect(restored.items[0].title).toBe('Dune');
    expect(restored.items[0].status).toBe('in_progress');
    expect(restored.items[0].attributes).toEqual({ author: 'Frank Herbert' });
    expect(JSON.parse(readFileSync(filePath, 'utf8')).schemaVersion).toBe(1);
  });

  it('exports a backup file and restores it after clearing local state', async () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'opt-backup-'));
    tempDirs.push(dir);

    const archive = createEmptyArchive();
    archive.items.push(
      createItem({
        title: 'The Left Hand of Darkness',
        category: 'book',
        status: 'completed',
        progress: {
          current: 1,
          target: 1,
          unit: 'book',
        },
        rating: 5,
      }),
    );

    const archivePath = path.join(dir, 'archive.json');
    const backupPath = path.join(dir, 'backup.json');

    await saveArchiveSnapshot(archive, archivePath);
    await exportArchiveBackup(archive, backupPath);
    await clearArchiveSnapshot(archivePath);

    const restored = await restoreArchiveBackup(backupPath);

    expect(restored.items).toHaveLength(1);
    expect(restored.items[0].title).toBe('The Left Hand of Darkness');
  });
});
