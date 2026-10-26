import type { Catalog, CatalogRecord } from './catalog-schema.js';

export type LocalCatalogSearchResult = CatalogRecord & {
  catalogCategory: string;
};

/** Searches only bundled catalog metadata; no provider request is made. */
export const searchLocalCatalogs = (
  catalogs: Catalog[],
  query: string,
): LocalCatalogSearchResult[] => {
  const normalized = query.trim().toLocaleLowerCase();
  const records = catalogs.flatMap((catalog) =>
    catalog.records.map((record) => ({
      ...record,
      catalogCategory: catalog.category,
    })),
  );

  if (!normalized) return records;

  return records.filter((record) =>
    [
      record.title,
      record.category,
      String(record.year ?? ''),
      ...record.genres,
      ...Object.values(record.attributes),
    ]
      .join(' ')
      .toLocaleLowerCase()
      .includes(normalized),
  );
};
