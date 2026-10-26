import type { CreateItemInput } from '../domain/archive.js';
import type { CatalogRecord } from './catalog-schema.js';

/**
 * Converts a bundled catalog record into a planned archive item. The catalog
 * stays read-only; this input is persisted only after an explicit add action.
 */
export const catalogRecordToItemInput = (
  record: CatalogRecord,
  placeholderCovers: boolean,
): CreateItemInput => ({
  title: record.title,
  category: record.category,
  type: record.category.toLowerCase(),
  status: 'planned',
  progress: { current: 0, target: 1, unit: 'item' },
  description: record.attributes.synopsis,
  notes: [],
  tags: record.genres,
  collections: [],
  attributes: {
    ...record.attributes,
    localCatalogId: record.id,
    localCatalogCategory: record.category,
    creator: record.attributes.director ?? '—',
    imdbGenres: record.genres.join(', '),
    usePlaceholderCover: placeholderCovers,
  },
  externalIds: {},
});
