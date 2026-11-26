import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { z } from 'zod';
import { parseCatalog } from '../src/catalog/catalog-schema.ts';

const nonEmpty = z.string().trim().min(1);
const namespace = z.string().regex(/^[a-z][a-z0-9-]*$/);
const SourceSchema = z
  .object({
    format: z.literal('curated-rows-v1'),
    path: nonEmpty,
    source: nonEmpty,
    license: nonEmpty,
    importedAt: z.string().datetime(),
  })
  .strict();
const ManifestSchema = z
  .object({
    catalogs: z.array(
      z
        .object({
          category: namespace,
          seed: nonEmpty,
          generatedAt: z.string().datetime().optional(),
          sources: z.array(SourceSchema).default([]),
        })
        .strict(),
    ),
  })
  .strict();
const RowSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
    title: nonEmpty,
    category: nonEmpty,
    year: z.number().int().min(1888).max(3000).optional(),
    genres: z.array(nonEmpty).default([]),
    aliases: z.array(nonEmpty).default([]),
    attributes: z.record(z.string(), z.string()).default({}),
  })
  .strict();

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    throw new Error(`${path}: ${error.message}`);
  }
}

function validate(schema, data, label) {
  const result = schema.safeParse(data);
  if (!result.success) {
    const issue = result.error.issues[0];
    throw new Error(`${label}: ${issue.path.join('.')}: ${issue.message}`);
  }
  return result.data;
}

function readCatalog(path) {
  const raw = readJson(path);
  try {
    parseCatalog(raw);
  } catch (error) {
    throw new Error(`${path}: ${error.message}`);
  }
  // Preserve the source object, including extension fields and seed order.
  return raw;
}

function assertProtected(previous, next, label) {
  if (previous.category !== next.category) {
    throw new Error(`${label}: namespace cannot change`);
  }
  for (const [index, record] of previous.records.entries()) {
    if (!isDeepStrictEqual(record, next.records[index])) {
      throw new Error(`${label}: protected seed changed: ${record.id}`);
    }
  }
}

export function buildCatalogs(manifestPath, outputDirectory) {
  const manifest = validate(
    ManifestSchema,
    readJson(manifestPath),
    manifestPath,
  );
  const root = dirname(resolve(manifestPath));
  const output = resolve(outputDirectory);
  const namespaces = new Set();
  const ids = new Set();
  const pending = [];

  for (const entry of manifest.catalogs) {
    if (namespaces.has(entry.category)) {
      throw new Error(`Duplicate namespace: ${entry.category}`);
    }
    namespaces.add(entry.category);
    const seed = readCatalog(resolve(root, entry.seed));
    if (seed.category !== entry.category) {
      throw new Error(`${entry.seed}: unexpected namespace`);
    }
    const records = [...seed.records];
    const seedIds = new Set(records.map((record) => record.id));

    if (entry.sources.length > 0 && !entry.generatedAt) {
      throw new Error(`${entry.category}: generatedAt required for refresh`);
    }
    for (const source of entry.sources) {
      const path = resolve(root, source.path);
      const rows = validate(z.array(RowSchema), readJson(path), path);
      for (const [index, row] of rows.entries()) {
        if (seedIds.has(row.id)) {
          throw new Error(`${path}: row ${index + 1}: duplicate ID ${row.id}`);
        }
        seedIds.add(row.id);
        const { aliases, ...metadata } = row;
        records.push({
          ...metadata,
          attributes: {
            ...metadata.attributes,
            ...(aliases.length ? { aliases: aliases.join(' | ') } : {}),
          },
          provenance: {
            source: source.source,
            license: source.license,
            importedAt: source.importedAt,
          },
        });
      }
    }
    const next = {
      ...seed,
      generatedAt: entry.generatedAt ?? seed.generatedAt,
      records,
    };
    parseCatalog(next);
    for (const record of records) {
      if (ids.has(record.id)) {
        throw new Error(`Duplicate ID across namespaces: ${record.id}`);
      }
      ids.add(record.id);
    }
    const target = join(output, `${entry.category}.json`);
    if (existsSync(target)) {
      assertProtected(readCatalog(target), next, target);
    }
    pending.push({ target, content: JSON.stringify(next, null, 2) + '\n' });
  }

  // Validate the complete batch before writing any catalog.
  mkdirSync(output, { recursive: true });
  for (const { target, content } of pending) {
    writeFileSync(target, content, 'utf8');
  }
  return pending.length;
}

const [manifestPath, outputDirectory] = process.argv.slice(2);
if (!manifestPath || !outputDirectory) {
  console.error('Usage: npm run catalog:generate -- <manifest> <output>');
  process.exitCode = 1;
} else {
  try {
    const count = buildCatalogs(manifestPath, outputDirectory);
    console.log(`Generated ${count} local catalogs`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
