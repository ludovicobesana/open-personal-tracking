import {
  createEmptyArchive,
  createItem,
  getLeafTrackingUnits,
  normalizeItemTracking,
  parseArchiveSnapshot,
  type ArchiveSnapshot,
  type CreateItemInput,
  type HistoryEntry,
  type Item,
  type Progress,
  type TrackingUnit,
  type UserPreferences,
} from '../domain/archive.js';
import { createHistoryEntry } from '../domain/search.js';
import {
  createArchiveBackup,
  prepareArchiveRestore,
} from './archive-backup.js';

export interface ArchivePersistence {
  load(): Promise<ArchiveSnapshot | null>;
  save(snapshot: ArchiveSnapshot): Promise<void>;
  clear(): Promise<void>;
}

export type ItemUpdate = Partial<
  Pick<
    Item,
    | 'category'
    | 'description'
    | 'externalIds'
    | 'imageUrl'
    | 'notes'
    | 'progress'
    | 'rating'
    | 'status'
    | 'tags'
    | 'title'
    | 'type'
    | 'attributes'
    | 'collections'
  >
>;

const withHistory = (
  archive: ArchiveSnapshot,
  itemId: string,
  action: HistoryEntry['action'],
  summary: string,
  subunitId?: string,
): ArchiveSnapshot => ({
  ...archive,
  history: [
    ...archive.history,
    createHistoryEntry({ itemId, subunitId, action, summary }),
  ],
});

const updateTimestamp = (archive: ArchiveSnapshot): ArchiveSnapshot => ({
  ...archive,
  exportedAt: new Date().toISOString(),
});

const syncCollectionReferences = (
  archive: ArchiveSnapshot,
  nextItem: Item,
): ArchiveSnapshot => {
  const now = new Date().toISOString();
  const collectionIds = new Set(nextItem.collections);
  const knownIds = new Set(
    archive.collections.map((collection) => collection.id),
  );
  const existing = archive.collections.map((collection) => {
    const hadItem = collection.itemIds.includes(nextItem.id);
    const shouldContainItem = collectionIds.has(collection.id);
    if (hadItem === shouldContainItem) return collection;

    return {
      ...collection,
      itemIds: shouldContainItem
        ? [...collection.itemIds, nextItem.id]
        : collection.itemIds.filter((id) => id !== nextItem.id),
      updatedAt: now,
    };
  });
  const missing = nextItem.collections
    .filter((id) => !knownIds.has(id))
    .map((id) => ({
      id,
      name: id,
      itemIds: [nextItem.id],
      createdAt: now,
      updatedAt: now,
    }));

  return { ...archive, collections: [...existing, ...missing] };
};

/** Coordinates archive use cases without exposing storage details to the UI. */
export class ArchiveApplication {
  constructor(private readonly persistence: ArchivePersistence) {}

  async load(): Promise<ArchiveSnapshot> {
    return (await this.persistence.load()) ?? createEmptyArchive();
  }

  exportBackup(archive: ArchiveSnapshot): string {
    return createArchiveBackup(archive);
  }

  prepareRestore(backup: string): ArchiveSnapshot {
    return prepareArchiveRestore(backup);
  }

  async restoreBackup(backup: ArchiveSnapshot): Promise<ArchiveSnapshot> {
    const normalized = parseArchiveSnapshot(backup);
    await this.persistence.save(normalized);
    return normalized;
  }

  async createItem(
    archive: ArchiveSnapshot,
    input: CreateItemInput,
  ): Promise<ArchiveSnapshot> {
    const item = normalizeItemTracking(createItem(input));
    const next = withHistory(
      syncCollectionReferences(
        { ...archive, items: [...archive.items, item] },
        item,
      ),
      item.id,
      'created',
      `Added ${item.title}`,
    );

    return this.persist(next);
  }

  async updateItem(
    archive: ArchiveSnapshot,
    itemId: string,
    update: ItemUpdate,
  ): Promise<ArchiveSnapshot> {
    const current = archive.items.find((item) => item.id === itemId);
    if (!current) {
      throw new Error(`Cannot update missing item: ${itemId}`);
    }

    const updated = normalizeItemTracking(
      createItem({
        ...current,
        ...update,
        id: current.id,
        createdAt: current.createdAt,
        updatedAt: new Date().toISOString(),
      }),
    );
    const action =
      updated.status === 'completed' && current.status !== 'completed'
        ? 'completed'
        : 'updated';
    const next = withHistory(
      syncCollectionReferences(
        {
          ...archive,
          items: archive.items.map((item) =>
            item.id === itemId ? updated : item,
          ),
        },
        updated,
      ),
      itemId,
      action,
      action === 'completed'
        ? `Completed ${updated.title}`
        : `Updated ${updated.title}`,
    );

    return this.persist(next);
  }

  async updateProgress(
    archive: ArchiveSnapshot,
    itemId: string,
    progress: Progress,
  ): Promise<ArchiveSnapshot> {
    return this.updateItem(archive, itemId, { progress });
  }

  /** Records a watch event for one leaf sub-unit and derives the parent state. */
  async watchSubunit(
    archive: ArchiveSnapshot,
    itemId: string,
    subunitId: string,
  ): Promise<ArchiveSnapshot> {
    const current = archive.items.find((item) => item.id === itemId);
    if (!current) {
      throw new Error(`Cannot watch a sub-unit of missing item: ${itemId}`);
    }

    const leaf = getLeafTrackingUnits(current.subunits).find(
      (unit) => unit.id === subunitId,
    );
    if (!leaf) {
      throw new Error(
        `Cannot watch missing or container sub-unit: ${subunitId}`,
      );
    }

    const watched: TrackingUnit = {
      ...leaf,
      completed: true,
      watchCount: leaf.watchCount + 1,
    };
    const updated = normalizeItemTracking(
      createItem({
        ...current,
        subunits: current.subunits.map((unit) =>
          unit.id === subunitId ? watched : unit,
        ),
        updatedAt: new Date().toISOString(),
      }),
    );
    const action = leaf.watchCount === 0 ? 'watched' : 'rewatched';
    let next = {
      ...archive,
      items: archive.items.map((item) => (item.id === itemId ? updated : item)),
    };
    next = withHistory(
      next,
      itemId,
      action,
      `${action === 'watched' ? 'Watched' : 'Rewatched'} ${leaf.title} in ${current.title}`,
      subunitId,
    );
    if (current.status !== 'completed' && updated.status === 'completed') {
      next = withHistory(
        next,
        itemId,
        'completed',
        `Completed ${updated.title}`,
      );
    }

    return this.persist(next);
  }

  /**
   * Starts a new pass through a completed hierarchy. Past watches remain in
   * history and in each leaf's watch count, while current-cycle completion is
   * cleared for every leaf.
   */
  async reopenTrackedItem(
    archive: ArchiveSnapshot,
    itemId: string,
  ): Promise<ArchiveSnapshot> {
    const current = archive.items.find((item) => item.id === itemId);
    if (!current) {
      throw new Error(`Cannot reopen missing item: ${itemId}`);
    }
    if (current.status !== 'completed') {
      throw new Error(`Cannot reopen an item that is not completed: ${itemId}`);
    }

    const leaves = getLeafTrackingUnits(current.subunits);
    if (leaves.length === 0) {
      throw new Error(
        `Cannot reopen an item without tracked sub-units: ${itemId}`,
      );
    }

    const leafIds = new Set(leaves.map((unit) => unit.id));
    const updated = normalizeItemTracking(
      createItem({
        ...current,
        subunits: current.subunits.map((unit) =>
          leafIds.has(unit.id) ? { ...unit, completed: false } : unit,
        ),
        updatedAt: new Date().toISOString(),
      }),
    );
    const next = withHistory(
      {
        ...archive,
        items: archive.items.map((item) =>
          item.id === itemId ? updated : item,
        ),
      },
      itemId,
      'reopened',
      `Reopened ${updated.title}`,
    );

    return this.persist(next);
  }

  async updatePreferences(
    archive: ArchiveSnapshot,
    preferences: UserPreferences,
  ): Promise<ArchiveSnapshot> {
    return this.persist({ ...archive, preferences });
  }

  async deleteItem(
    archive: ArchiveSnapshot,
    itemId: string,
  ): Promise<ArchiveSnapshot> {
    const item = archive.items.find((entry) => entry.id === itemId);
    if (!item) {
      throw new Error(`Cannot delete missing item: ${itemId}`);
    }

    const now = new Date().toISOString();
    const next = withHistory(
      {
        ...archive,
        items: archive.items.filter((entry) => entry.id !== itemId),
        collections: archive.collections.map((collection) => {
          if (!collection.itemIds.includes(itemId)) return collection;

          return {
            ...collection,
            itemIds: collection.itemIds.filter((id) => id !== itemId),
            updatedAt: now,
          };
        }),
      },
      itemId,
      'deleted',
      `Deleted ${item.title}`,
    );

    return this.persist(next);
  }

  private async persist(archive: ArchiveSnapshot): Promise<ArchiveSnapshot> {
    const normalized = parseArchiveSnapshot(updateTimestamp(archive));
    await this.persistence.save(normalized);
    return normalized;
  }
}
