import {
  createItem,
  parseArchiveSnapshot,
  type ArchiveSnapshot,
  type HistoryEntry,
  type Item,
} from '../domain/archive.js';

export type ImdbDuplicateResolution = 'skip' | 'update';

export type ImdbImportConflict = {
  sourceItemId: string;
  existingItemId: string;
  title: string;
};

export type ImdbImportPreview = {
  source: 'IMDb CSV export';
  fileName: string;
  items: Item[];
  conflicts: ImdbImportConflict[];
  warnings: string[];
};

type CsvRow = Record<string, string>;

const REQUIRED_COLUMNS = ['Const', 'Title', 'Title Type'] as const;

const normalizedTitle = (title: string): string =>
  title.trim().toLocaleLowerCase();

const safeId = (value: string): string =>
  value
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 120);

const timestamp = (value: string | undefined): string | undefined => {
  if (!value?.trim()) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
};

const numberValue = (value: string | undefined): number | undefined => {
  if (!value?.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const tagsFromGenres = (genres: string | undefined): string[] =>
  Array.from(
    new Set(
      (genres ?? '')
        .split(',')
        .map((genre) => genre.trim())
        .filter(Boolean),
    ),
  );

const imdbType = (titleType: string): { type: string; category: string } => {
  const normalized = titleType.trim().toLocaleLowerCase();
  if (normalized.includes('serie') || normalized.includes('tv series')) {
    return { type: 'series', category: 'Series' };
  }
  return { type: 'film', category: 'Film' };
};

const descriptionWithImdbLink = (
  description: string | undefined,
  url: string | undefined,
): string | undefined => {
  const sourceDescription = description?.trim();
  const imdbUrl = url?.trim();

  if (!imdbUrl) return sourceDescription || undefined;

  return [sourceDescription, `IMDb: ${imdbUrl}`]
    .filter((value): value is string => Boolean(value))
    .join('\n\n');
};

/** Parses RFC 4180-style CSV without sending the selected file anywhere. */
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
    if (character === '"') quoted = true;
    else if (character === ',') {
      row.push(field);
      field = '';
    } else if (character === '\n' || character === '\r') {
      if (character === '\r' && text[index + 1] === '\n') index += 1;
      row.push(field);
      if (row.some((value) => value !== '')) rows.push(row);
      row = [];
      field = '';
    } else field += character;
  }

  if (quoted) throw new Error(`IMDb file ${name} has an unclosed CSV quote`);
  row.push(field);
  if (row.some((value) => value !== '')) rows.push(row);
  if (rows.length === 0) throw new Error(`IMDb file ${name} is empty`);

  const headers = rows[0].map((header, index) =>
    (index === 0 ? header.replace(/^\uFEFF/, '') : header).trim(),
  );
  if (
    headers.some((header) => !header) ||
    new Set(headers).size !== headers.length
  ) {
    throw new Error(`IMDb file ${name} has invalid CSV headers`);
  }
  for (const column of REQUIRED_COLUMNS) {
    if (!headers.includes(column)) {
      throw new Error(`IMDb file ${name} is missing the ${column} column`);
    }
  }

  return rows.slice(1).map((values, rowIndex) => {
    if (values.length !== headers.length) {
      throw new Error(
        `IMDb file ${name} has an invalid column count on row ${rowIndex + 2}`,
      );
    }
    return Object.fromEntries(
      headers.map((header, index) => [header, values[index]]),
    );
  });
};

const toItem = (row: CsvRow, rowIndex: number): Item => {
  const imdbId = row.Const.trim();
  const title = row.Title.trim();
  const titleType = row['Title Type'].trim();
  if (!/^tt\d+$/i.test(imdbId)) {
    throw new Error(`IMDb row ${rowIndex + 2} has an invalid Const title ID`);
  }
  if (!title) throw new Error(`IMDb row ${rowIndex + 2} has no Title`);
  if (!titleType) {
    throw new Error(`IMDb row ${rowIndex + 2} has no Title Type`);
  }

  const ratedAt = timestamp(row['Date Rated']);
  const yourRating = numberValue(row['Your Rating']);
  if (yourRating !== undefined && (yourRating < 1 || yourRating > 10)) {
    throw new Error(
      `IMDb row ${rowIndex + 2} has an invalid Your Rating value`,
    );
  }
  const itemType = imdbType(titleType);
  const sourceCreatedAt = timestamp(row.Created);
  const sourceUpdatedAt = timestamp(row.Modified) ?? sourceCreatedAt;
  const imdbRating = numberValue(row['IMDb Rating']);
  const runtime = numberValue(row['Runtime (mins)']);
  const year = numberValue(row.Year);
  const voteCount = numberValue(row['Num Votes']);
  const position = numberValue(row.Position);
  const archiveRating =
    imdbRating !== undefined && imdbRating >= 0 && imdbRating <= 10
      ? imdbRating / 2
      : yourRating === undefined
        ? undefined
        : yourRating / 2;

  return createItem({
    id: `imdb-${safeId(imdbId)}`,
    type: itemType.type,
    category: itemType.category,
    title,
    description: descriptionWithImdbLink(row.Description, row.URL),
    status: 'completed',
    progress: { current: 100, target: 100, unit: 'percent' },
    rating: archiveRating,
    tags: ['IMDb watchlist', ...tagsFromGenres(row.Genres)],
    createdAt: sourceCreatedAt,
    updatedAt: sourceUpdatedAt,
    attributes: {
      imdbListMembership: 'watchlist',
      imdbTitleType: titleType,
      ...(position === undefined ? {} : { imdbPosition: position }),
      ...(sourceCreatedAt === undefined
        ? {}
        : { imdbCreatedAt: sourceCreatedAt }),
      ...(sourceUpdatedAt === undefined
        ? {}
        : { imdbModifiedAt: sourceUpdatedAt }),
      ...(ratedAt === undefined ? {} : { imdbDateRated: ratedAt }),
      ...(row.URL?.trim() ? { imdbUrl: row.URL.trim() } : {}),
      ...(row['Original Title']?.trim()
        ? { imdbOriginalTitle: row['Original Title'].trim() }
        : {}),
      ...(imdbRating === undefined ? {} : { imdbRating }),
      ...(yourRating === undefined ? {} : { imdbYourRating: yourRating }),
      ...(runtime === undefined ? {} : { imdbRuntimeMinutes: runtime }),
      ...(year === undefined ? {} : { imdbYear: year }),
      ...(voteCount === undefined ? {} : { imdbVoteCount: voteCount }),
      ...(row.Genres?.trim() ? { imdbGenres: row.Genres.trim() } : {}),
      ...(row['Release Date']?.trim()
        ? { imdbReleaseDate: row['Release Date'].trim() }
        : {}),
      ...(row.Directors?.trim()
        ? {
            creator: row.Directors.trim(),
            imdbDirectors: row.Directors.trim(),
          }
        : {}),
    },
    externalIds: { imdb: imdbId },
  });
};

// Earlier imports stored films with the `movie` type.
const comparableType = (type: string): string =>
  type === 'movie' ? 'film' : type;

const duplicateFor = (archive: ArchiveSnapshot, item: Item): Item | undefined =>
  archive.items.find(
    (existing) =>
      existing.externalIds.imdb === item.externalIds.imdb ||
      (comparableType(existing.type) === comparableType(item.type) &&
        normalizedTitle(existing.title) === normalizedTitle(item.title)),
  );

/** Builds a non-persisted import plan for a user-selected IMDb CSV export. */
export const previewImdbImport = (
  file: { name: string; text: string },
  archive: ArchiveSnapshot,
): ImdbImportPreview => {
  if (!file.name.toLocaleLowerCase().endsWith('.csv')) {
    throw new Error('Select an IMDb CSV export');
  }
  const items = parseCsv(file.text, file.name).map(toItem);
  if (items.length === 0) throw new Error('The IMDb export has no title rows');

  const hasRatings = items.some((item) => item.rating !== undefined);
  const warnings = [
    'All IMDb watchlist titles are marked completed. This CSV does not provide reliable per-title watch progress or episode-level history.',
    'IMDb public rating, runtime, genres, release date, directors, and vote count are retained as source attributes, not treated as personal tracking data.',
    'IMDb title types that are not series are imported as movies; short-form, video, TV special, and episode records are not reconstructed as separate tracking structures.',
  ];
  if (!hasRatings) {
    warnings.push(
      'No “Your Rating” values were found, so no personal ratings will be imported from this file.',
    );
  }
  return {
    source: 'IMDb CSV export',
    fileName: file.name,
    items,
    conflicts: items.flatMap((item) => {
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
    }),
    warnings,
  };
};

/** Applies a reviewed IMDb import only after the complete candidate archive validates. */
export const applyImdbImport = (
  archive: ArchiveSnapshot,
  preview: ImdbImportPreview,
  duplicateResolution: ImdbDuplicateResolution,
): ArchiveSnapshot => {
  const importedAt = new Date().toISOString();
  const conflicts = new Map(
    preview.conflicts.map((conflict) => [conflict.sourceItemId, conflict]),
  );
  const items = [...archive.items];
  const history: HistoryEntry[] = [...archive.history];

  for (const sourceItem of preview.items) {
    const conflict = conflicts.get(sourceItem.id);
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
        // Earlier imports stored films as movie/Movies, outside the Film filter.
        ...(existing.type === 'movie' && existing.category === 'Movies'
          ? { type: sourceItem.type, category: sourceItem.category }
          : {}),
        status: sourceItem.status,
        progress: sourceItem.progress,
        rating: sourceItem.rating ?? existing.rating,
        tags: Array.from(new Set([...existing.tags, ...sourceItem.tags])),
        attributes: { ...existing.attributes, ...sourceItem.attributes },
        externalIds: { ...existing.externalIds, ...sourceItem.externalIds },
        updatedAt: importedAt,
      };
      history.push({
        id: crypto.randomUUID(),
        itemId: existing.id,
        action: 'imported',
        timestamp: importedAt,
        summary: `Updated from IMDb: ${existing.title}`,
      });
    } else {
      items.push(sourceItem);
      history.push({
        id: crypto.randomUUID(),
        itemId: sourceItem.id,
        action: 'imported',
        timestamp: importedAt,
        summary: `Imported from IMDb: ${sourceItem.title}`,
      });
    }
  }

  return parseArchiveSnapshot({
    ...archive,
    exportedAt: importedAt,
    items,
    history,
  });
};
