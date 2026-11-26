import {
  parseCatalog,
  type Catalog,
  type CatalogRecord,
} from './catalog-schema.js';

export type LocalCatalogSearchResult = CatalogRecord & {
  catalogCategory: string;
};

export const LOCAL_CATALOG_PAGE_SIZE = 6;
export const MAX_LOCAL_CATALOG_PAGE_SIZE = 50;

export interface LocalCatalogPage {
  records: LocalCatalogSearchResult[];
  total: number;
  page: number;
  pageCount: number;
}

export function loadLocalCatalogs(inputs: Record<string, unknown>): {
  catalogs: Catalog[];
  errors: string[];
} {
  const catalogs: Catalog[] = [];
  const errors: string[] = [];
  for (const [category, input] of Object.entries(inputs)) {
    try {
      const catalog = parseCatalog(input);
      if (catalog.category !== category) {
        errors.push(`${category}: unexpected catalog namespace`);
        continue;
      }
      catalogs.push(catalog);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'invalid catalog';
      errors.push(`${category}: ${message}`);
    }
  }
  return { catalogs, errors };
}

function normalize(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function rank(record: CatalogRecord, query: string): number {
  if (!query) return 0;
  const title = normalize(record.title);
  if (title === query) return 0;
  if (title.startsWith(query)) return 1;
  if (title.includes(query)) return 2;
  const details = normalize(
    [
      record.category,
      String(record.year ?? ''),
      ...record.genres,
      ...Object.values(record.attributes),
    ].join(' '),
  );
  return details.includes(query) ? 3 : -1;
}

type CatalogMatch = { record: CatalogRecord; catalogCategory: string };

function findMatches(
  catalogs: readonly Catalog[],
  query: string,
): CatalogMatch[] {
  const normalized = normalize(query);
  const groups: CatalogMatch[][] = [[], [], [], []];
  for (const catalog of catalogs) {
    for (const record of catalog.records) {
      const matchRank = rank(record, normalized);
      if (matchRank < 0) continue;
      groups[matchRank].push({ record, catalogCategory: catalog.category });
    }
  }
  return groups.flat();
}

function copyMatch(match: CatalogMatch): LocalCatalogSearchResult {
  return {
    ...match.record,
    genres: [...match.record.genres],
    attributes: { ...match.record.attributes },
    provenance: { ...match.record.provenance },
    catalogCategory: match.catalogCategory,
  };
}

/** Search bundled metadata only; preserve seed order within equal ranks. */
export function searchLocalCatalogs(
  catalogs: readonly Catalog[],
  query: string,
): LocalCatalogSearchResult[] {
  return findMatches(catalogs, query).map(copyMatch);
}

/** Copy only the requested page, not every matching record. */
export function searchLocalCatalogPage(
  catalogs: readonly Catalog[],
  query: string,
  page = 1,
  pageSize = LOCAL_CATALOG_PAGE_SIZE,
): LocalCatalogPage {
  if (
    !Number.isSafeInteger(pageSize) ||
    pageSize < 1 ||
    pageSize > MAX_LOCAL_CATALOG_PAGE_SIZE
  ) {
    throw new RangeError('Invalid local catalog page size');
  }
  if (!Number.isSafeInteger(page) || page < 1) {
    throw new RangeError('Invalid local catalog page');
  }
  const matches = findMatches(catalogs, query);
  const total = matches.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, pageCount);
  const offset = (currentPage - 1) * pageSize;
  return {
    records: matches.slice(offset, offset + pageSize).map(copyMatch),
    total,
    page: currentPage,
    pageCount,
  };
}
