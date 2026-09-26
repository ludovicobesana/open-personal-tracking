import { describe, expect, it } from 'vitest';

import {
  ArchiveApplication,
  type ArchivePersistence,
} from '../src/application/archive-application.js';
import { ProviderCatalog } from '../src/application/provider-catalog.js';
import { ProviderDiscovery } from '../src/application/provider-discovery.js';
import {
  type ArchiveSnapshot,
  createEmptyArchive,
} from '../src/domain/archive.js';
import {
  type Provider,
  type ProviderDetailsResponse,
} from '../src/providers/metadata-provider.js';

const details: ProviderDetailsResponse = {
  item: {
    reference: { providerId: 'catalog', externalId: 'film-1' },
    title: 'Dune',
    category: 'Film',
    type: 'film',
    description: 'A science-fiction film.',
    creators: [],
    externalIds: [],
    images: [],
    attributions: [{ name: 'Test catalog' }],
    attributes: {},
  },
  attributions: [{ name: 'Test catalog' }],
};

const provider: Provider = {
  id: 'catalog',
  capabilities: new Set(['search', 'details']),
  async search(query) {
    return {
      results: [
        {
          reference: { providerId: 'catalog', externalId: 'film-1' },
          title: query.text,
          category: 'Film',
          type: 'film',
          images: [],
          attributions: [{ name: 'Test catalog' }],
        },
      ],
      nextCursor: query.cursor ? undefined : 'opaque-next-page',
      attributions: [{ name: 'Test catalog' }],
    };
  },
  async getDetails() {
    return details;
  },
};

class MemoryPersistence implements ArchivePersistence {
  snapshot: ArchiveSnapshot = createEmptyArchive();

  async load(): Promise<ArchiveSnapshot> {
    return this.snapshot;
  }

  async save(snapshot: ArchiveSnapshot): Promise<void> {
    this.snapshot = snapshot;
  }

  async clear(): Promise<void> {
    this.snapshot = createEmptyArchive();
  }
}

describe('provider discovery', () => {
  it('uses opaque cursors and rejects a blank query before a provider call', async () => {
    const discovery = new ProviderDiscovery(
      new ProviderCatalog([provider]),
      'catalog',
    );

    const blank = await discovery.search({ text: '  ' });
    const firstPage = await discovery.search({ text: 'Dune' });
    const nextPage = await discovery.search({
      text: 'Dune',
      cursor: 'opaque-next-page',
    });

    expect(blank).toMatchObject({
      ok: false,
      error: { kind: 'invalid_request' },
    });
    expect(firstPage).toMatchObject({
      ok: true,
      value: { nextCursor: 'opaque-next-page' },
    });
    expect(nextPage).toMatchObject({
      ok: true,
      value: { nextCursor: undefined },
    });
  });

  it('reviews provider details before creating a normal local archive item', async () => {
    const persistence = new MemoryPersistence();
    const application = new ArchiveApplication(persistence);
    const discovery = new ProviderDiscovery(
      new ProviderCatalog([provider]),
      'catalog',
    );
    const beforeReview = await application.load();
    const result = await discovery.getDetails(details.item.reference);

    expect(beforeReview.items).toHaveLength(0);
    expect(result).toMatchObject({ ok: true });
    if (!result.ok) throw result.error;

    const review = discovery.review(result.value);
    const afterCreate = await application.createItem(
      beforeReview,
      review.input,
    );

    expect(afterCreate.items).toMatchObject([
      {
        title: 'Dune',
        externalIds: { catalog: 'film-1' },
        attributes: { provider_catalog_attribution: 'Test catalog' },
      },
    ]);
    expect(persistence.snapshot.items).toHaveLength(1);
  });
});
