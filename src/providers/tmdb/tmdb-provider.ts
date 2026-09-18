import { z } from 'zod';

import {
  PROVIDER_SEARCH_MAX_LIMIT,
  ProviderError,
  type MetadataProvider,
  type ProviderAttribution,
  type ProviderCapability,
  type ProviderDetailsResponse,
  type ProviderImageReference,
  type ProviderItemDetails,
  type ProviderItemReference,
  type ProviderRequestOptions,
  type ProviderSearchQuery,
  type ProviderSearchResponse,
} from '../metadata-provider.js';

const TMDB_API_BASE_URL = 'https://api.themoviedb.org/3/';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500/';
const TMDB_DEFAULT_TIMEOUT_MILLISECONDS = 10_000;
const TMDB_MAX_PAGE = 500;

const tmdbAttribution: ProviderAttribution = {
  name: 'TMDB',
  notice:
    'This product uses TMDB and the TMDB APIs but is not endorsed, certified, or otherwise approved by TMDB.',
  url: 'https://www.themoviedb.org',
  licenseUrl: 'https://www.themoviedb.org/api-terms-of-use',
};

const TmdbMovieSummarySchema = z
  .object({
    id: z.number().int().positive(),
    media_type: z.literal('movie'),
    title: z.string().trim().min(1).max(500),
    overview: z.string().max(20_000).nullable().optional(),
    release_date: z.string().max(80).nullable().optional(),
    poster_path: z.string().max(500).nullable().optional(),
    backdrop_path: z.string().max(500).nullable().optional(),
  })
  .passthrough();

const TmdbTelevisionSummarySchema = z
  .object({
    id: z.number().int().positive(),
    media_type: z.literal('tv'),
    name: z.string().trim().min(1).max(500),
    overview: z.string().max(20_000).nullable().optional(),
    first_air_date: z.string().max(80).nullable().optional(),
    poster_path: z.string().max(500).nullable().optional(),
    backdrop_path: z.string().max(500).nullable().optional(),
  })
  .passthrough();

const TmdbSearchEntrySchema = z
  .object({
    id: z.number().int().positive(),
    media_type: z.string(),
  })
  .passthrough();

const TmdbSearchResponseSchema = z
  .object({
    page: z.number().int().positive(),
    total_pages: z.number().int().nonnegative(),
    results: z.array(TmdbSearchEntrySchema),
  })
  .passthrough();

const TmdbMovieDetailsSchema = z
  .object({
    id: z.number().int().positive(),
    title: z.string().trim().min(1).max(500),
    overview: z.string().max(20_000).nullable().optional(),
    release_date: z.string().max(80).nullable().optional(),
    original_title: z.string().trim().min(1).max(500).nullable().optional(),
    original_language: z.string().trim().min(1).max(40).nullable().optional(),
    poster_path: z.string().max(500).nullable().optional(),
    backdrop_path: z.string().max(500).nullable().optional(),
  })
  .passthrough();

const TmdbTelevisionDetailsSchema = z
  .object({
    id: z.number().int().positive(),
    name: z.string().trim().min(1).max(500),
    overview: z.string().max(20_000).nullable().optional(),
    first_air_date: z.string().max(80).nullable().optional(),
    original_name: z.string().trim().min(1).max(500).nullable().optional(),
    original_language: z.string().trim().min(1).max(40).nullable().optional(),
    poster_path: z.string().max(500).nullable().optional(),
    backdrop_path: z.string().max(500).nullable().optional(),
    created_by: z
      .array(
        z
          .object({
            name: z.string().trim().min(1).max(500),
          })
          .passthrough(),
      )
      .optional(),
  })
  .passthrough();

type TmdbMovieSummary = z.infer<typeof TmdbMovieSummarySchema>;
type TmdbTelevisionSummary = z.infer<typeof TmdbTelevisionSummarySchema>;
type TmdbMediaKind = 'movie' | 'tv';

export type TmdbFetch = (
  input: string | URL,
  init?: RequestInit,
) => Promise<Response>;

export interface TmdbProviderOptions {
  accessToken: string;
  fetch?: TmdbFetch;
  language?: string;
  timeoutMilliseconds?: number;
}

const mediaReference = (
  mediaKind: TmdbMediaKind,
  id: number,
): ProviderItemReference => ({
  providerId: 'tmdb',
  externalId: `${mediaKind}:${id}`,
});

const parseReference = (
  reference: ProviderItemReference,
): { mediaKind: TmdbMediaKind; id: number } | null => {
  if (reference.providerId !== 'tmdb') return null;

  const match = /^(movie|tv):([1-9]\d*)$/.exec(reference.externalId);
  if (!match) return null;

  const id = Number(match[2]);
  if (!Number.isSafeInteger(id)) return null;

  return { mediaKind: match[1] as TmdbMediaKind, id };
};

const categoriesInclude = (
  categories: Array<string> | undefined,
  mediaKind: TmdbMediaKind,
): boolean => {
  if (!categories || categories.length === 0) return true;

  const expected = mediaKind === 'movie' ? ['film', 'movie'] : ['series', 'tv'];
  return categories.some((category) =>
    expected.includes(category.trim().toLowerCase()),
  );
};

const imageReferences = (
  imageBaseUrl: URL,
  posterPath: string | null | undefined,
  backdropPath: string | null | undefined,
): Array<ProviderImageReference> => {
  const toImageUrl = (path: string): string | null => {
    if (!/^\/[A-Za-z0-9._/-]+$/.test(path)) return null;
    return new URL(path.slice(1), imageBaseUrl).toString();
  };

  const references: Array<ProviderImageReference> = [];
  if (posterPath) {
    const url = toImageUrl(posterPath);
    if (url) {
      references.push({ kind: 'poster', url, attributions: [tmdbAttribution] });
    }
  }
  if (backdropPath) {
    const url = toImageUrl(backdropPath);
    if (url) {
      references.push({
        kind: 'backdrop',
        url,
        attributions: [tmdbAttribution],
      });
    }
  }

  return references;
};

const responseRetryAfterSeconds = (response: Response): number | undefined => {
  const value = response.headers.get('retry-after');
  if (!value) return undefined;

  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.ceil(seconds);

  const date = Date.parse(value);
  if (Number.isNaN(date)) return undefined;
  return Math.max(0, Math.ceil((date - Date.now()) / 1_000));
};

const providerErrorFromResponse = (
  operation: 'search' | 'details',
  response: Response,
): ProviderError => {
  if (response.status === 401 || response.status === 403) {
    return new ProviderError('tmdb', operation, 'unauthorized', false);
  }
  if (response.status === 404) {
    return new ProviderError('tmdb', operation, 'not_found', false);
  }
  if (response.status === 429) {
    return new ProviderError(
      'tmdb',
      operation,
      'rate_limited',
      true,
      responseRetryAfterSeconds(response),
    );
  }
  if (response.status >= 400 && response.status < 500) {
    return new ProviderError('tmdb', operation, 'invalid_request', false);
  }

  return new ProviderError('tmdb', operation, 'unavailable');
};

/**
 * Optional TMDB adapter. It deliberately owns transport and response details,
 * while exposing only the provider-neutral contract to application code.
 */
export class TmdbProvider implements MetadataProvider {
  readonly id = 'tmdb';
  readonly capabilities: ReadonlySet<ProviderCapability> = new Set([
    'search',
    'details',
    'images',
  ]);

  private readonly fetchImplementation: TmdbFetch;
  private readonly apiBaseUrl: URL;
  private readonly imageBaseUrl: URL;
  private readonly timeoutMilliseconds: number;

  constructor(private readonly options: TmdbProviderOptions) {
    this.fetchImplementation = options.fetch ?? globalThis.fetch;
    this.apiBaseUrl = new URL(TMDB_API_BASE_URL);
    this.imageBaseUrl = new URL(TMDB_IMAGE_BASE_URL);
    this.timeoutMilliseconds =
      options.timeoutMilliseconds ?? TMDB_DEFAULT_TIMEOUT_MILLISECONDS;
  }

  async search(query: ProviderSearchQuery): Promise<ProviderSearchResponse> {
    const page = this.pageFromCursor(query.cursor, 'search');
    const response = await this.requestJson(
      'search',
      'search/multi',
      {
        query: query.text,
        page: String(page),
        include_adult: 'false',
        language: this.options.language,
      },
      query.signal,
    );
    const parsed = TmdbSearchResponseSchema.safeParse(response);
    if (!parsed.success) {
      throw new ProviderError('tmdb', 'search', 'malformed_response', false);
    }

    const results = parsed.data.results.flatMap((entry) => {
      if (entry.media_type === 'movie') {
        const movie = TmdbMovieSummarySchema.safeParse(entry);
        if (!movie.success) {
          throw new ProviderError(
            'tmdb',
            'search',
            'malformed_response',
            false,
          );
        }
        return categoriesInclude(query.categories, 'movie')
          ? [this.movieSearchResult(movie.data)]
          : [];
      }
      if (entry.media_type === 'tv') {
        const television = TmdbTelevisionSummarySchema.safeParse(entry);
        if (!television.success) {
          throw new ProviderError(
            'tmdb',
            'search',
            'malformed_response',
            false,
          );
        }
        return categoriesInclude(query.categories, 'tv')
          ? [this.televisionSearchResult(television.data)]
          : [];
      }
      return [];
    });

    const limit = Math.min(query.limit ?? PROVIDER_SEARCH_MAX_LIMIT, 20);
    return {
      results: results.slice(0, limit),
      nextCursor:
        parsed.data.page < Math.min(parsed.data.total_pages, TMDB_MAX_PAGE)
          ? String(parsed.data.page + 1)
          : undefined,
      attributions: [tmdbAttribution],
    };
  }

  async getDetails(
    reference: ProviderItemReference,
    options?: ProviderRequestOptions,
  ): Promise<ProviderDetailsResponse> {
    const parsedReference = parseReference(reference);
    if (!parsedReference) {
      throw new ProviderError('tmdb', 'details', 'not_found', false);
    }

    const response = await this.requestJson(
      'details',
      `${parsedReference.mediaKind}/${parsedReference.id}`,
      { language: this.options.language },
      options?.signal,
    );
    const item = this.detailsFromResponse(parsedReference, response);

    return { item, attributions: [tmdbAttribution] };
  }

  private movieSearchResult(movie: TmdbMovieSummary) {
    const images = imageReferences(
      this.imageBaseUrl,
      movie.poster_path,
      movie.backdrop_path,
    );
    return {
      reference: mediaReference('movie', movie.id),
      title: movie.title,
      category: 'Film',
      type: 'film',
      description: movie.overview ?? undefined,
      releaseDate: movie.release_date ?? undefined,
      images,
      attributions: [tmdbAttribution],
    };
  }

  private televisionSearchResult(television: TmdbTelevisionSummary) {
    const images = imageReferences(
      this.imageBaseUrl,
      television.poster_path,
      television.backdrop_path,
    );
    return {
      reference: mediaReference('tv', television.id),
      title: television.name,
      category: 'Series',
      type: 'series',
      description: television.overview ?? undefined,
      releaseDate: television.first_air_date ?? undefined,
      images,
      attributions: [tmdbAttribution],
    };
  }

  private detailsFromResponse(
    reference: { mediaKind: TmdbMediaKind; id: number },
    response: unknown,
  ): ProviderItemDetails {
    if (reference.mediaKind === 'movie') {
      const movie = TmdbMovieDetailsSchema.safeParse(response);
      if (!movie.success || movie.data.id !== reference.id) {
        throw new ProviderError('tmdb', 'details', 'malformed_response', false);
      }
      return {
        reference: mediaReference('movie', movie.data.id),
        title: movie.data.title,
        category: 'Film',
        type: 'film',
        description: movie.data.overview ?? undefined,
        releaseDate: movie.data.release_date ?? undefined,
        creators: [],
        externalIds: [],
        images: imageReferences(
          this.imageBaseUrl,
          movie.data.poster_path,
          movie.data.backdrop_path,
        ),
        attributions: [tmdbAttribution],
        attributes: this.attributes(
          movie.data.original_title,
          movie.data.original_language,
        ),
      };
    }

    const television = TmdbTelevisionDetailsSchema.safeParse(response);
    if (!television.success || television.data.id !== reference.id) {
      throw new ProviderError('tmdb', 'details', 'malformed_response', false);
    }
    return {
      reference: mediaReference('tv', television.data.id),
      title: television.data.name,
      category: 'Series',
      type: 'series',
      description: television.data.overview ?? undefined,
      releaseDate: television.data.first_air_date ?? undefined,
      creators: (television.data.created_by ?? []).map((creator) => ({
        name: creator.name,
        role: 'creator',
      })),
      externalIds: [],
      images: imageReferences(
        this.imageBaseUrl,
        television.data.poster_path,
        television.data.backdrop_path,
      ),
      attributions: [tmdbAttribution],
      attributes: this.attributes(
        television.data.original_name,
        television.data.original_language,
      ),
    };
  }

  private attributes(
    originalTitle: string | null | undefined,
    originalLanguage: string | null | undefined,
  ): Record<string, string> {
    return {
      ...(originalTitle ? { originalTitle } : {}),
      ...(originalLanguage ? { originalLanguage } : {}),
    };
  }

  private pageFromCursor(
    cursor: string | undefined,
    operation: 'search' | 'details',
  ): number {
    if (!cursor) return 1;
    if (!/^[1-9]\d*$/.test(cursor)) {
      throw new ProviderError('tmdb', operation, 'invalid_request', false);
    }

    const page = Number(cursor);
    if (!Number.isSafeInteger(page) || page > TMDB_MAX_PAGE) {
      throw new ProviderError('tmdb', operation, 'invalid_request', false);
    }
    return page;
  }

  private async requestJson(
    operation: 'search' | 'details',
    path: string,
    parameters: Record<string, string | undefined>,
    signal: AbortSignal | undefined,
  ): Promise<unknown> {
    if (!this.options.accessToken.trim()) {
      throw new ProviderError('tmdb', operation, 'unauthorized', false);
    }
    if (
      !Number.isFinite(this.timeoutMilliseconds) ||
      this.timeoutMilliseconds <= 0
    ) {
      throw new ProviderError('tmdb', operation, 'invalid_request', false);
    }

    const url = new URL(path, this.apiBaseUrl);
    for (const [key, value] of Object.entries(parameters)) {
      if (value) url.searchParams.set(key, value);
    }

    const controller = new AbortController();
    const abortFromCaller = () => controller.abort();
    signal?.addEventListener('abort', abortFromCaller, { once: true });
    if (signal?.aborted) controller.abort();
    const timeout = setTimeout(
      () => controller.abort(),
      this.timeoutMilliseconds,
    );

    try {
      const response = await this.fetchImplementation(url, {
        headers: { Authorization: `Bearer ${this.options.accessToken}` },
        signal: controller.signal,
      });
      if (!response.ok) throw providerErrorFromResponse(operation, response);

      try {
        return await response.json();
      } catch {
        throw new ProviderError('tmdb', operation, 'malformed_response', false);
      }
    } catch (error) {
      if (error instanceof ProviderError) throw error;
      if (controller.signal.aborted) {
        // RFC 0004 has no separate cancellation outcome; callers receive the
        // existing retryable timeout failure for a cancelled request.
        throw new ProviderError('tmdb', operation, 'timeout');
      }
      throw new ProviderError('tmdb', operation, 'unavailable');
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener('abort', abortFromCaller);
    }
  }
}
