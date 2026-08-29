import type { HistoryEntry, Item, ItemStatus } from './archive.js';

export type SearchFilter = {
  status?: ItemStatus[];
  category?: string[];
  collection?: string[];
  tag?: string[];
  query?: string;
  ratingMin?: number;
  ratingMax?: number;
};

export type HistoryAction = HistoryEntry['action'];

export type HistoryEntryInput = {
  id?: string;
  itemId: string;
  action: HistoryAction;
  timestamp?: string;
  summary: string;
};

export const createHistoryEntry = (input: HistoryEntryInput): HistoryEntry => ({
  id: input.id ?? crypto.randomUUID(),
  itemId: input.itemId,
  action: input.action,
  timestamp: input.timestamp ?? new Date().toISOString(),
  summary: input.summary,
});

export const searchItems = (items: Item[], query: string): Item[] => {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return items;
  }

  return items.filter((item) => {
    const haystack = [
      item.title,
      item.category,
      item.type,
      item.description ?? '',
      item.notes.join(' '),
      item.tags.join(' '),
      item.collections.join(' '),
      Object.values(item.attributes).join(' '),
    ].join(' ').toLowerCase();

    return haystack.includes(normalized);
  });
};

export const filterItems = (items: Item[], filters: SearchFilter): Item[] => {
  return items.filter((item) => {
    if (filters.status && filters.status.length > 0 && !filters.status.includes(item.status)) {
      return false;
    }

    if (filters.category && filters.category.length > 0 && !filters.category.includes(item.category)) {
      return false;
    }

    if (filters.collection && filters.collection.length > 0) {
      const matchesCollection = item.collections.some((collection) => filters.collection!.includes(collection));
      if (!matchesCollection) {
        return false;
      }
    }

    if (filters.tag && filters.tag.length > 0) {
      const matchesTag = item.tags.some((tag) => filters.tag!.includes(tag));
      if (!matchesTag) {
        return false;
      }
    }

    if (typeof filters.ratingMin === 'number' && (item.rating ?? 0) < filters.ratingMin) {
      return false;
    }

    if (typeof filters.ratingMax === 'number' && (item.rating ?? 0) > filters.ratingMax) {
      return false;
    }

    if (filters.query) {
      const result = searchItems([item], filters.query);
      if (result.length === 0) {
        return false;
      }
    }

    return true;
  });
};

export const sortItems = <T extends Item>(items: T[], field: 'updatedAt' | 'createdAt' | 'title'): T[] => {
  const sorted = [...items];

  sorted.sort((left, right) => {
    if (field === 'title') {
      return left.title.localeCompare(right.title);
    }

    return new Date(right[field]).getTime() - new Date(left[field]).getTime();
  });

  return sorted;
};

export const getHistoryTimeline = (history: HistoryEntry[]): HistoryEntry[] => {
  return [...history].sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime());
};
