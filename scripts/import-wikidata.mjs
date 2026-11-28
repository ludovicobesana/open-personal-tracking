import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { z } from 'zod';
import { parseCatalog } from '../src/catalog/catalog-schema.ts';

const categories = {
  film: { category: 'Film', classes: ['Q11424'], date: 'P577' },
  series: { category: 'Series', classes: ['Q5398426'], date: 'P580' },
  books: { category: 'Book', classes: ['Q7725634', 'Q571'], date: 'P577' },
};

const binding = z.object({ value: z.string() });
const Row = z.object({
  item: binding,
  title: binding,
  year: binding.optional(),
  imdb: binding.optional(),
  creator: binding.optional(),
  genre: binding.optional(),
});
const Response = z.object({
  results: z.object({ bindings: z.array(Row) }),
});

function normalize(value) {
  return value
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, '');
}

function imdbId(record) {
  return record.attributes?.imdbUrl?.match(/imdb\.com\/title\/(tt\d+)/)?.[1];
}

function compare(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function appendWikidata(seed, raw, namespace, importedAt) {
  const config = categories[namespace];
  if (!config || seed.category !== namespace) {
    throw new Error('Unexpected catalog namespace');
  }
  parseCatalog(seed);
  z.string().datetime().parse(importedAt);
  const rows = Response.parse(raw).results.bindings;
  const groups = new Map();
  for (const row of rows) {
    const pattern = /^https?:\/\/www\.wikidata\.org\/entity\/(Q[1-9]\d*)$/;
    const qid = row.item.value.match(pattern)?.[1];
    if (!qid || !row.title.value.trim()) {
      throw new Error('Invalid Wikidata entity or title');
    }
    const year = row.year ? Number(row.year.value) : undefined;
    if (
      year !== undefined &&
      (!Number.isInteger(year) || year < 1 || year > 3000)
    ) {
      throw new Error(`Invalid year for ${qid}`);
    }
    const existing = groups.get(qid) ?? {
      titles: new Set(),
      years: new Set(),
      imdb: new Set(),
      creators: new Set(),
      genres: new Set(),
    };
    existing.titles.add(row.title.value.trim());
    if (year !== undefined) existing.years.add(year);
    if (row.imdb && /^tt[0-9]+$/.test(row.imdb.value)) {
      existing.imdb.add(row.imdb.value);
    }
    if (row.creator?.value.trim()) {
      existing.creators.add(row.creator.value.trim());
    }
    if (row.genre?.value.trim()) {
      existing.genres.add(row.genre.value.trim());
    }
    groups.set(qid, existing);
  }
  const ids = new Set(seed.records.map((record) => record.id));
  const knownTitles = new Set(
    seed.records.map((record) => normalize(record.title)),
  );
  const knownImdb = new Set(seed.records.map(imdbId).filter(Boolean));
  const entityIds = seed.records.map((record) => record.attributes?.wikidataId);
  const knownEntities = new Set(entityIds.filter(Boolean));
  const additions = [];
  for (const [qid, group] of [...groups].sort(([a], [b]) => compare(a, b))) {
    const title = [...group.titles].sort(compare)[0];
    const year = [...group.years].sort((a, b) => a - b)[0];
    const imdb = [...group.imdb].sort(compare)[0];
    const id = `wikidata-${namespace}-${qid.toLowerCase()}`;
    if (
      ids.has(id) ||
      knownEntities.has(qid) ||
      knownTitles.has(normalize(title)) ||
      (imdb && knownImdb.has(imdb))
    ) {
      continue;
    }
    const creators = [...group.creators].sort(compare);
    const creatorKey = namespace === 'books' ? 'author' : 'director';
    const attributes = {
      wikidataId: qid,
      wikidataUrl: `https://www.wikidata.org/wiki/${qid}`,
      ...(imdb ? { imdbUrl: `https://www.imdb.com/title/${imdb}/` } : {}),
      ...(creators.length ? { [creatorKey]: creators.join(', ') } : {}),
    };
    additions.push({
      id,
      title,
      category: config.category,
      ...(year !== undefined && year >= 1888 ? { year } : {}),
      genres: [...group.genres].sort(compare),
      provenance: {
        source: `https://www.wikidata.org/wiki/${qid}`,
        license: 'CC0-1.0',
        importedAt,
      },
      attributes,
    });
    ids.add(id);
    knownEntities.add(qid);
    knownTitles.add(normalize(title));
    if (imdb) knownImdb.add(imdb);
  }
  const next = {
    ...seed,
    generatedAt: importedAt,
    records: [...seed.records, ...additions],
  };
  parseCatalog(next);
  return { catalog: next, added: additions.length };
}

const [namespace, inputPath, outputDirectory, importedAt] = process.argv.slice(2);
if (!categories[namespace] || !inputPath || !outputDirectory || !importedAt) {
  console.error(
    'Usage: npm run catalog:wikidata -- <film|series|books> <sparql.json> <new-output-directory> <ISO timestamp>',
  );
  process.exitCode = 1;
} else {
  try {
    const seed = JSON.parse(
      readFileSync(resolve('data/catalog', `${namespace}.json`), 'utf8'),
    );
    const raw = JSON.parse(readFileSync(inputPath, 'utf8'));
    const { catalog, added } = appendWikidata(seed, raw, namespace, importedAt);
    mkdirSync(outputDirectory, { recursive: true });
    writeFileSync(
      join(outputDirectory, `${namespace}.json`),
      JSON.stringify(catalog, null, 2) + '\n',
      { flag: 'wx' },
    );
    console.log(`Added ${added} ${namespace} records to review output`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
