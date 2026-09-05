import {
  CURRENT_SCHEMA_VERSION,
  migrateArchiveSnapshot,
  parseArchiveSnapshot,
  type ArchiveSnapshot,
} from '../domain/archive.js';

export const BROWSER_ARCHIVE_DATABASE_NAME = 'open-personal-tracking';
export const BROWSER_ARCHIVE_STORE_NAME = 'archive';
export const BROWSER_ARCHIVE_RECORD_KEY = 'current';

type BrowserArchiveRecord = {
  key: typeof BROWSER_ARCHIVE_RECORD_KEY;
  snapshot: unknown;
};

const requestResult = <T>(request: IDBRequest<T>): Promise<T> => new Promise((resolve, reject) => {
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
});

const transactionComplete = (transaction: IDBTransaction): Promise<void> => new Promise((resolve, reject) => {
  transaction.oncomplete = () => resolve();
  transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB transaction was aborted'));
  transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB transaction failed'));
});

const openDatabase = (indexedDB: IDBFactory): Promise<IDBDatabase> => new Promise((resolve, reject) => {
  const request = indexedDB.open(BROWSER_ARCHIVE_DATABASE_NAME, 1);

  request.onupgradeneeded = () => {
    const database = request.result;
    if (!database.objectStoreNames.contains(BROWSER_ARCHIVE_STORE_NAME)) {
      database.createObjectStore(BROWSER_ARCHIVE_STORE_NAME, { keyPath: 'key' });
    }
  };
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error ?? new Error('Could not open browser archive storage'));
  request.onblocked = () => reject(new Error('Browser archive storage upgrade is blocked by another open tab'));
});

const migrateStoredSnapshot = (value: unknown): ArchiveSnapshot => {
  if (value && typeof value === 'object') {
    const schemaVersion = (value as Record<string, unknown>).schemaVersion;
    if (
      typeof schemaVersion === 'number'
      && Number.isInteger(schemaVersion)
      && schemaVersion > CURRENT_SCHEMA_VERSION
    ) {
      throw new Error(`Unsupported archive schema version: ${schemaVersion}`);
    }
  }

  return parseArchiveSnapshot(migrateArchiveSnapshot(value));
};

const storedSnapshot = (record: unknown): unknown => {
  if (!record || typeof record !== 'object' || !('snapshot' in record) || record.snapshot === undefined) {
    throw new Error('Stored browser archive record is malformed');
  }

  return record.snapshot;
};

/**
 * Browser infrastructure for the complete local archive. It intentionally stores
 * one snapshot so the persistence boundary stays aligned with export and restore.
 */
export class BrowserArchiveStore {
  private readonly indexedDB: IDBFactory;

  constructor(indexedDBFactory: IDBFactory | undefined = globalThis.indexedDB) {
    if (!indexedDBFactory) {
      throw new Error('IndexedDB is not available in this browser');
    }

    this.indexedDB = indexedDBFactory;
  }

  async load(): Promise<ArchiveSnapshot | null> {
    const database = await openDatabase(this.indexedDB);

    try {
      const transaction = database.transaction(BROWSER_ARCHIVE_STORE_NAME, 'readonly');
      const completed = transactionComplete(transaction);
      const request = transaction.objectStore(BROWSER_ARCHIVE_STORE_NAME).get(BROWSER_ARCHIVE_RECORD_KEY);
      const record = await requestResult(request) as BrowserArchiveRecord | undefined;
      await completed;

      return record ? migrateStoredSnapshot(storedSnapshot(record)) : null;
    } finally {
      database.close();
    }
  }

  async save(snapshot: ArchiveSnapshot): Promise<void> {
    const normalized = parseArchiveSnapshot(snapshot);
    const database = await openDatabase(this.indexedDB);

    try {
      const transaction = database.transaction(BROWSER_ARCHIVE_STORE_NAME, 'readwrite');
      const completed = transactionComplete(transaction);
      const request = transaction.objectStore(BROWSER_ARCHIVE_STORE_NAME).put({
        key: BROWSER_ARCHIVE_RECORD_KEY,
        snapshot: normalized,
      } satisfies BrowserArchiveRecord);
      await requestResult(request);
      await completed;
    } finally {
      database.close();
    }
  }

  async clear(): Promise<void> {
    const database = await openDatabase(this.indexedDB);

    try {
      const transaction = database.transaction(BROWSER_ARCHIVE_STORE_NAME, 'readwrite');
      const completed = transactionComplete(transaction);
      const request = transaction.objectStore(BROWSER_ARCHIVE_STORE_NAME).delete(BROWSER_ARCHIVE_RECORD_KEY);
      await requestResult(request);
      await completed;
    } finally {
      database.close();
    }
  }
}
