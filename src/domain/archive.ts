import { z } from 'zod';

export const CURRENT_SCHEMA_VERSION = 2 as const;

export const StatusSchema = z.enum([
  'planned',
  'in_progress',
  'completed',
  'paused',
  'dropped',
]);
export type ItemStatus = z.infer<typeof StatusSchema>;

export const SupportedLocaleSchema = z.enum(['en', 'it']);
export type SupportedLocale = z.infer<typeof SupportedLocaleSchema>;

export const TrackingActivitySchema = z.enum([
  'movies',
  'series',
  'books',
  'manga',
  'anime',
  'games',
  'music',
  'podcasts',
]);
export type TrackingActivity = z.infer<typeof TrackingActivitySchema>;

export const UserPreferencesSchema = z.object({
  displayName: z.string().trim().max(80).default(''),
  locale: SupportedLocaleSchema.default('en'),
  activities: z.array(TrackingActivitySchema).default([]),
  favoriteGenres: z.array(z.string().trim().min(1).max(48)).max(24).default([]),
  placeholderCovers: z.boolean().default(true),
  onboardingCompleted: z.boolean().default(false),
});
export type UserPreferences = z.infer<typeof UserPreferencesSchema>;

export const AttributeValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
]);
export type AttributeValue = z.infer<typeof AttributeValueSchema>;

export const ProgressSchema = z.object({
  current: z.number().finite(),
  target: z.number().finite().nonnegative().optional(),
  unit: z.string().min(1),
});
export type Progress = z.infer<typeof ProgressSchema>;

export const TrackingUnitKindSchema = z.enum([
  'season',
  'episode',
  'chapter',
  'unit',
]);
export type TrackingUnitKind = z.infer<typeof TrackingUnitKindSchema>;

/**
 * A unit is part of a hierarchy owned by one item. Only leaf units carry
 * completion state; container units (for example, seasons) derive it from
 * their descendants.
 */
export const TrackingUnitSchema = z.object({
  id: z.string().min(1),
  kind: TrackingUnitKindSchema,
  title: z.string().trim().min(1),
  parentId: z.string().min(1).optional(),
  position: z.number().int().nonnegative().optional(),
  completed: z.boolean().default(false),
  watchCount: z.number().int().nonnegative().default(0),
});
export type TrackingUnit = z.infer<typeof TrackingUnitSchema>;

export const ItemSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  title: z.string().min(1),
  category: z.string().min(1),
  description: z.string().optional(),
  status: StatusSchema,
  progress: ProgressSchema,
  rating: z.number().min(0).max(5).optional(),
  notes: z.array(z.string()),
  tags: z.array(z.string()),
  collections: z.array(z.string()),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  attributes: z.record(z.string(), AttributeValueSchema),
  externalIds: z.record(z.string(), z.string()),
  imageUrl: z.string().url().optional(),
  subunits: z.array(TrackingUnitSchema).default([]),
});
export type Item = z.infer<typeof ItemSchema>;

export const CollectionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  itemIds: z.array(z.string()),
});
export type Collection = z.infer<typeof CollectionSchema>;

export const HistoryEntrySchema = z.object({
  id: z.string().min(1),
  itemId: z.string().min(1),
  subunitId: z.string().min(1).optional(),
  action: z.enum([
    'created',
    'updated',
    'completed',
    'deleted',
    'imported',
    'watched',
    'rewatched',
    'reopened',
  ]),
  timestamp: z.string().datetime(),
  summary: z.string(),
});
export type HistoryEntry = z.infer<typeof HistoryEntrySchema>;

const ArchiveSnapshotFieldsSchema = z.object({
  exportedAt: z.string().datetime(),
  items: z.array(ItemSchema),
  collections: z.array(CollectionSchema),
  history: z.array(HistoryEntrySchema),
  preferences: UserPreferencesSchema.default({}),
});

const ArchiveSnapshotV1Schema = ArchiveSnapshotFieldsSchema.extend({
  schemaVersion: z.literal(1),
});
type ArchiveSnapshotV1 = z.infer<typeof ArchiveSnapshotV1Schema>;

export const ArchiveSnapshotSchema = ArchiveSnapshotFieldsSchema.extend({
  schemaVersion: z.literal(CURRENT_SCHEMA_VERSION),
});
export type ArchiveSnapshot = z.infer<typeof ArchiveSnapshotSchema>;

export const LegacyArchiveSchema = z.object({
  schemaVersion: z.number().int().nonnegative().optional(),
  exportedAt: z.string().datetime().optional(),
  items: z.array(z.unknown()).optional(),
  collections: z.array(z.unknown()).optional(),
  history: z.array(z.unknown()).optional(),
  preferences: z.unknown().optional(),
});

export type CreateItemInput = {
  id?: string;
  type?: string;
  title: string;
  category: string;
  description?: string;
  status?: ItemStatus;
  progress: Progress;
  rating?: number;
  notes?: string[];
  tags?: string[];
  collections?: string[];
  createdAt?: string;
  updatedAt?: string;
  attributes?: Record<string, AttributeValue>;
  externalIds?: Record<string, string>;
  imageUrl?: string;
  subunits?: TrackingUnit[];
};

export const createEmptyArchive = (): ArchiveSnapshot => ({
  schemaVersion: CURRENT_SCHEMA_VERSION,
  exportedAt: new Date().toISOString(),
  items: [],
  collections: [],
  history: [],
  preferences: UserPreferencesSchema.parse({}),
});

export const createItem = (input: CreateItemInput): Item => {
  const parsed = z
    .object({
      id: z.string().min(1).default(crypto.randomUUID()),
      type: z.string().min(1).default('generic'),
      title: z.string().min(1),
      category: z.string().min(1),
      description: z.string().optional(),
      status: StatusSchema.default('planned'),
      progress: ProgressSchema,
      rating: z.number().min(0).max(5).optional(),
      notes: z.array(z.string()).default([]),
      tags: z.array(z.string()).default([]),
      collections: z.array(z.string()).default([]),
      createdAt: z.string().datetime().optional(),
      updatedAt: z.string().datetime().optional(),
      attributes: z.record(z.string(), AttributeValueSchema).default({}),
      externalIds: z.record(z.string(), z.string()).default({}),
      imageUrl: z.string().url().optional(),
      subunits: z.array(TrackingUnitSchema).default([]),
    })
    .parse(input);

  const now = new Date().toISOString();

  return {
    id: parsed.id,
    type: parsed.type,
    title: parsed.title.trim(),
    category: parsed.category.trim(),
    description: parsed.description?.trim(),
    status: parsed.status,
    progress: {
      current: parsed.progress.current,
      target: parsed.progress.target,
      unit: parsed.progress.unit.trim(),
    },
    rating: parsed.rating,
    notes: parsed.notes,
    tags: parsed.tags,
    collections: parsed.collections,
    createdAt: parsed.createdAt ?? now,
    updatedAt: parsed.updatedAt ?? now,
    attributes: parsed.attributes,
    externalIds: parsed.externalIds,
    imageUrl: parsed.imageUrl,
    subunits: parsed.subunits,
  };
};

const trackingUnitIds = (units: TrackingUnit[]): Set<string> => {
  const ids = new Set<string>();
  for (const unit of units) {
    if (ids.has(unit.id)) {
      throw new Error(`Tracking units must have unique ids: ${unit.id}`);
    }
    ids.add(unit.id);
  }
  return ids;
};

const assertValidTrackingHierarchy = (units: TrackingUnit[]): void => {
  const ids = trackingUnitIds(units);
  const childrenByParent = new Map<string, TrackingUnit[]>();

  for (const unit of units) {
    if (unit.parentId) {
      if (!ids.has(unit.parentId)) {
        throw new Error(
          `Tracking unit ${unit.id} references a missing parent: ${unit.parentId}`,
        );
      }
      if (unit.parentId === unit.id) {
        throw new Error(`Tracking unit ${unit.id} cannot parent itself`);
      }
      const children = childrenByParent.get(unit.parentId) ?? [];
      children.push(unit);
      childrenByParent.set(unit.parentId, children);
    }
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (unit: TrackingUnit): void => {
    if (visited.has(unit.id)) return;
    if (visiting.has(unit.id)) {
      throw new Error(`Tracking units contain a parent cycle at: ${unit.id}`);
    }

    visiting.add(unit.id);
    if (unit.parentId) {
      const parent = units.find((candidate) => candidate.id === unit.parentId);
      if (parent) visit(parent);
    }
    visiting.delete(unit.id);
    visited.add(unit.id);
  };

  for (const unit of units) visit(unit);

  for (const unit of units) {
    const hasChildren = childrenByParent.has(unit.id);
    if (hasChildren && (unit.completed || unit.watchCount > 0)) {
      throw new Error(
        `Container tracking unit ${unit.id} cannot have completion state`,
      );
    }
    if (unit.completed && unit.watchCount === 0) {
      throw new Error(
        `Completed tracking unit ${unit.id} must have at least one watch`,
      );
    }
  }
};

export const getLeafTrackingUnits = (units: TrackingUnit[]): TrackingUnit[] => {
  assertValidTrackingHierarchy(units);
  const parentIds = new Set(
    units.flatMap((unit) => (unit.parentId ? [unit.parentId] : [])),
  );
  return units.filter((unit) => !parentIds.has(unit.id));
};

/**
 * Computes canonical parent tracking state from its leaf units. Items without
 * sub-units retain their manually managed progress and status.
 */
export const normalizeItemTracking = (item: Item): Item => {
  const leaves = getLeafTrackingUnits(item.subunits);
  if (leaves.length === 0) return item;

  const completedCount = leaves.filter((unit) => unit.completed).length;
  const hasWatchHistory = leaves.some((unit) => unit.watchCount > 0);
  const status: ItemStatus =
    completedCount === leaves.length
      ? 'completed'
      : completedCount > 0 || hasWatchHistory
        ? 'in_progress'
        : 'planned';

  return {
    ...item,
    status,
    progress: {
      current: completedCount,
      target: leaves.length,
      unit: 'subunits',
    },
  };
};

const normalizeArchiveTracking = (
  snapshot: ArchiveSnapshot,
): ArchiveSnapshot => ({
  ...snapshot,
  items: snapshot.items.map(normalizeItemTracking),
});

const migrate_v0_to_v1 = (value: unknown): ArchiveSnapshotV1 => {
  const legacy = LegacyArchiveSchema.parse(value);
  const items = Array.isArray(legacy.items)
    ? legacy.items.map((item) => {
        if (!item || typeof item !== 'object') {
          throw new Error('Legacy item payload is malformed');
        }

        const record = item as Record<string, unknown>;
        return createItem({
          id: typeof record.id === 'string' ? record.id : crypto.randomUUID(),
          type: typeof record.type === 'string' ? record.type : 'generic',
          title:
            typeof record.title === 'string' ? record.title : 'Untitled item',
          category:
            typeof record.category === 'string' ? record.category : 'custom',
          description:
            typeof record.description === 'string'
              ? record.description
              : undefined,
          status:
            typeof record.status === 'string' &&
            StatusSchema.safeParse(record.status).success
              ? (record.status as ItemStatus)
              : 'planned',
          progress: {
            current:
              typeof record.progress === 'object' &&
              record.progress &&
              'current' in (record.progress as Record<string, unknown>) &&
              typeof (record.progress as Record<string, unknown>).current ===
                'number'
                ? Number((record.progress as Record<string, unknown>).current)
                : 0,
            target:
              typeof record.progress === 'object' &&
              record.progress &&
              'target' in (record.progress as Record<string, unknown>) &&
              typeof (record.progress as Record<string, unknown>).target ===
                'number'
                ? Number((record.progress as Record<string, unknown>).target)
                : undefined,
            unit:
              typeof record.progress === 'object' &&
              record.progress &&
              'unit' in (record.progress as Record<string, unknown>) &&
              typeof (record.progress as Record<string, unknown>).unit ===
                'string'
                ? String((record.progress as Record<string, unknown>).unit)
                : 'units',
          },
          rating: typeof record.rating === 'number' ? record.rating : undefined,
          notes: Array.isArray(record.notes)
            ? record.notes.filter(
                (note): note is string => typeof note === 'string',
              )
            : [],
          tags: Array.isArray(record.tags)
            ? record.tags.filter(
                (tag): tag is string => typeof tag === 'string',
              )
            : [],
          collections: Array.isArray(record.collections)
            ? record.collections.filter(
                (collection): collection is string =>
                  typeof collection === 'string',
              )
            : [],
          attributes:
            record.attributes && typeof record.attributes === 'object'
              ? Object.fromEntries(
                  Object.entries(
                    record.attributes as Record<string, unknown>,
                  ).map(([key, value]) => [
                    key,
                    AttributeValueSchema.parse(value),
                  ]),
                )
              : {},
          externalIds:
            record.externalIds && typeof record.externalIds === 'object'
              ? Object.fromEntries(
                  Object.entries(
                    record.externalIds as Record<string, unknown>,
                  ).map(([key, value]) => [key, String(value)]),
                )
              : {},
          imageUrl:
            typeof record.imageUrl === 'string' ? record.imageUrl : undefined,
        });
      })
    : [];

  return {
    schemaVersion: 1,
    exportedAt: legacy.exportedAt ?? new Date().toISOString(),
    items,
    collections: Array.isArray(legacy.collections)
      ? legacy.collections.map((collection) => {
          if (!collection || typeof collection !== 'object') {
            throw new Error('Legacy collection payload is malformed');
          }
          const record = collection as Record<string, unknown>;
          return {
            id: typeof record.id === 'string' ? record.id : crypto.randomUUID(),
            name:
              typeof record.name === 'string' && record.name.trim().length > 0
                ? record.name.trim()
                : 'Unnamed collection',
            description:
              typeof record.description === 'string'
                ? record.description
                : undefined,
            createdAt:
              typeof record.createdAt === 'string'
                ? record.createdAt
                : new Date().toISOString(),
            updatedAt:
              typeof record.updatedAt === 'string'
                ? record.updatedAt
                : new Date().toISOString(),
            itemIds: Array.isArray(record.itemIds)
              ? record.itemIds.filter(
                  (entry): entry is string => typeof entry === 'string',
                )
              : [],
          };
        })
      : [],
    history: Array.isArray(legacy.history)
      ? legacy.history.map((entry) => {
          if (!entry || typeof entry !== 'object') {
            throw new Error('Legacy history payload is malformed');
          }
          const record = entry as Record<string, unknown>;
          return {
            id: typeof record.id === 'string' ? record.id : crypto.randomUUID(),
            itemId:
              typeof record.itemId === 'string' ? record.itemId : 'unknown',
            action:
              typeof record.action === 'string' &&
              [
                'created',
                'updated',
                'completed',
                'deleted',
                'imported',
              ].includes(record.action)
                ? (record.action as HistoryEntry['action'])
                : 'updated',
            timestamp:
              typeof record.timestamp === 'string'
                ? record.timestamp
                : new Date().toISOString(),
            summary: typeof record.summary === 'string' ? record.summary : '',
          };
        })
      : [],
    preferences: UserPreferencesSchema.safeParse(legacy.preferences).success
      ? UserPreferencesSchema.parse(legacy.preferences)
      : UserPreferencesSchema.parse({}),
  };
};

const migrate_v1_to_v2 = (value: unknown): ArchiveSnapshot => {
  const snapshot = ArchiveSnapshotV1Schema.parse(value);

  return {
    ...snapshot,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    items: snapshot.items.map((item) => ({
      ...item,
      subunits: item.subunits,
    })),
  };
};

export const migrateArchiveSnapshot = (value: unknown): ArchiveSnapshot => {
  const legacy = LegacyArchiveSchema.safeParse(value);
  if (!legacy.success) {
    throw new Error(
      `Invalid archive payload: ${JSON.stringify(legacy.error.issues)}`,
    );
  }

  const version = legacy.data.schemaVersion ?? 0;

  if (version === 0) {
    return migrate_v1_to_v2(migrate_v0_to_v1(value));
  }

  if (version === 1) {
    return migrate_v1_to_v2(value);
  }

  if (version === CURRENT_SCHEMA_VERSION) {
    const parsed = ArchiveSnapshotSchema.safeParse(value);
    if (parsed.success) return parsed.data;
    throw new Error('Invalid archive snapshot for the current schema version');
  }

  throw new Error(`Unsupported archive schema version: ${version}`);
};

export const parseArchiveSnapshot = (value: unknown): ArchiveSnapshot => {
  try {
    return normalizeArchiveTracking(migrateArchiveSnapshot(value));
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(
        `Invalid archive snapshot: ${JSON.stringify(error.issues)}`,
      );
    }
    throw error;
  }
};

/** Migrates and validates an imported or stored snapshot without accepting future schemas. */
export const restoreArchiveSnapshot = (value: unknown): ArchiveSnapshot => {
  if (value && typeof value === 'object') {
    const schemaVersion = (value as Record<string, unknown>).schemaVersion;
    if (
      typeof schemaVersion === 'number' &&
      Number.isInteger(schemaVersion) &&
      schemaVersion > CURRENT_SCHEMA_VERSION
    ) {
      throw new Error(`Unsupported archive schema version: ${schemaVersion}`);
    }
  }

  return parseArchiveSnapshot(value);
};

export const serializeArchiveSnapshot = (snapshot: ArchiveSnapshot): string =>
  JSON.stringify(snapshot, null, 2);
