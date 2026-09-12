import {
  createItem,
  parseArchiveSnapshot,
  type ArchiveSnapshot,
  type HistoryEntry,
  type Item,
  type TrackingUnit,
} from '../domain/archive.js';

export type TvTimeImportFile = {
  name: string;
  text: string;
};

const ZIP_END_OF_CENTRAL_DIRECTORY = 0x06054b50;
const ZIP_CENTRAL_DIRECTORY = 0x02014b50;
const ZIP_LOCAL_FILE = 0x04034b50;
const MAX_ZIP_BYTES = 50 * 1024 * 1024;
const MAX_ZIP_ENTRIES = 200;
const MAX_CSV_BYTES = 20 * 1024 * 1024;
const MAX_UNCOMPRESSED_ZIP_BYTES = 50 * 1024 * 1024;

export type TvTimeDuplicateResolution = 'skip' | 'update';

export type TvTimeImportConflict = {
  sourceItemId: string;
  existingItemId: string;
  title: string;
};

export type TvTimeWatchEvent = {
  sourceItemId: string;
  timestamp?: string;
  rewatch: boolean;
};

export type TvTimeImportPreview = {
  source: 'TV Time GDPR CSV export';
  files: string[];
  items: Item[];
  seriesStructure: {
    episodeCount: number;
    seasonCount: number;
    seriesCount: number;
  };
  watchEvents: TvTimeWatchEvent[];
  conflicts: TvTimeImportConflict[];
  warnings: string[];
};

type CsvRow = Record<string, string>;

type SourceShow = {
  id: string;
  title: string;
  episodesSeen: number;
  rewatchCount: number;
  followed?: boolean;
  archived?: boolean;
  watchEvents: Array<{ timestamp?: string; rewatch: boolean }>;
  episodes: Map<string, SourceEpisode>;
};

type SourceEpisode = {
  id: string;
  seasonNumber: number;
  episodeNumber: number;
  completed: boolean;
  watchCount: number;
};

type SourceMovie = {
  id: string;
  title: string;
  watchCount: number;
};

const recognizedFileNames = [
  'followed_tv_show.csv',
  'user_tv_show_data.csv',
  'seen_episode_latest.csv',
  'watched_on_episode.csv',
  'rewatched_episode.csv',
  'tracking-prod-records.csv',
  'tracking-prod-records-v2.csv',
  'ratings-prod-episode_votes.csv',
  'ratings-live-votes.csv',
  'ratings-v2-prod-votes.csv',
  'ratings-3-prod-episode_votes.csv',
];

const recognizedFiles = new Set(recognizedFileNames);

const ratingFiles = new Set(
  recognizedFileNames.filter((name) => name.startsWith('ratings-')),
);

const fileName = (name: string): string =>
  name.replace(/\\/g, '/').split('/').at(-1)?.toLowerCase() ?? name;

const zipValue = (view: DataView, offset: number, bytes: 2 | 4): number =>
  bytes === 2 ? view.getUint16(offset, true) : view.getUint32(offset, true);

const zipError = (message: string): Error =>
  new Error(`TV Time ZIP export is invalid: ${message}`);

const inflateZipEntry = async (compressed: Uint8Array): Promise<Uint8Array> => {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error(
      'This browser cannot decompress ZIP exports. Extract the CSV files and select them instead.',
    );
  }
  const compressedBuffer = compressed.buffer.slice(
    compressed.byteOffset,
    compressed.byteOffset + compressed.byteLength,
  ) as ArrayBuffer;
  const stream = new Blob([compressedBuffer])
    .stream()
    .pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
};

/**
 * Extracts CSV entries from a regular ZIP archive locally. ZIP64, encrypted
 * archives, and non-CSV entries are rejected or ignored by design.
 */
export const extractTvTimeCsvFilesFromZip = async (
  archive: Uint8Array,
): Promise<TvTimeImportFile[]> => {
  if (archive.byteLength > MAX_ZIP_BYTES) {
    throw zipError('the archive is larger than 50 MB');
  }
  const view = new DataView(
    archive.buffer,
    archive.byteOffset,
    archive.byteLength,
  );
  const minimumEndOffset = Math.max(0, archive.byteLength - 65_557);
  let endOffset = -1;
  for (
    let offset = archive.byteLength - 22;
    offset >= minimumEndOffset;
    offset -= 1
  ) {
    if (zipValue(view, offset, 4) === ZIP_END_OF_CENTRAL_DIRECTORY) {
      endOffset = offset;
      break;
    }
  }
  if (endOffset < 0) throw zipError('the end-of-directory record is missing');

  const entryCount = zipValue(view, endOffset + 10, 2);
  const centralDirectorySize = zipValue(view, endOffset + 12, 4);
  const centralDirectoryOffset = zipValue(view, endOffset + 16, 4);
  if (entryCount > MAX_ZIP_ENTRIES)
    throw zipError('it contains too many files');
  if (centralDirectoryOffset + centralDirectorySize > archive.byteLength) {
    throw zipError('the central directory is outside the archive');
  }

  const decoder = new TextDecoder();
  const files: TvTimeImportFile[] = [];
  let cursor = centralDirectoryOffset;
  let totalUncompressedBytes = 0;

  for (let entry = 0; entry < entryCount; entry += 1) {
    if (
      cursor + 46 > archive.byteLength ||
      zipValue(view, cursor, 4) !== ZIP_CENTRAL_DIRECTORY
    ) {
      throw zipError('a central-directory entry is malformed');
    }
    const flags = zipValue(view, cursor + 8, 2);
    const compression = zipValue(view, cursor + 10, 2);
    const compressedSize = zipValue(view, cursor + 20, 4);
    const uncompressedSize = zipValue(view, cursor + 24, 4);
    const nameLength = zipValue(view, cursor + 28, 2);
    const extraLength = zipValue(view, cursor + 30, 2);
    const commentLength = zipValue(view, cursor + 32, 2);
    const localHeaderOffset = zipValue(view, cursor + 42, 4);
    const nameStart = cursor + 46;
    const nextCursor = nameStart + nameLength + extraLength + commentLength;
    if (nextCursor > archive.byteLength)
      throw zipError('an entry name is truncated');
    const name = decoder.decode(
      archive.subarray(nameStart, nameStart + nameLength),
    );
    cursor = nextCursor;

    if (!fileName(name).endsWith('.csv')) continue;
    if ((flags & 0x1) !== 0) throw zipError(`CSV entry ${name} is encrypted`);
    if (compression !== 0 && compression !== 8) {
      throw zipError(
        `CSV entry ${name} uses an unsupported compression method`,
      );
    }
    if (uncompressedSize > MAX_CSV_BYTES) {
      throw zipError(`CSV entry ${name} is larger than 20 MB`);
    }
    totalUncompressedBytes += uncompressedSize;
    if (totalUncompressedBytes > MAX_UNCOMPRESSED_ZIP_BYTES) {
      throw zipError('the extracted CSV files are larger than 50 MB');
    }
    if (
      localHeaderOffset + 30 > archive.byteLength ||
      zipValue(view, localHeaderOffset, 4) !== ZIP_LOCAL_FILE
    ) {
      throw zipError(`CSV entry ${name} has no valid local header`);
    }
    const localNameLength = zipValue(view, localHeaderOffset + 26, 2);
    const localExtraLength = zipValue(view, localHeaderOffset + 28, 2);
    const dataStart =
      localHeaderOffset + 30 + localNameLength + localExtraLength;
    const dataEnd = dataStart + compressedSize;
    if (dataEnd > archive.byteLength)
      throw zipError(`CSV entry ${name} is truncated`);

    const compressed = archive.slice(dataStart, dataEnd);
    const content =
      compression === 0 ? compressed : await inflateZipEntry(compressed);
    if (content.byteLength !== uncompressedSize) {
      throw zipError(`CSV entry ${name} has an unexpected uncompressed size`);
    }
    files.push({ name, text: decoder.decode(content) });
  }

  if (files.length === 0) throw zipError('it does not contain CSV files');
  return files;
};

const normalizedTitle = (title: string): string =>
  title.trim().toLocaleLowerCase();

const safeId = (value: string): string =>
  value
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 120);

const numberValue = (value: string | undefined): number => {
  if (!value) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
};

const booleanValue = (value: string | undefined): boolean | undefined => {
  if (value === undefined || value === '') return undefined;
  if (value === '1' || value.toLowerCase() === 'true') return true;
  if (value === '0' || value.toLowerCase() === 'false') return false;
  return undefined;
};

const isoTimestamp = (value: string | undefined): string | undefined => {
  if (!value) return undefined;
  const timestamp = new Date(value);
  return Number.isNaN(timestamp.getTime())
    ? undefined
    : timestamp.toISOString();
};

/** Parses RFC 4180-style CSV without sending file contents anywhere. */
const parseCsv = (text: string, name: string): CsvRow[] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
      continue;
    }

    if (character === '"') {
      quoted = true;
    } else if (character === ',') {
      row.push(field);
      field = '';
    } else if (character === '\n' || character === '\r') {
      if (character === '\r' && text[index + 1] === '\n') index += 1;
      row.push(field);
      if (row.some((value) => value !== '')) rows.push(row);
      row = [];
      field = '';
    } else {
      field += character;
    }
  }

  if (quoted) throw new Error(`TV Time file ${name} has an unclosed CSV quote`);
  row.push(field);
  if (row.some((value) => value !== '')) rows.push(row);
  if (rows.length === 0) throw new Error(`TV Time file ${name} is empty`);

  const headers = rows[0].map((header, index) =>
    (index === 0 ? header.replace(/^\uFEFF/, '') : header).trim(),
  );
  if (
    headers.some((header) => !header) ||
    new Set(headers).size !== headers.length
  ) {
    throw new Error(`TV Time file ${name} has invalid CSV headers`);
  }

  return rows.slice(1).map((values, rowIndex) => {
    if (values.length !== headers.length) {
      throw new Error(
        `TV Time file ${name} has an invalid column count on row ${rowIndex + 2}`,
      );
    }
    return Object.fromEntries(
      headers.map((header, index) => [header, values[index]]),
    );
  });
};

const getShow = (
  shows: Map<string, SourceShow>,
  id: string | undefined,
  title: string | undefined,
): SourceShow | undefined => {
  const cleanTitle = title?.trim();
  const sourceId = id?.trim();
  if (!cleanTitle) return undefined;
  const key = sourceId
    ? `id:${sourceId}`
    : `title:${normalizedTitle(cleanTitle)}`;
  const current = shows.get(key);
  if (current) return current;

  const matchingTitle = Array.from(shows.values()).find(
    (show) => normalizedTitle(show.title) === normalizedTitle(cleanTitle),
  );
  if (matchingTitle) return matchingTitle;

  const show: SourceShow = {
    id: sourceId || `title:${normalizedTitle(cleanTitle)}`,
    title: cleanTitle,
    episodesSeen: 0,
    rewatchCount: 0,
    watchEvents: [],
    episodes: new Map(),
  };
  shows.set(key, show);
  return show;
};

const addShowRows = (shows: Map<string, SourceShow>, rows: CsvRow[]): void => {
  for (const row of rows) {
    const show = getShow(shows, row.tv_show_id, row.tv_show_name);
    if (!show) continue;
    show.episodesSeen = Math.max(
      show.episodesSeen,
      numberValue(row.nb_episodes_seen),
    );
    show.followed = booleanValue(row.is_followed) ?? show.followed;
  }
};

const addFollowedRows = (
  shows: Map<string, SourceShow>,
  rows: CsvRow[],
): void => {
  for (const row of rows) {
    const show = getShow(shows, row.tv_show_id, row.tv_show_name);
    if (!show) continue;
    show.followed = booleanValue(row.active) ?? show.followed;
    show.archived = booleanValue(row.archived) ?? show.archived;
  }
};

const positiveInteger = (value: string | undefined): number | undefined => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : undefined;
};

const addEpisode = (
  show: SourceShow,
  input: {
    completed: boolean;
    episodeNumber: number;
    id: string;
    seasonNumber: number;
    watchCount: number;
  },
): void => {
  const current = show.episodes.get(input.id);
  show.episodes.set(input.id, {
    id: input.id,
    seasonNumber: input.seasonNumber,
    episodeNumber: input.episodeNumber,
    completed: current?.completed || input.completed,
    watchCount: Math.max(current?.watchCount ?? 0, input.watchCount),
  });
};

const addEpisodeRows = (
  shows: Map<string, SourceShow>,
  rows: CsvRow[],
  rewatch: boolean,
): boolean => {
  let foundEpisodeStructure = false;

  for (const row of rows) {
    const show = getShow(shows, row.tv_show_id, row.tv_show_name);
    if (!show) continue;
    const seasonNumber = positiveInteger(row.episode_season_number);
    const episodeNumber = positiveInteger(row.episode_number);
    if (seasonNumber === undefined || episodeNumber === undefined) {
      const count = rewatch ? Math.max(1, numberValue(row.cpt)) : 1;
      show.rewatchCount += rewatch ? count : 0;
      show.watchEvents.push({
        timestamp: isoTimestamp(row.created_at),
        rewatch,
      });
      continue;
    }

    foundEpisodeStructure = true;
    const id = row.episode_id?.trim() || `s${seasonNumber}-e${episodeNumber}`;
    const rewatchCount = rewatch ? Math.max(1, numberValue(row.cpt)) : 0;
    addEpisode(show, {
      id,
      seasonNumber,
      episodeNumber,
      completed: true,
      watchCount: rewatch ? rewatchCount + 1 : 1,
    });
    show.rewatchCount += rewatchCount;
    show.watchEvents.push({
      timestamp: isoTimestamp(row.created_at),
      rewatch,
    });
  }

  return foundEpisodeStructure;
};

const addTrackingRows = (
  shows: Map<string, SourceShow>,
  rows: CsvRow[],
  format: 'legacy' | 'v2',
): boolean => {
  let foundEpisodeStructure = false;

  for (const row of rows) {
    const title = row.series_name;
    if (!title?.trim()) continue;
    const show = getShow(
      shows,
      format === 'v2'
        ? row.s_id || row.series_uuid || row.gsi
        : row.series_id || row.series_uuid,
      title,
    );
    if (!show) continue;

    const seasonNumber = positiveInteger(
      format === 'v2' ? row.s_no || row.season_number : row.season_number,
    );
    const episodeNumber = positiveInteger(
      format === 'v2' ? row.ep_no || row.episode_number : row.episode_number,
    );
    if (seasonNumber === undefined || episodeNumber === undefined) continue;

    const episodeId =
      (format === 'v2'
        ? row.episode_id || row.ep_id
        : row.episode_id
      )?.trim() || `s${seasonNumber}-e${episodeNumber}`;
    const watchCount =
      format === 'v2'
        ? numberValue(row.ep_watch_count)
        : Math.max(numberValue(row.watch_count), numberValue(row.watches));
    addEpisode(show, {
      id: episodeId,
      seasonNumber,
      episodeNumber,
      completed: watchCount > 0,
      watchCount,
    });
    foundEpisodeStructure = true;
    if (watchCount > 1) show.rewatchCount += watchCount - 1;
    if (watchCount > 0) {
      show.watchEvents.push({
        timestamp: isoTimestamp(row.created_at ?? row.watch_date),
        rewatch: watchCount > 1,
      });
    }
  }

  return foundEpisodeStructure;
};

const addMovieRows = (
  movies: Map<string, SourceMovie>,
  rows: CsvRow[],
): void => {
  for (const row of rows) {
    const title = row.movie_name?.trim();
    if (!title) continue;
    const id =
      row.uuid?.trim() || row['type-uuid-n']?.trim() || normalizedTitle(title);
    const current = movies.get(id);
    const watchCount = Math.max(
      numberValue(row.movie_watch_count),
      numberValue(row.watch_count),
      numberValue(row.watches),
    );
    if (current) {
      current.watchCount = Math.max(current.watchCount, watchCount);
    } else {
      movies.set(id, { id, title, watchCount });
    }
  }
};

const sourceItemId = (kind: 'show' | 'movie', id: string): string =>
  `tvtime-${kind}-${safeId(id) || crypto.randomUUID()}`;

const showSubunits = (show: SourceShow): TrackingUnit[] => {
  const episodes = Array.from(show.episodes.values()).sort(
    (left, right) =>
      left.seasonNumber - right.seasonNumber ||
      left.episodeNumber - right.episodeNumber ||
      left.id.localeCompare(right.id),
  );
  const seasons = Array.from(
    new Set(episodes.map((episode) => episode.seasonNumber)),
  ).sort((left, right) => left - right);
  const itemId = sourceItemId('show', show.id);

  return seasons.flatMap((seasonNumber) => {
    const seasonId = `${itemId}-season-${seasonNumber}`;
    const seasonEpisodes = episodes.filter(
      (episode) => episode.seasonNumber === seasonNumber,
    );
    return [
      {
        id: seasonId,
        kind: 'season' as const,
        title: `Season ${seasonNumber}`,
        position: seasonNumber,
        completed: false,
        watchCount: 0,
      },
      ...seasonEpisodes.map((episode) => ({
        id: `${itemId}-episode-${safeId(episode.id)}`,
        kind: 'episode' as const,
        title: `Episode ${episode.episodeNumber}`,
        parentId: seasonId,
        position: episode.episodeNumber,
        completed: episode.completed,
        watchCount: episode.watchCount,
      })),
    ];
  });
};

const toShowItem = (show: SourceShow): Item =>
  createItem({
    id: sourceItemId('show', show.id),
    type: 'series',
    category: 'Series',
    title: show.title,
    status: show.episodesSeen > 0 ? 'in_progress' : 'planned',
    progress: { current: show.episodesSeen, unit: 'episodes' },
    attributes: {
      tvTimeFollowed: show.followed ?? false,
      tvTimeArchived: show.archived ?? false,
      tvTimeRewatchCount: show.rewatchCount,
    },
    externalIds: { tvTime: show.id },
    subunits: showSubunits(show),
  });

const toMovieItem = (movie: SourceMovie): Item =>
  createItem({
    id: sourceItemId('movie', movie.id),
    type: 'movie',
    category: 'Movies',
    title: movie.title,
    status: movie.watchCount > 0 ? 'completed' : 'planned',
    progress: {
      current: movie.watchCount > 0 ? 100 : 0,
      target: 100,
      unit: 'percent',
    },
    attributes: { tvTimeWatchCount: movie.watchCount },
    externalIds: { tvTime: movie.id },
  });

const duplicateFor = (archive: ArchiveSnapshot, item: Item): Item | undefined =>
  archive.items.find(
    (existing) =>
      existing.externalIds.tvTime === item.externalIds.tvTime ||
      (existing.type === item.type &&
        normalizedTitle(existing.title) === normalizedTitle(item.title)),
  );

/**
 * Builds a non-persisted, reviewable import plan for the CSV tables in a TV
 * Time GDPR export. Unsupported tables are never interpreted as archive data.
 */
export const previewTvTimeImport = (
  files: TvTimeImportFile[],
  archive: ArchiveSnapshot,
): TvTimeImportPreview => {
  if (files.length === 0)
    throw new Error('Select one or more TV Time CSV files');

  const shows = new Map<string, SourceShow>();
  const movies = new Map<string, SourceMovie>();
  const warnings: string[] = [];
  const recognized: string[] = [];
  let hasSupportedLibraryTable = false;
  let hasEpisodeStructure = false;

  for (const file of files) {
    const name = fileName(file.name);
    if (!recognizedFiles.has(name)) continue;
    recognized.push(name);
    const rows = parseCsv(file.text, name);

    if (name === 'user_tv_show_data.csv') {
      addShowRows(shows, rows);
      hasSupportedLibraryTable = true;
    } else if (name === 'followed_tv_show.csv') {
      addFollowedRows(shows, rows);
      hasSupportedLibraryTable = true;
    } else if (name === 'seen_episode_latest.csv') {
      hasEpisodeStructure =
        addEpisodeRows(shows, rows, false) || hasEpisodeStructure;
    } else if (name === 'watched_on_episode.csv') {
      hasEpisodeStructure =
        addEpisodeRows(shows, rows, false) || hasEpisodeStructure;
    } else if (name === 'rewatched_episode.csv') {
      hasEpisodeStructure =
        addEpisodeRows(shows, rows, true) || hasEpisodeStructure;
    } else if (name === 'tracking-prod-records-v2.csv') {
      hasEpisodeStructure =
        addTrackingRows(shows, rows, 'v2') || hasEpisodeStructure;
      addMovieRows(movies, rows);
      hasSupportedLibraryTable = true;
    } else if (name === 'tracking-prod-records.csv') {
      hasEpisodeStructure =
        addTrackingRows(shows, rows, 'legacy') || hasEpisodeStructure;
      addMovieRows(movies, rows);
      hasSupportedLibraryTable = true;
    } else if (ratingFiles.has(name)) {
      warnings.push(
        'TV Time rating vote keys were found but are not imported because their rating scale is not documented by this export.',
      );
    }
  }

  if (!hasSupportedLibraryTable) {
    throw new Error(
      'No supported TV Time library table was found. Select user_tv_show_data.csv, followed_tv_show.csv, or a tracking-prod-records CSV.',
    );
  }

  if (recognized.length !== files.length) {
    warnings.push(
      'Some selected files are not part of the supported TV Time import and were ignored.',
    );
  }
  if (shows.size > 0 && !hasEpisodeStructure) {
    warnings.push(
      'No episode-level rows were found in the selected files, so series progress is imported as a watched-episode count without seasons or individual episodes.',
    );
  } else if (hasEpisodeStructure) {
    warnings.push(
      'TV Time does not provide episode titles in these tables. Episodes are labelled by their season and episode number.',
    );
  }
  if (files.some((file) => fileName(file.name) === 'rewatched_episode.csv')) {
    warnings.push(
      'Rewatch totals are preserved as item attributes; repeated-watch timestamps are not available for every event.',
    );
  }

  const items = Array.from(shows.values())
    .map(toShowItem)
    .concat(Array.from(movies.values()).map(toMovieItem));
  if (items.length === 0) {
    throw new Error(
      'The selected TV Time files did not contain importable series or movies',
    );
  }

  const conflicts = items.flatMap((item) => {
    const existing = duplicateFor(archive, item);
    return existing
      ? [
          {
            sourceItemId: item.id,
            existingItemId: existing.id,
            title: item.title,
          },
        ]
      : [];
  });
  const watchEvents = Array.from(shows.values()).flatMap((show) =>
    show.watchEvents.map((event) => ({
      ...event,
      sourceItemId: sourceItemId('show', show.id),
    })),
  );
  const episodeCount = Array.from(shows.values()).reduce(
    (count, show) => count + show.episodes.size,
    0,
  );
  const seasonCount = Array.from(shows.values()).reduce(
    (count, show) =>
      count +
      new Set(
        Array.from(show.episodes.values()).map(
          (episode) => episode.seasonNumber,
        ),
      ).size,
    0,
  );

  return {
    source: 'TV Time GDPR CSV export',
    files: recognized,
    items,
    seriesStructure: {
      episodeCount,
      seasonCount,
      seriesCount: Array.from(shows.values()).filter(
        (show) => show.episodes.size > 0,
      ).length,
    },
    watchEvents,
    conflicts,
    warnings: Array.from(new Set(warnings)),
  };
};

/** Applies a reviewed import plan and validates the complete next archive first. */
export const applyTvTimeImport = (
  archive: ArchiveSnapshot,
  preview: TvTimeImportPreview,
  duplicateResolution: TvTimeDuplicateResolution,
): ArchiveSnapshot => {
  const importedAt = new Date().toISOString();
  const conflictsBySource = new Map(
    preview.conflicts.map((conflict) => [conflict.sourceItemId, conflict]),
  );
  const items = [...archive.items];
  const history: HistoryEntry[] = [...archive.history];
  const resolvedItemIds = new Map<string, string>();

  for (const sourceItem of preview.items) {
    const conflict = conflictsBySource.get(sourceItem.id);
    if (conflict && duplicateResolution === 'skip') continue;

    if (conflict) {
      const index = items.findIndex(
        (item) => item.id === conflict.existingItemId,
      );
      if (index < 0)
        throw new Error(
          `Import conflict target is missing: ${sourceItem.title}`,
        );
      const existing = items[index];
      items[index] = {
        ...existing,
        status: sourceItem.status,
        progress: sourceItem.progress,
        subunits:
          sourceItem.subunits.length > 0
            ? sourceItem.subunits
            : existing.subunits,
        attributes: { ...existing.attributes, ...sourceItem.attributes },
        externalIds: { ...existing.externalIds, ...sourceItem.externalIds },
        updatedAt: importedAt,
      };
      history.push({
        id: crypto.randomUUID(),
        itemId: existing.id,
        action: 'imported',
        timestamp: importedAt,
        summary: `Updated from TV Time: ${existing.title}`,
      });
      resolvedItemIds.set(sourceItem.id, existing.id);
      continue;
    }

    items.push(sourceItem);
    history.push({
      id: crypto.randomUUID(),
      itemId: sourceItem.id,
      action: 'imported',
      timestamp: importedAt,
      summary: `Imported from TV Time: ${sourceItem.title}`,
    });
    resolvedItemIds.set(sourceItem.id, sourceItem.id);
  }

  for (const event of preview.watchEvents) {
    const itemId = resolvedItemIds.get(event.sourceItemId);
    if (!itemId) continue;
    const item = items.find((candidate) => candidate.id === itemId);
    if (!item) continue;
    history.push({
      id: crypto.randomUUID(),
      itemId,
      action: event.rewatch ? 'rewatched' : 'watched',
      timestamp: event.timestamp ?? importedAt,
      summary: `${event.rewatch ? 'Imported TV Time rewatch' : 'Imported TV Time episode watch'}: ${item.title}`,
    });
  }

  return parseArchiveSnapshot({
    ...archive,
    exportedAt: importedAt,
    items,
    history,
  });
};
