import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

import {
  parseArchiveSnapshot,
  serializeArchiveSnapshot,
  type ArchiveSnapshot,
} from '../domain/archive.js';

const sanitizeForStorage = <T>(value: T): T => {
  if (Array.isArray(value)) {
    return value
      .map((item) => sanitizeForStorage(item))
      .filter((item) => item !== undefined) as T;
  }

  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, nestedValue]) => nestedValue !== undefined)
      .map(([key, nestedValue]) => [key, sanitizeForStorage(nestedValue)] as const);

    return Object.fromEntries(entries) as T;
  }

  return value;
};

const ensureParentDirectory = async (filePath: string): Promise<void> => {
  await mkdir(path.dirname(filePath), { recursive: true });
};

export const saveArchiveSnapshot = async (
  snapshot: ArchiveSnapshot,
  filePath: string,
): Promise<void> => {
  const normalized = parseArchiveSnapshot(snapshot);
  normalized.exportedAt = new Date().toISOString();

  await ensureParentDirectory(filePath);
  await writeFile(filePath, serializeArchiveSnapshot(sanitizeForStorage(normalized)), 'utf8');
};

export const loadArchiveSnapshot = async (filePath: string): Promise<ArchiveSnapshot> => {
  const raw = await readFile(filePath, 'utf8');
  const parsed = JSON.parse(raw) as unknown;

  return parseArchiveSnapshot(parsed);
};

export const exportArchiveBackup = async (
  snapshot: ArchiveSnapshot,
  filePath: string,
): Promise<void> => {
  await saveArchiveSnapshot(snapshot, filePath);
};

export const restoreArchiveBackup = async (filePath: string): Promise<ArchiveSnapshot> => {
  return loadArchiveSnapshot(filePath);
};

export const clearArchiveSnapshot = async (filePath: string): Promise<void> => {
  await rm(filePath, { force: true });
};
