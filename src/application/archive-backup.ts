import {
  parseArchiveSnapshot,
  restoreArchiveSnapshot,
  serializeArchiveSnapshot,
  type ArchiveSnapshot,
} from '../domain/archive.js';

/** Serializes a complete, validated archive without accessing browser storage. */
export const createArchiveBackup = (archive: ArchiveSnapshot): string =>
  serializeArchiveSnapshot(parseArchiveSnapshot(archive));

/**
 * Parses, migrates, and validates a backup before any caller can replace local
 * data. Future schemas are rejected rather than being coerced or discarded.
 */
export const prepareArchiveRestore = (backup: string): ArchiveSnapshot => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(backup) as unknown;
  } catch {
    throw new Error('Backup file is not valid JSON');
  }

  return restoreArchiveSnapshot(parsed);
};
