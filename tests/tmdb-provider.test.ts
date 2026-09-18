import { describe, expect, it } from 'vitest';

import { createEmptyArchive, createItem } from '../src/domain/archive.js';
import {
  TmdbProvider,
  type TmdbFetch,
} from '../src/providers/tmdb/tmdb-provider.js';

const movieSearchResult = {
  id: 11,
  media_type: 'movie',
  title: 'Star Wars',
  overview: 'A space opera',
  release_date: '1977-05-25',
  poster_path: '/poster.jpg',
  backdrop_path: '/backdrop.jpg',
};

const televisionSearchResult = {
  id: 1399,
  media_type: 'tv',
  name: 'Game of Thrones',
  overview: 'Winter is coming',
  first_air_date: '2011-04-17',
  poster_path: '/television-poster.jpg',
};

const movieDetails = {
  id: 11,
  title: 'Star Wars',
  overview: 'A space opera',
  release_date: '1977-05-25',
  original_title: 'Star Wars',
  original_language: 'en',
  poster_path: '/poster.jpg',
};

const televisionDetails = {
  id: 1399,
  name: 'Game of Thrones',
  overview: 'Winter is coming',
  first_air_date: '2011-04-17',
  original_name: 'Game of Thrones',
  original_language: 'en',
  poster_path: '/television-poster.jpg',
  created_by: [{ name: 'David Benioff' }, { name: 'D. B. Weiss' }],
};

const jsonResponse = (body: unknown, status = 200, headers?: HeadersInit) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });

const providerWithResponses = (
  responses: Array<Response | Error>,
): {
  provider: TmdbProvider;
  requests: Array<{ url: URL; init?: RequestInit }>;
} => {
  const requests: Array<{ url: URL; init?: RequestInit }> = [];
  const fetch: TmdbFetch = async (input, init) => {
    requests.push({ url: new URL(input), init });
    const next = responses.shift();
    if (!next) throw new Error('Unexpected request');
    if (next instanceof Error) throw next;
    return next;
  };

  return {
    provider: new TmdbProvider({ accessToken: 'test-token', fetch }),
    requests,
  };
};

describe('TMDB provider', () => {
  it('searches mixed movie and TV results through the provider-neutral model', async () => {
    const { provider, requests } = providerWithResponses([
      jsonResponse({
        page: 1,
        total_pages: 2,
        results: [
          movieSearchResult,
          televisionSearchResult,
          { id: 1, media_type: 'person' },
        ],
      }),
    ]);

    const response = await provider.search({ text: 'star', limit: 10 });

    expect(response).toMatchObject({
      nextCursor: '2',
      attributions: [
        {
          name: 'TMDB',
          notice:
            'This product uses TMDB and the TMDB APIs but is not endorsed, certified, or otherwise approved by TMDB.',
        },
      ],
      results: [
        {
          reference: { providerId: 'tmdb', externalId: 'movie:11' },
          title: 'Star Wars',
          category: 'Film',
          type: 'film',
          images: [
            {
              kind: 'poster',
              url: 'https://image.tmdb.org/t/p/w500/poster.jpg',
            },
            {
              kind: 'backdrop',
              url: 'https://image.tmdb.org/t/p/w500/backdrop.jpg',
            },
          ],
        },
        {
          reference: { providerId: 'tmdb', externalId: 'tv:1399' },
          title: 'Game of Thrones',
          category: 'Series',
          type: 'series',
        },
      ],
    });
    expect(requests[0]).toMatchObject({
      url: expect.objectContaining({
        pathname: '/3/search/multi',
        search: expect.stringContaining('query=star'),
      }),
      init: expect.objectContaining({
        headers: { Authorization: 'Bearer test-token' },
      }),
    });
  });

  it('filters categories locally and maps opaque cursors to TMDB pages', async () => {
    const { provider, requests } = providerWithResponses([
      jsonResponse({
        page: 2,
        total_pages: 2,
        results: [movieSearchResult, televisionSearchResult],
      }),
    ]);

    const response = await provider.search({
      text: 'star',
      categories: ['Series'],
      cursor: '2',
    });

    expect(response.results).toHaveLength(1);
    expect(response.results[0].reference.externalId).toBe('tv:1399');
    expect(response.nextCursor).toBeUndefined();
    expect(requests[0].url.searchParams.get('page')).toBe('2');
  });

  it('maps matching movie and TV details without TMDB payloads crossing the boundary', async () => {
    const { provider } = providerWithResponses([
      jsonResponse(movieDetails),
      jsonResponse(televisionDetails),
    ]);

    const movie = await provider.getDetails({
      providerId: 'tmdb',
      externalId: 'movie:11',
    });
    const television = await provider.getDetails({
      providerId: 'tmdb',
      externalId: 'tv:1399',
    });

    expect(movie).toMatchObject({
      item: {
        reference: { providerId: 'tmdb', externalId: 'movie:11' },
        category: 'Film',
        type: 'film',
        attributes: { originalTitle: 'Star Wars', originalLanguage: 'en' },
      },
    });
    expect(television).toMatchObject({
      item: {
        reference: { providerId: 'tmdb', externalId: 'tv:1399' },
        category: 'Series',
        type: 'series',
        creators: [
          { name: 'David Benioff', role: 'creator' },
          { name: 'D. B. Weiss', role: 'creator' },
        ],
      },
    });
  });

  it('rejects malformed data and mismatched detail identities safely', async () => {
    const malformedSearch = providerWithResponses([
      jsonResponse({
        page: 1,
        total_pages: 1,
        results: [{ id: '11', media_type: 'movie' }],
      }),
    ]).provider;
    const mismatchedMovie = providerWithResponses([
      jsonResponse({ ...movieDetails, id: 12 }),
    ]).provider;
    const mismatchedMedia = providerWithResponses([
      jsonResponse(movieDetails),
    ]).provider;

    await expect(
      malformedSearch.search({ text: 'star' }),
    ).rejects.toMatchObject({
      kind: 'malformed_response',
      retryable: false,
    });
    await expect(
      mismatchedMovie.getDetails({
        providerId: 'tmdb',
        externalId: 'movie:11',
      }),
    ).rejects.toMatchObject({ kind: 'malformed_response', retryable: false });
    await expect(
      mismatchedMedia.getDetails({ providerId: 'tmdb', externalId: 'tv:1399' }),
    ).rejects.toMatchObject({ kind: 'malformed_response', retryable: false });
  });

  it('does not request unsupported TMDB references', async () => {
    const { provider, requests } = providerWithResponses([]);

    await expect(
      provider.getDetails({ providerId: 'tmdb', externalId: 'person:1' }),
    ).rejects.toMatchObject({ kind: 'not_found', retryable: false });

    expect(requests).toHaveLength(0);
  });

  it('handles absent images and missing configuration safely', async () => {
    const noImageProvider = providerWithResponses([
      jsonResponse({ ...movieDetails, poster_path: null }),
    ]).provider;
    const missingConfiguration = new TmdbProvider({ accessToken: '' });

    const details = await noImageProvider.getDetails({
      providerId: 'tmdb',
      externalId: 'movie:11',
    });

    expect(details.item.images).toEqual([]);
    await expect(
      missingConfiguration.search({ text: 'star' }),
    ).rejects.toMatchObject({
      kind: 'unauthorized',
      retryable: false,
    });
  });

  it('maps HTTP failures, malformed JSON, unavailable transport, and retry-after safely', async () => {
    const unauthorized = providerWithResponses([
      jsonResponse({}, 401),
    ]).provider;
    const missing = providerWithResponses([jsonResponse({}, 404)]).provider;
    const limited = providerWithResponses([
      jsonResponse({}, 429, { 'retry-after': '60' }),
    ]).provider;
    const malformedJson = providerWithResponses([
      new Response('{', {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    ]).provider;
    const unavailable = providerWithResponses([
      new Error('network detail'),
    ]).provider;

    await expect(unauthorized.search({ text: 'star' })).rejects.toMatchObject({
      kind: 'unauthorized',
      retryable: false,
    });
    await expect(
      missing.getDetails({ providerId: 'tmdb', externalId: 'movie:11' }),
    ).rejects.toMatchObject({
      kind: 'not_found',
      retryable: false,
    });
    await expect(limited.search({ text: 'star' })).rejects.toMatchObject({
      kind: 'rate_limited',
      retryable: true,
      retryAfterSeconds: 60,
    });
    await expect(malformedJson.search({ text: 'star' })).rejects.toMatchObject({
      kind: 'malformed_response',
      retryable: false,
    });
    await expect(unavailable.search({ text: 'star' })).rejects.toMatchObject({
      kind: 'unavailable',
      retryable: true,
      message: 'The metadata provider is currently unavailable',
    });
  });

  it('maps timeout and caller cancellation to the existing safe timeout outcome', async () => {
    const waitForAbort: TmdbFetch = async (_input, init) =>
      new Promise<Response>((_resolve, reject) => {
        if (init?.signal?.aborted) {
          reject(new Error('aborted'));
          return;
        }
        init?.signal?.addEventListener('abort', () =>
          reject(new Error('aborted')),
        );
      });
    const timedOut = new TmdbProvider({
      accessToken: 'test-token',
      fetch: waitForAbort,
      timeoutMilliseconds: 1,
    });
    const cancelledController = new AbortController();
    const cancelled = new TmdbProvider({
      accessToken: 'test-token',
      fetch: waitForAbort,
    });

    await expect(timedOut.search({ text: 'star' })).rejects.toMatchObject({
      kind: 'timeout',
      retryable: true,
    });
    const cancellationResult = cancelled.search({
      text: 'star',
      signal: cancelledController.signal,
    });
    cancelledController.abort();
    await expect(cancellationResult).rejects.toMatchObject({
      kind: 'timeout',
      retryable: true,
    });
  });

  it('leaves local archive operations independent from TMDB availability', async () => {
    const { provider } = providerWithResponses([new Error('network detail')]);
    const archive = createEmptyArchive();

    await expect(provider.search({ text: 'star' })).rejects.toMatchObject({
      kind: 'unavailable',
    });
    archive.items.push(
      createItem({
        id: 'local-film',
        title: 'Local film',
        category: 'Film',
        progress: { current: 0, unit: 'minutes' },
      }),
    );

    expect(archive.items[0].title).toBe('Local film');
  });
});
