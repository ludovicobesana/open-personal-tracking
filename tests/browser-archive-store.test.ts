import { describe, expect, it } from 'vitest';

import { createEmptyArchive, createItem } from '../src/domain/archive.js';
import {
  BROWSER_ARCHIVE_RECORD_KEY,
  BROWSER_ARCHIVE_STORE_NAME,
  BrowserArchiveStore,
} from '../src/storage/browser-archive-store.js';

class TestRequest<T> {
  result!: T;
  error: DOMException | null = null;
  onsuccess: ((event: Event) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  succeed(result: T): void {
    this.result = result;
    queueMicrotask(() => this.onsuccess?.(new Event('success')));
  }
}

class TestTransaction {
  error: DOMException | null = null;
  oncomplete: ((event: Event) => void) | null = null;
  onabort: ((event: Event) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  constructor(private readonly records: Map<string, unknown>) {}

  objectStore(): { get: (key: string) => TestRequest<unknown>; put: (value: { key: string }) => TestRequest<IDBValidKey>; delete: (key: string) => TestRequest<undefined> } {
    return {
      get: (key) => this.run(() => this.records.get(key)),
      put: (value) => this.run(() => {
        this.records.set(value.key, structuredClone(value));
        return value.key;
      }),
      delete: (key) => this.run(() => {
        this.records.delete(key);
        return undefined;
      }),
    };
  }

  private run<T>(operation: () => T): TestRequest<T> {
    const request = new TestRequest<T>();
    queueMicrotask(() => {
      request.succeed(operation());
      queueMicrotask(() => this.oncomplete?.(new Event('complete')));
    });
    return request;
  }
}

class TestDatabase {
  readonly objectStoreNames: { contains: (name: string) => boolean };
  private hasArchiveStore = false;
  private readonly records = new Map<string, unknown>();

  constructor() {
    this.objectStoreNames = { contains: (name) => name === BROWSER_ARCHIVE_STORE_NAME && this.hasArchiveStore };
  }

  createObjectStore(): void {
    this.hasArchiveStore = true;
  }

  transaction(): TestTransaction {
    return new TestTransaction(this.records);
  }

  close(): void {}

  seed(value: unknown): void {
    this.records.set(BROWSER_ARCHIVE_RECORD_KEY, { key: BROWSER_ARCHIVE_RECORD_KEY, snapshot: value });
  }

  rawValue(): unknown {
    return this.records.get(BROWSER_ARCHIVE_RECORD_KEY);
  }
}

class TestIndexedDbFactory {
  private readonly database = new TestDatabase();
  private opened = false;

  open(): TestRequest<TestDatabase> & { onupgradeneeded: ((event: IDBVersionChangeEvent) => void) | null; onblocked: ((event: Event) => void) | null } {
    const request = new TestRequest<TestDatabase>() as TestRequest<TestDatabase> & {
      onupgradeneeded: ((event: IDBVersionChangeEvent) => void) | null;
      onblocked: ((event: Event) => void) | null;
    };
    request.onupgradeneeded = null;
    request.onblocked = null;
    request.result = this.database;

    queueMicrotask(() => {
      if (!this.opened) {
        this.opened = true;
        request.onupgradeneeded?.(new Event('upgradeneeded') as IDBVersionChangeEvent);
      }
      request.succeed(this.database);
    });

    return request;
  }

  seed(value: unknown): void {
    this.database.seed(value);
  }

  rawValue(): unknown {
    return this.database.rawValue();
  }
}

const createStore = (factory: TestIndexedDbFactory): BrowserArchiveStore =>
  new BrowserArchiveStore(factory as unknown as IDBFactory);

describe('browser archive storage', () => {
  it('persists the complete archive across store instances', async () => {
    const factory = new TestIndexedDbFactory();
    const archive = createEmptyArchive();
    archive.preferences = { displayName: 'Ludo', locale: 'it', activities: ['books'], favoriteGenres: ['science fiction'], placeholderCovers: false, onboardingCompleted: true };
    archive.items.push(createItem({
      title: 'Dune',
      category: 'book',
      progress: { current: 184, target: 688, unit: 'pages' },
      notes: ['Strong worldbuilding'],
      tags: ['classic'],
      collections: ['favorites'],
    }));
    archive.collections.push({
      id: 'favorites', name: 'Favorites', createdAt: archive.exportedAt, updatedAt: archive.exportedAt, itemIds: [archive.items[0].id],
    });
    archive.history.push({ id: 'created-dune', itemId: archive.items[0].id, action: 'created', timestamp: archive.exportedAt, summary: 'Added Dune' });

    await createStore(factory).save(archive);
    const restored = await createStore(factory).load();

    expect(restored).toEqual(archive);
  });

  it('migrates legacy snapshots before exposing them', async () => {
    const factory = new TestIndexedDbFactory();
    factory.seed({
      title: 'ignored at archive level',
      items: [{ title: 'Dune', category: 'book', progress: { current: 184, unit: 'pages' } }],
    });

    const restored = await createStore(factory).load();

    expect(restored?.schemaVersion).toBe(1);
    expect(restored?.items[0]).toMatchObject({ title: 'Dune', category: 'book', progress: { current: 184, unit: 'pages' } });
  });

  it('does not replace a valid archive when a new snapshot is invalid', async () => {
    const factory = new TestIndexedDbFactory();
    const store = createStore(factory);
    const archive = createEmptyArchive();
    archive.items.push(createItem({ title: 'Dune', category: 'book', progress: { current: 0, unit: 'pages' } }));
    await store.save(archive);

    await expect(store.save({ ...archive, items: [{ title: 'Invalid item' }] } as unknown as typeof archive)).rejects.toThrow();

    await expect(store.load()).resolves.toEqual(archive);
  });

  it('rejects an unsupported stored schema without modifying it', async () => {
    const factory = new TestIndexedDbFactory();
    const unsupported = { schemaVersion: 2, exportedAt: new Date().toISOString(), items: [], collections: [], history: [] };
    factory.seed(unsupported);

    await expect(createStore(factory).load()).rejects.toThrow('Unsupported archive schema version: 2');
    expect(factory.rawValue()).toEqual({ key: BROWSER_ARCHIVE_RECORD_KEY, snapshot: unsupported });
  });

  it('clears the stored archive', async () => {
    const factory = new TestIndexedDbFactory();
    const store = createStore(factory);
    await store.save(createEmptyArchive());

    await store.clear();

    await expect(store.load()).resolves.toBeNull();
  });
});
