import { describe, expect, it } from 'vitest';

import {
  ProviderCatalog,
  createItemDraftFromProviderDetails,
} from '../src/application/provider-catalog.js';
import { createEmptyArchive, createItem } from '../src/domain/archive.js';
import {
  ProviderError,
  type Provider,
  type ProviderDetailsResponse,
  type ProviderSearchResponse,
} from '../src/providers/metadata-provider.js';

const bookDetails: ProviderDetailsResponse = {
  item: {
    reference: { providerId: 'library', externalId: 'book-1' },
    title: 'A Wizard of Earthsea',
    category: 'Book',
    type: 'book',
    description: 'A fantasy novel',
    releaseDate: '1968-09-01',
    creators: [{ name: 'Ursula K. Le Guin', role: 'author' }],
    externalIds: [{ namespace: 'isbn', value: '9780547773742' }],
    images: [
      {
        kind: 'cover',
        url: 'https://example.test/covers/earthsea.jpg',
        attributions: [
          { name: 'Example Library', url: 'https://example.test' },
        ],
      },
    ],
    attributions: [{ name: 'Example Library', url: 'https://example.test' }],
    attributes: { pages: 205 },
  },
  attributions: [{ name: 'Example Library', url: 'https://example.test' }],
};

const searchableBookProvider: Provider = {
  id: 'library',
  capabilities: new Set(['search', 'details', 'images']),
  async search(query) {
    return {
      results: [
        {
          reference: { providerId: 'library', externalId: 'book-1' },
          title: `Result for ${query.text}`,
          category: 'Book',
          images: [],
          attributions: bookDetails.attributions,
        },
      ],
      attributions: bookDetails.attributions,
    };
  },
  async getDetails() {
    return bookDetails;
  },
};

const detailsOnlyProvider: Provider = {
  id: 'details-only',
  capabilities: new Set(['details']),
  async getDetails() {
    throw new ProviderError(
      'details-only',
      'details',
      'rate_limited',
      true,
      60,
    );
  },
};

const unavailableProvider: Provider = {
  id: 'unavailable',
  capabilities: new Set(['search']),
  async search() {
    throw new Error('adapter transport detail');
  },
};

const malformedProvider: Provider = {
  id: 'malformed',
  capabilities: new Set(['search', 'details']),
  async search() {
    return {
      results: [
        {
          reference: { providerId: 'other-provider', externalId: 'book-1' },
          title: 'Wrong provider',
          category: 'Book',
          images: [],
          attributions: [],
        },
      ],
      attributions: [],
    } satisfies ProviderSearchResponse;
  },
  async getDetails() {
    return {
      ...bookDetails,
      item: {
        ...bookDetails.item,
        reference: { providerId: 'malformed', externalId: 'different-book' },
      },
    };
  },
};

describe('provider catalog', () => {
  it('uses provider capabilities rather than a provider-specific interface', async () => {
    const catalog = new ProviderCatalog([
      searchableBookProvider,
      detailsOnlyProvider,
    ]);

    const search = await catalog.search('library', { text: 'Earthsea' });
    const unsupported = await catalog.search('details-only', {
      text: 'Earthsea',
    });

    expect(search).toMatchObject({
      ok: true,
      value: {
        results: [expect.objectContaining({ title: 'Result for Earthsea' })],
      },
    });
    expect(unsupported).toMatchObject({
      ok: false,
      error: { kind: 'unsupported_operation', retryable: false },
    });
  });

  it('normalizes adapter failures without leaking transport details', async () => {
    const catalog = new ProviderCatalog([
      unavailableProvider,
      detailsOnlyProvider,
    ]);

    const unavailable = await catalog.search('unavailable', {
      text: 'Earthsea',
    });
    const rateLimited = await catalog.getDetails({
      providerId: 'details-only',
      externalId: 'book-1',
    });

    expect(unavailable).toMatchObject({
      ok: false,
      error: {
        kind: 'unavailable',
        retryable: true,
        message: 'The metadata provider is currently unavailable',
      },
    });
    expect(rateLimited).toMatchObject({
      ok: false,
      error: { kind: 'rate_limited', retryable: true, retryAfterSeconds: 60 },
    });
  });

  it('maps provider-neutral details to independent local item input', () => {
    const draft = createItemDraftFromProviderDetails(
      bookDetails.item,
      bookDetails.attributions,
    );
    const localItem = createItem(draft.input);

    expect(draft.attributions).toEqual([
      { name: 'Example Library', url: 'https://example.test' },
    ]);
    expect(localItem).toMatchObject({
      type: 'book',
      category: 'Book',
      title: 'A Wizard of Earthsea',
      externalIds: {
        library: 'book-1',
        'library:isbn': '9780547773742',
      },
      attributes: {
        provider_library_pages: 205,
        provider_library_releaseDate: '1968-09-01',
        provider_library_attribution: 'Example Library | https://example.test',
      },
    });
    expect(draft.imageReference).toMatchObject({
      url: 'https://example.test/covers/earthsea.jpg',
    });
  });

  it('leaves a local archive usable after a provider failure', async () => {
    const catalog = new ProviderCatalog([unavailableProvider]);
    const archive = createEmptyArchive();

    const result = await catalog.search('unavailable', { text: 'Earthsea' });
    archive.items.push(
      createItem({
        id: 'local-earthsea',
        title: 'A Wizard of Earthsea',
        category: 'Book',
        progress: { current: 0, unit: 'pages' },
      }),
    );

    expect(result).toMatchObject({ ok: false });
    expect(archive.items[0].title).toBe('A Wizard of Earthsea');
  });

  it('rejects invalid requests and mismatched provider responses at the boundary', async () => {
    const catalog = new ProviderCatalog([malformedProvider]);

    const invalidQuery = await catalog.search('malformed', { text: '   ' });
    const oversizedQuery = await catalog.search('malformed', {
      text: 'Earthsea',
      limit: 51,
    });
    const mismatchedSearch = await catalog.search('malformed', {
      text: 'Earthsea',
    });
    const mismatchedDetails = await catalog.getDetails({
      providerId: 'malformed',
      externalId: 'book-1',
    });

    expect(invalidQuery).toMatchObject({
      ok: false,
      error: { kind: 'invalid_request', retryable: false },
    });
    expect(oversizedQuery).toMatchObject({
      ok: false,
      error: { kind: 'invalid_request', retryable: false },
    });
    expect(mismatchedSearch).toMatchObject({
      ok: false,
      error: { kind: 'malformed_response', retryable: false },
    });
    expect(mismatchedDetails).toMatchObject({
      ok: false,
      error: { kind: 'malformed_response', retryable: false },
    });
  });

  it('rejects collisions after provider attribute names are normalized', () => {
    expect(() =>
      createItemDraftFromProviderDetails({
        ...bookDetails.item,
        attributes: { source_name: 'one', 'source name': 'two' },
      }),
    ).toThrow('The metadata provider returned an invalid response');
  });
});
