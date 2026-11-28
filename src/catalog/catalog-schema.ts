import { z } from 'zod';

export const CATALOG_SCHEMA_VERSION = 1 as const;

const CatalogProvenanceSchema = z
  .object({
    source: z.string().trim().min(1),
    license: z.string().trim().min(1),
    importedAt: z.string().datetime(),
  })
  .passthrough();

const CatalogAttributesSchema = z
  .record(z.string(), z.string())
  .superRefine((attributes, context) => {
    for (const key of ['imdbUrl', 'fanCommunityUrl', 'merchandiseUrl']) {
      const value = attributes[key];
      if (value === undefined) continue;
      try {
        const url = new URL(value);
        if (url.protocol !== 'https:' && url.protocol !== 'http:') {
          throw new Error('Unsupported protocol');
        }
        if (url.username || url.password) throw new Error('Credentials');
      } catch {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: 'Expected an HTTP(S) URL without credentials',
        });
      }
    }
  });

export const CatalogRecordSchema = z
  .object({
    id: z.string().trim().min(1),
    title: z.string().trim().min(1),
    category: z.string().trim().min(1),
    year: z.number().int().min(1888).max(3000).optional(),
    genres: z.array(z.string().trim().min(1)).default([]),
    provenance: CatalogProvenanceSchema,
    attributes: CatalogAttributesSchema.default({}),
  })
  .passthrough();
export type CatalogRecord = z.infer<typeof CatalogRecordSchema>;

export const CatalogSchema = z
  .object({
    schemaVersion: z.literal(CATALOG_SCHEMA_VERSION),
    category: z.string().trim().min(1),
    generatedAt: z.string().datetime(),
    records: z.array(CatalogRecordSchema),
  })
  .passthrough();
export type Catalog = z.infer<typeof CatalogSchema>;

export class InvalidCatalogError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidCatalogError';
  }
}

export const parseCatalog = (input: unknown): Catalog => {
  const result = CatalogSchema.safeParse(input);
  if (!result.success) {
    const issue = result.error.issues[0];
    const path = issue.path.length > 0 ? issue.path.join('.') : 'catalog';
    throw new InvalidCatalogError(`${path}: ${issue.message}`);
  }

  const ids = new Set<string>();
  for (const record of result.data.records) {
    if (ids.has(record.id)) {
      throw new InvalidCatalogError(
        `records: duplicate catalog record id "${record.id}"`,
      );
    }
    ids.add(record.id);
  }

  return result.data;
};
