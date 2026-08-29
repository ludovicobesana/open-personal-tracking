import { z } from 'zod';

export const CURRENT_SCHEMA_VERSION = 1 as const;

export const StatusSchema = z.enum(['planned', 'in_progress', 'completed', 'paused', 'dropped']);
export type ItemStatus = z.infer<typeof StatusSchema>;

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
  action: z.enum(['created', 'updated', 'completed', 'deleted', 'imported']),
  timestamp: z.string().datetime(),
  summary: z.string(),
});
export type HistoryEntry = z.infer<typeof HistoryEntrySchema>;

export const ArchiveSnapshotSchema = z.object({
  schemaVersion: z.number().int().nonnegative(),
  exportedAt: z.string().datetime(),
  items: z.array(ItemSchema),
  collections: z.array(CollectionSchema),
  history: z.array(HistoryEntrySchema),
});
export type ArchiveSnapshot = z.infer<typeof ArchiveSnapshotSchema>;

export const LegacyArchiveSchema = z.object({
  schemaVersion: z.number().int().nonnegative().optional(),
  exportedAt: z.string().datetime().optional(),
  items: z.array(z.unknown()).optional(),
  collections: z.array(z.unknown()).optional(),
  history: z.array(z.unknown()).optional(),
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
  attributes?: Record<string, AttributeValue>;
  externalIds?: Record<string, string>;
  imageUrl?: string;
};

export const createEmptyArchive = (): ArchiveSnapshot => ({
  schemaVersion: CURRENT_SCHEMA_VERSION,
  exportedAt: new Date().toISOString(),
  items: [],
  collections: [],
  history: [],
});

export const createItem = (input: CreateItemInput): Item => {
  const parsed = z.object({
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
    attributes: z.record(z.string(), AttributeValueSchema).default({}),
    externalIds: z.record(z.string(), z.string()).default({}),
    imageUrl: z.string().url().optional(),
  }).parse(input);

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
    createdAt: now,
    updatedAt: now,
    attributes: parsed.attributes,
    externalIds: parsed.externalIds,
    imageUrl: parsed.imageUrl,
  };
};

const migrate_v0_to_v1 = (value: unknown): ArchiveSnapshot => {
  const legacy = LegacyArchiveSchema.parse(value);
  const items = Array.isArray(legacy.items) ? legacy.items.map((item) => {
    if (!item || typeof item !== 'object') {
      throw new Error('Legacy item payload is malformed');
    }

    const record = item as Record<string, unknown>;
    return createItem({
      id: typeof record.id === 'string' ? record.id : crypto.randomUUID(),
      type: typeof record.type === 'string' ? record.type : 'generic',
      title: typeof record.title === 'string' ? record.title : 'Untitled item',
      category: typeof record.category === 'string' ? record.category : 'custom',
      description: typeof record.description === 'string' ? record.description : undefined,
      status: typeof record.status === 'string' && StatusSchema.safeParse(record.status).success
        ? (record.status as ItemStatus)
        : 'planned',
      progress: {
        current: typeof record.progress === 'object' && record.progress && 'current' in (record.progress as Record<string, unknown>) && typeof (record.progress as Record<string, unknown>).current === 'number'
          ? Number((record.progress as Record<string, unknown>).current)
          : 0,
        target: typeof record.progress === 'object' && record.progress && 'target' in (record.progress as Record<string, unknown>) && typeof (record.progress as Record<string, unknown>).target === 'number'
          ? Number((record.progress as Record<string, unknown>).target)
          : undefined,
        unit: typeof record.progress === 'object' && record.progress && 'unit' in (record.progress as Record<string, unknown>) && typeof (record.progress as Record<string, unknown>).unit === 'string'
          ? String((record.progress as Record<string, unknown>).unit)
          : 'units',
      },
      rating: typeof record.rating === 'number' ? record.rating : undefined,
      notes: Array.isArray(record.notes) ? record.notes.filter((note): note is string => typeof note === 'string') : [],
      tags: Array.isArray(record.tags) ? record.tags.filter((tag): tag is string => typeof tag === 'string') : [],
      collections: Array.isArray(record.collections) ? record.collections.filter((collection): collection is string => typeof collection === 'string') : [],
      attributes: record.attributes && typeof record.attributes === 'object'
        ? Object.fromEntries(Object.entries(record.attributes as Record<string, unknown>).map(([key, value]) => [key, AttributeValueSchema.parse(value)]))
        : {},
      externalIds: record.externalIds && typeof record.externalIds === 'object'
        ? Object.fromEntries(Object.entries(record.externalIds as Record<string, unknown>).map(([key, value]) => [key, String(value)]))
        : {},
      imageUrl: typeof record.imageUrl === 'string' ? record.imageUrl : undefined,
    });
  }) : [];

  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
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
            name: typeof record.name === 'string' && record.name.trim().length > 0 ? record.name.trim() : 'Unnamed collection',
            description: typeof record.description === 'string' ? record.description : undefined,
            createdAt: typeof record.createdAt === 'string' ? record.createdAt : new Date().toISOString(),
            updatedAt: typeof record.updatedAt === 'string' ? record.updatedAt : new Date().toISOString(),
            itemIds: Array.isArray(record.itemIds) ? record.itemIds.filter((entry): entry is string => typeof entry === 'string') : [],
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
            itemId: typeof record.itemId === 'string' ? record.itemId : 'unknown',
            action: typeof record.action === 'string' && ['created', 'updated', 'completed', 'deleted', 'imported'].includes(record.action)
              ? (record.action as HistoryEntry['action'])
              : 'updated',
            timestamp: typeof record.timestamp === 'string' ? record.timestamp : new Date().toISOString(),
            summary: typeof record.summary === 'string' ? record.summary : '',
          };
        })
      : [],
  };
};

export const migrateArchiveSnapshot = (value: unknown): ArchiveSnapshot => {
  const parsed = ArchiveSnapshotSchema.safeParse(value);
  if (parsed.success) {
    return parsed.data;
  }

  const legacy = LegacyArchiveSchema.safeParse(value);
  if (!legacy.success) {
    throw new Error(`Invalid archive payload: ${JSON.stringify(legacy.error.issues)}`);
  }

  const version = legacy.data.schemaVersion ?? 0;

  if (version === 0) {
    return migrate_v0_to_v1(value);
  }

  return createEmptyArchive();
};

export const parseArchiveSnapshot = (value: unknown): ArchiveSnapshot => {
  const parsed = ArchiveSnapshotSchema.safeParse(value);
  if (!parsed.success) {
    throw new Error(`Invalid archive snapshot: ${JSON.stringify(parsed.error.issues)}`);
  }

  return migrateArchiveSnapshot(parsed.data);
};

export const serializeArchiveSnapshot = (snapshot: ArchiveSnapshot): string =>
  JSON.stringify(snapshot, null, 2);
